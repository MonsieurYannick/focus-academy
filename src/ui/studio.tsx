import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { Aperture, ArrowDownToLine, ArrowLeft, Camera, Check, Clapperboard, Download, Focus, Gauge, Lightbulb, Pause, Play, Plus, RotateCcw, Save, Settings2, Target, Trash2, Upload, X } from 'lucide-react'
import { calculateExposure, describeExposure, SHUTTER_OPTIONS, type ExposureInput } from '../lib/photography'
import { supabase } from '../lib/supabase'
import { useAuth } from '../state/auth'
import { Notice } from './pages'
import { StudioViewport, type StudioQuality, type StudioTransformMode, type StudioViewMode } from './StudioViewport'
import {
  createCamera,
  createLight,
  DEFAULT_STUDIO_PROJECT,
  isStudioProject,
  STUDIO_EXERCISES,
  STUDIO_STORAGE_KEY,
  type CameraKeyframe,
  type StudioCamera,
  type StudioLight,
  type StudioPose,
  type StudioProject,
  type StudioProp,
  type Vec3,
} from './studio-model'
import { CAMERA_EXERCISES } from '../lib/photography'

interface SavedProject {
  id: string
  savedAt: string
  project: StudioProject
}

const cloneDefault = () => JSON.parse(JSON.stringify(DEFAULT_STUDIO_PROJECT)) as StudioProject
const ISO_VALUES = [100, 200, 400, 800, 1600, 3200, 6400, 12800]
const APERTURE_VALUES = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16]
const VIDEO_FPS = [24, 25, 30, 50, 60]
const SHUTTER_ANGLES = [90, 144, 180, 270, 360]

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function kelvinColor(kelvin: number) {
  const temperature = kelvin / 100
  let red: number
  let green: number
  let blue: number
  if (temperature <= 66) {
    red = 255
    green = 99.4708025861 * Math.log(temperature) - 161.1195681661
    blue = temperature <= 19 ? 0 : 138.5177312231 * Math.log(temperature - 10) - 305.0447927307
  } else {
    red = 329.698727446 * Math.pow(temperature - 60, -0.1332047592)
    green = 288.1221695283 * Math.pow(temperature - 60, -0.0755148492)
    blue = 255
  }
  const channel = (value: number) => Math.round(Math.max(0, Math.min(255, value))).toString(16).padStart(2, '0')
  return `#${channel(red)}${channel(green)}${channel(blue)}`
}

function effectiveInput(project: StudioProject): ExposureInput {
  if (project.mode === 'photo') return { aperture: project.photo.aperture, shutterSeconds: project.photo.shutterSeconds, iso: project.photo.iso }
  const shutterSeconds = project.video.shutterAngle / (360 * project.video.fps)
  return { aperture: project.photo.aperture, shutterSeconds, iso: project.photo.iso / (2 ** project.video.ndStops) }
}

function clamp(value:number,min:number,max:number){return Math.max(min,Math.min(max,value))}

function applyCameraKeyframes(project: StudioProject, cameraId: string, time: number): StudioProject {
  const frames = project.video.keyframes.filter((frame) => frame.cameraId === cameraId).sort((a, b) => a.time - b.time)
  if (!frames.length) return project
  let before = frames[0]
  let after = frames[frames.length - 1]
  for (let index = 0; index < frames.length - 1; index++) {
    if (time >= frames[index].time && time <= frames[index + 1].time) {
      before = frames[index]
      after = frames[index + 1]
      break
    }
  }
  const progress = before.id === after.id ? 0 : Math.max(0, Math.min(1, (time - before.time) / Math.max(0.001, after.time - before.time)))
  const position = before.position.map((value, index) => value + (after.position[index] - value) * progress) as Vec3
  const rotation = before.rotation.map((value, index) => value + (after.rotation[index] - value) * progress) as Vec3
  return {
    ...project,
    cameras: project.cameras.map((camera) => camera.id === cameraId ? { ...camera, position, rotation } : camera),
  }
}

function downloadFile(filename: string, contents: BlobPart, mime: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: mime }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function safeName(name: string) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'focus-studio'
}

function createLightingSvg(project: StudioProject) {
  const width = 720
  const height = 480
  const cx = width / 2
  const cy = height / 2
  const scale = 58
  const sx = (x: number) => cx + x * scale
  const sy = (z: number) => cy + z * scale
  const lights = project.lights.map((light) => `<g transform="translate(${sx(light.position[0])} ${sy(light.position[2])})" opacity="${light.enabled ? 1 : 0.28}"><path d="M0 0 L${-light.position[0] * scale * 0.42} ${-light.position[2] * scale * 0.42}" stroke="${light.color}" stroke-dasharray="6 5"/><rect x="-12" y="-9" width="24" height="18" rx="3" fill="${light.color}" stroke="#273128"/><text x="17" y="4" fill="#343c34" font-size="12">${escapeXml(light.name)}</text></g>`).join('')
  const cameras = project.cameras.map((camera, index) => `<g transform="translate(${sx(camera.position[0])} ${sy(camera.position[2])}) rotate(${Math.round(camera.rotation[1] * 57.3)})"><path d="M0 -13 L11 9 L-11 9 Z" fill="#34473c" stroke="#f9f9f3" stroke-width="2"/><text x="15" y="4" fill="#343c34" font-size="12">${escapeXml(camera.name || `Caméra ${index + 1}`)}</text></g>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#f6f5f1"/><rect x="80" y="45" width="560" height="390" rx="6" fill="#e8eadf" stroke="#aeb49f" stroke-width="2"/><path d="M80 240H640M360 45V435" stroke="#ccd1c2" stroke-dasharray="4 6"/><circle cx="${cx}" cy="${cy}" r="23" fill="#b9c9a2" stroke="#546148" stroke-width="2"/><text x="${cx + 31}" y="${cy + 5}" fill="#344030" font-size="12">SUJET</text>${lights}${cameras}<text x="18" y="26" fill="#58634d" font-family="sans-serif" font-size="12">FOCUS ACADEMY · DIAGRAMME VU DE DESSUS</text></svg>`
}

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]!)
}

export function StudioPage() {
  const { user, profile } = useAuth()
  const [project, setProjectState] = useState<StudioProject>(cloneDefault)
  const projectRef = useRef(project)
  const [selectedId, setSelectedId] = useState('subject-main')
  const [transformMode, setTransformMode] = useState<StudioTransformMode>('translate')
  const [viewMode, setViewMode] = useState<StudioViewMode>('plateau')
  const [quality, setQuality] = useState<StudioQuality>('economy')
  const [shadows, setShadows] = useState(false)
  const [captureCanvas, setCaptureCanvas] = useState<HTMLCanvasElement | null>(null)
  const [dirty, setDirty] = useState(false)
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([])
  const [activeSaveId, setActiveSaveId] = useState('')
  const [projectName, setProjectName] = useState(DEFAULT_STUDIO_PROJECT.name)
  const [saveMessage, setSaveMessage] = useState('')
  const [selectedExercise, setSelectedExercise] = useState(STUDIO_EXERCISES[0].id)
  const [exerciseMessage, setExerciseMessage] = useState('')
  const [exercisePass, setExercisePass] = useState<boolean | null>(null)
  const [exerciseBusy, setExerciseBusy] = useState(false)
  const [timelineTime, setTimelineTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [screenError, setScreenError] = useState('')
  const playbackFrame = useRef<number | null>(null)
  const lastPlaybackRender = useRef(0)

  projectRef.current = project
  const effective = useMemo(() => calculateExposure(effectiveInput(project)), [project])
  const exposureText = `${effective.compensationStops > 0 ? '+' : ''}${effective.compensationStops.toFixed(1)} EV`
  const selectedLight = project.lights.find((light) => light.id === selectedId)
  const selectedCamera = project.cameras.find((camera) => camera.id === selectedId)
  const selectedProp = project.props.find((prop) => prop.id === selectedId)
  const currentExercise = STUDIO_EXERCISES.find((exercise) => exercise.id === selectedExercise) ?? STUDIO_EXERCISES[0]
  const visibleExercises = STUDIO_EXERCISES.filter((exercise) => exercise.mode === project.mode)

  const updateProject = useCallback((change: (current: StudioProject) => StudioProject) => {
    setProjectState((current) => {
      const next = change(current)
      projectRef.current = next
      return next
    })
    setDirty(true)
  }, [])

  useEffect(() => {
    if (!visibleExercises.some((exercise) => exercise.id === selectedExercise) && visibleExercises[0]) {
      setSelectedExercise(visibleExercises[0].id)
      setExercisePass(null)
      setExerciseMessage('')
    }
  }, [visibleExercises, selectedExercise])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STUDIO_STORAGE_KEY)
      if (stored) {
        const parsed: unknown = JSON.parse(stored)
        if (Array.isArray(parsed)) setSavedProjects(parsed.filter((entry): entry is SavedProject => Boolean(entry && typeof entry.id === 'string' && isStudioProject(entry.project))))
      }
    } catch {
      setSaveMessage('Les scènes enregistrées ne sont pas lisibles ; votre espace local reste intact.')
    }
    return () => {
      if (playbackFrame.current !== null) cancelAnimationFrame(playbackFrame.current)
    }
  }, [])

  const onTransform = useCallback((id: string, position: Vec3, rotation: Vec3) => {
    updateProject((current) => ({
      ...current,
      lights: current.lights.map((light) => light.id === id ? { ...light, position, rotation } : light),
      cameras: current.cameras.map((camera) => camera.id === id ? { ...camera, position, rotation } : camera),
      props: current.props.map((prop) => prop.id === id ? { ...prop, position, rotation } : prop),
      subjectPosition: id === 'subject-main' ? position : current.subjectPosition,
      subjectRotation: id === 'subject-main' ? rotation : current.subjectRotation,
    }))
  }, [updateProject])

  function addLight() {
    const light = createLight(project.lights.length)
    updateProject((current) => ({ ...current, lights: [...current.lights, light] }))
    setSelectedId(light.id)
  }

  function removeSelectedLight() {
    if (!selectedLight || project.lights.length <= 1) return
    updateProject((current) => ({ ...current, lights: current.lights.filter((light) => light.id !== selectedLight.id) }))
    setSelectedId('subject-main')
  }

  function addCamera() {
    const camera = createCamera(project.cameras.length)
    updateProject((current) => ({ ...current, cameras: [...current.cameras, camera], selectedCameraId: camera.id }))
    setSelectedId(camera.id)
  }

  function removeSelectedCamera() {
    if (!selectedCamera || project.cameras.length <= 1) return
    const nextCamera = project.cameras.find((camera) => camera.id !== selectedCamera.id)!
    updateProject((current) => ({ ...current, cameras: current.cameras.filter((camera) => camera.id !== selectedCamera.id), selectedCameraId: nextCamera.id, video: { ...current.video, keyframes: current.video.keyframes.filter((frame) => frame.cameraId !== selectedCamera.id) } }))
    setSelectedId(nextCamera.id)
  }

  function addProp(kind: StudioProp['kind']) {
    const names: Record<StudioProp['kind'], string> = { stool: 'Tabouret', cube: 'Cube', plant: 'Plante', reflector: 'Réflecteur' }
    const prop: StudioProp = { id: `prop-${crypto.randomUUID()}`, kind, name: names[kind], position: [project.props.length % 2 ? 1.4 : -1.4, 0, -0.5], rotation: [0, 0, 0], scale: [1, 1, 1] }
    updateProject((current) => ({ ...current, props: [...current.props, prop] }))
    setSelectedId(prop.id)
  }

  function updateCamera(id: string, changes: Partial<StudioCamera>) {
    updateProject((current) => ({ ...current, cameras: current.cameras.map((camera) => camera.id === id ? { ...camera, ...changes } : camera) }))
  }

  function setPhoto<K extends keyof StudioProject['photo']>(key: K, value: StudioProject['photo'][K]) {
    updateProject((current) => ({ ...current, photo: { ...current.photo, [key]: value } }))
  }

  function setVideo<K extends keyof StudioProject['video']>(key: K, value: StudioProject['video'][K]) {
    updateProject((current) => ({ ...current, video: { ...current.video, [key]: value } }))
  }

  function saveProject() {
    const name = projectName.trim().slice(0, 120)
    if (!name) { setSaveMessage('Donnez un nom à votre scène avant de l’enregistrer.'); return }
    const id = activeSaveId || crypto.randomUUID()
    const saved: SavedProject = { id, savedAt: new Date().toISOString(), project: { ...deepClone(project), name } }
    const next = [saved, ...savedProjects.filter((item) => item.id !== id)]
    try {
      localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify(next))
      setSavedProjects(next)
      setActiveSaveId(id)
      setProjectState(saved.project)
      projectRef.current = saved.project
      setProjectName(name)
      setDirty(false)
      setSaveMessage('Projet enregistré sur cet appareil uniquement. Aucune synchronisation distante n’est active.')
    } catch {
      setSaveMessage('Enregistrement local impossible (quota navigateur atteint ou stockage désactivé).')
    }
  }

  function loadProject(id: string) {
    const saved = savedProjects.find((item) => item.id === id)
    if (!saved) return
    const next = deepClone(saved.project)
    setProjectState(next); projectRef.current = next; setProjectName(next.name); setActiveSaveId(saved.id); setDirty(false); setSaveMessage('Projet chargé depuis le stockage local.')
    setSelectedId(next.selectedCameraId)
    setTimelineTime(0)
  }

  function deleteProject() {
    if (!activeSaveId) return
    const next = savedProjects.filter((item) => item.id !== activeSaveId)
    try {
      localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify(next))
      setSavedProjects(next); setActiveSaveId(''); setSaveMessage('Projet local supprimé.')
    } catch {
      setSaveMessage('Suppression locale impossible.')
    }
  }

  function exportProject() {
    downloadFile(`${safeName(projectName)}.json`, JSON.stringify(project, null, 2), 'application/json')
  }

  async function importProject(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > 2_000_000) { setSaveMessage('Le fichier de projet dépasse 2 Mo.'); return }
    try {
      const candidate: unknown = JSON.parse(await file.text())
      if (!isStudioProject(candidate)) throw new Error('Le fichier ne contient pas un projet FOCUS Studio valide.')
      const next = deepClone(candidate)
      setProjectState(next); projectRef.current = next; setProjectName(next.name); setActiveSaveId(''); setDirty(true); setSaveMessage('Projet importé en mémoire. Enregistrez-le localement pour le conserver.')
      setSelectedId(next.selectedCameraId)
    } catch (importError) {
      setSaveMessage(importError instanceof Error ? importError.message : 'Fichier de projet illisible.')
    }
  }

  function capturePreview() {
    if (!captureCanvas) { setScreenError('La prévisualisation WebGL n’est pas disponible dans ce navigateur.'); return }
    captureCanvas.toBlob((blob) => {
      if (!blob) { setScreenError('Le navigateur n’a pas pu capturer la prévisualisation 3D.'); return }
      downloadFile(`${safeName(projectName)}-preview.png`, blob, 'image/png')
      setScreenError('')
    }, 'image/png')
  }

  function exportLightingDiagram() {
    downloadFile(`${safeName(projectName)}-eclairage.svg`, createLightingSvg(project), 'image/svg+xml')
  }

  async function runExercise() {
    const passed = currentExercise.check(project)
    setExercisePass(passed)
    if (!passed) { setExerciseMessage(`Pas encore. ${currentExercise.goal}`); return }
    setExerciseBusy(true)
    const serverKey = CAMERA_EXERCISES.find((exercise: (typeof CAMERA_EXERCISES)[number]) => exercise.id === currentExercise.id)
    if (serverKey && project.mode === 'photo' && user && profile?.role === 'student' && supabase) {
      const { data, error } = await supabase.rpc('record_simulator_attempt', {
        p_exercise_key: currentExercise.id,
        p_aperture: project.photo.aperture,
        p_shutter_seconds: project.photo.shutterSeconds,
        p_iso: project.photo.iso,
      })
      if (error) setExerciseMessage(`${currentExercise.correction} Enregistrement distant indisponible : ${error.message}`)
      else if (!data) { setExercisePass(false); setExerciseMessage('La base n’a pas validé les réglages.') }
      else setExerciseMessage(`${currentExercise.correction} Réussite validée par la base.`)
    } else {
      setExerciseMessage(`${currentExercise.correction} Résultat affiché localement ; cet exercice n’est pas synchronisé.`)
    }
    setExerciseBusy(false)
  }

  function addKeyframe() {
    const camera = project.cameras.find((item) => item.id === project.selectedCameraId)
    if (!camera) return
    const frame: CameraKeyframe = { id: crypto.randomUUID(), cameraId: camera.id, time: Number(timelineTime.toFixed(2)), position: [...camera.position], rotation: [...camera.rotation] }
    const frames = project.video.keyframes.filter((item) => !(item.cameraId === camera.id && Math.abs(item.time - timelineTime) < 0.08))
    setVideo('keyframes', [...frames, frame].sort((a, b) => a.time - b.time))
  }

  function seekTimeline(time: number) {
    setTimelineTime(time)
    updateProject((current) => applyCameraKeyframes(current, current.selectedCameraId, time))
  }

  function playTimeline() {
    if (playing) {
      setPlaying(false)
      if (playbackFrame.current !== null) cancelAnimationFrame(playbackFrame.current)
      playbackFrame.current = null
      return
    }
    if (project.video.keyframes.filter((frame) => frame.cameraId === project.selectedCameraId).length < 2) {
      setExerciseMessage('Ajoutez au moins deux images clés à la caméra sélectionnée pour lancer l’animation.')
      return
    }
    setProjectModeVideo()
    setPlaying(true)
    const startedAt = performance.now() - timelineTime * 1000
    const animate = (now: number) => {
      const currentTime = Math.min(projectRef.current.video.durationSeconds, (now - startedAt) / 1000)
      setTimelineTime(currentTime)
      if (now - lastPlaybackRender.current > 32) {
        lastPlaybackRender.current = now
        setProjectState((current) => {
          const next = applyCameraKeyframes(current, current.selectedCameraId, currentTime)
          projectRef.current = next
          return next
        })
      }
      if (currentTime >= projectRef.current.video.durationSeconds) {
        setPlaying(false); playbackFrame.current = null; return
      }
      playbackFrame.current = requestAnimationFrame(animate)
    }
    playbackFrame.current = requestAnimationFrame(animate)
  }

  function setProjectModeVideo() {
    if (project.mode !== 'video') setProject((current) => ({ ...current, mode: 'video' }))
  }

  function setProject(change: (current: StudioProject) => StudioProject) {
    setProjectState((current) => {
      const next = change(current)
      projectRef.current = next
      return next
    })
    setDirty(true)
  }

  function resetScene() {
    if (playbackFrame.current !== null) cancelAnimationFrame(playbackFrame.current)
    setPlaying(false)
    const next = cloneDefault()
    setProjectState(next); projectRef.current = next; setProjectName(next.name); setActiveSaveId(''); setDirty(true); setSelectedId('subject-main'); setTimelineTime(0); setSaveMessage('Scène réinitialisée en mémoire. Enregistrez-la si vous souhaitez la garder.')
  }

  const onCanvasReady = useCallback((canvas: HTMLCanvasElement | null) => setCaptureCanvas(canvas), [])

  const exposure = calculateExposure(effectiveInput(project))
  const exerciseOptions = STUDIO_EXERCISES.filter((exercise) => exercise.mode === project.mode)
  const normalizedHistogram = Array.from({ length: 18 }, (_, index) => {
    const center = clamp(8 + exposure.compensationStops * 2.5, 1, 16)
    const width = 2.4 + exposure.noisePercent / 80
    return Math.max(4, Math.exp(-((index - center) ** 2) / (2 * width ** 2)) * 100)
  })
  const clipping = exposure.compensationStops > 1.7 ? 'Surexposition probable' : exposure.compensationStops < -1.7 ? 'Sous-exposition probable' : 'Exposition dans la plage de référence'
  const selectedTitle = selectedLight?.name ?? selectedCamera?.name ?? selectedProp?.name ?? (selectedId === 'subject-main' ? 'Sujet 3D' : selectedId)

  useEffect(() => {
    if (!exerciseOptions.some((exercise) => exercise.id === selectedExercise) && exerciseOptions[0]) {
      setSelectedExercise(exerciseOptions[0].id)
      setExercisePass(null)
      setExerciseMessage('')
    }
  }, [project.mode, selectedExercise])

  function setLightPosition(id: string, axis: number, value: number) {
    setProject((current) => ({ ...current, lights: current.lights.map((light) => {
      if (light.id !== id) return light
      const position = [...light.position] as Vec3; position[axis] = value
      return { ...light, position }
    }) }))
  }

  function setCameraPosition(id: string, axis: number, value: number) {
    setProject((current) => ({ ...current, cameras: current.cameras.map((camera) => {
      if (camera.id !== id) return camera
      const position = [...camera.position] as Vec3; position[axis] = value
      return { ...camera, position }
    }) }))
  }

  function setCameraPositionOrName(id: string, changes: Partial<StudioCamera>) {
    updateCamera(id, changes)
  }

  function setPropPosition(id: string, axis: number, value: number) {
    setProject((current) => ({ ...current, props: current.props.map((prop) => {
      if (prop.id !== id) return prop
      const position = [...prop.position] as Vec3
      position[axis] = value
      return { ...prop, position }
    }) }))
  }

  return <main className="studio-page">
    <div className="studio-heading"><div><Link to="/tableau-de-bord" className="studio-back"><ArrowLeft size={14} /> Mon espace</Link><div className="eyebrow"><Aperture size={15} /> FOCUS LAB · STUDIO 3D</div><h1>Photo + Vidéo Studio</h1><p>Construis ton set, place la lumière et observe comment tes réglages transforment l’image.</p></div><div className="studio-status"><span className={dirty ? 'studio-dirty-dot' : 'studio-clean-dot'} />{dirty ? 'Modifications non enregistrées' : 'Scène prête'}<span className="local-only-chip">LOCAL</span></div></div>

    <div className="studio-toolbar"><div className="studio-mode-switch"><button className={project.mode === 'photo' ? 'active' : ''} onClick={() => setProject((current) => ({ ...current, mode: 'photo' }))}><Camera size={16} /> Photo</button><button className={project.mode === 'video' ? 'active' : ''} onClick={() => setProject((current) => ({ ...current, mode: 'video' }))}><Clapperboard size={16} /> Vidéo / Cinéma</button></div><div className="studio-toolbar-right"><div className="studio-view-switch"><button className={viewMode === 'plateau' ? 'active' : ''} onClick={() => setViewMode('plateau')}>Plateau</button><button className={viewMode === 'camera' ? 'active' : ''} onClick={() => setViewMode('camera')}>Caméra</button></div><label className="quality-select"><Gauge size={14} /><select aria-label="Qualité graphique" value={quality} onChange={(event) => setQuality(event.target.value as StudioQuality)}><option value="economy">Éco GPU</option><option value="balanced">Équilibré</option><option value="high">Haute qualité</option></select></label><label className="shadow-toggle"><input type="checkbox" checked={shadows} onChange={(event) => setShadows(event.target.checked)} disabled={quality !== 'high'} /> Ombres</label></div></div>

    <div className="studio-layout">
      <aside className="studio-equipment-panel"><div className="studio-panel-heading"><div><div className="eyebrow">Plateau</div><h2>Équipement</h2></div><Settings2 size={17} /></div>
        <div className="studio-object-list"><button className={`studio-object-row ${selectedId === 'subject-main' ? 'selected' : ''}`} onClick={() => setSelectedId('subject-main')}><span className="studio-object-icon subject-dot"><span /></span><span><strong>Sujet humain</strong><small>Mannequin procédural</small></span></button>
          {project.cameras.map((camera) => <button key={camera.id} className={`studio-object-row ${selectedId === camera.id ? 'selected' : ''}`} onClick={() => { setProject((current) => ({ ...current, selectedCameraId: camera.id })); setSelectedId(camera.id) }}><span className="studio-object-icon camera-dot"><Camera size={14} /></span><span><strong>{camera.name}</strong><small>Caméra sélectionnable</small></span></button>)}
          {project.lights.map((light) => <button key={light.id} className={`studio-object-row ${selectedId === light.id ? 'selected' : ''}`} onClick={() => setSelectedId(light.id)}><span className={`studio-object-icon light-dot ${light.enabled ? '' : 'disabled'}`} style={{ '--light-color': light.color } as React.CSSProperties}><Lightbulb size={14} /></span><span><strong>{light.name}</strong><small>{light.modifier} · {light.power}%</small></span><span className={light.enabled ? 'tiny-enabled' : 'tiny-disabled'} /></button>)}
          {project.props.map((prop) => <button key={prop.id} className={`studio-object-row ${selectedId === prop.id ? 'selected' : ''}`} onClick={() => setSelectedId(prop.id)}><span className="studio-object-icon prop-dot"><span /></span><span><strong>{prop.name}</strong><small>Accessoire de scène</small></span></button>)}
        </div>
        <div className="studio-library"><span className="eyebrow">Ajouter au set</span><div className="library-buttons"><button onClick={addLight}><Plus size={14} /><Lightbulb size={15} /> Source</button><button onClick={addCamera}><Plus size={14} /><Camera size={15} /> Caméra</button><button onClick={() => addProp('stool')}><Plus size={14} /> Tabouret</button><button onClick={() => addProp('plant')}><Plus size={14} /> Plante</button><button onClick={() => addProp('reflector')}><Plus size={14} /> Réflecteur</button></div></div>
        <div className="studio-transform-controls"><span className="eyebrow">Manipulation 3D</span><div><button className={transformMode === 'translate' ? 'active' : ''} onClick={() => setTransformMode('translate')}>Déplacer</button><button className={transformMode === 'rotate' ? 'active' : ''} onClick={() => setTransformMode('rotate')}>Tourner</button></div></div>
      </aside>

      <section className="studio-stage-column"><div className="studio-stage-bar"><div><span className="stage-online-dot" /> STUDIO A <span className="stage-separator">/</span> {project.mode === 'photo' ? 'PRISE DE VUE' : 'CAMÉRA CINÉMA'}</div><div><button title="Réinitialiser la scène" onClick={resetScene}><RotateCcw size={15} /></button><button title="Télécharger une capture PNG" onClick={capturePreview}><Camera size={15} /></button></div></div>
        <StudioViewport project={project} selectedObjectId={selectedId} transformMode={transformMode} viewMode={viewMode} quality={quality} shadows={shadows} exposureStops={exposure.compensationStops} noiseAmount={exposure.noisePercent / 100 * 0.35} depthBlur={clamp((4.5 / project.photo.aperture - 0.4) * (project.photo.focalLength / 50) * 0.18, 0.01, 0.52)} monochrome={project.photo.monochrome} whiteBalance={project.photo.kelvin} onSelect={setSelectedId} onTransform={onTransform} onCanvasReady={onCanvasReady} />
        <div className="studio-stage-caption"><span>{selectedTitle}</span><span>Scène 3D procédurale · pas de modèle externe</span></div>
        {screenError && <Notice tone="warning">{screenError}</Notice>}
      </section>

      <aside className="studio-inspector"><div className="studio-panel-heading"><div><div className="eyebrow">Contrôle</div><h2>{selectedLight ? 'Éclairage' : selectedCamera ? 'Caméra' : selectedProp ? 'Accessoire' : 'Sujet & scène'}</h2></div><Focus size={17} /></div>
        {selectedLight ? <LightInspector light={selectedLight} onChange={(changes) => setProject((current) => ({ ...current, lights: current.lights.map((item) => item.id === selectedLight.id ? { ...item, ...changes } : item) }))} onRemove={removeSelectedLight} onPosition={(axis, value) => setLightPosition(selectedLight.id, axis, value)} />
          : selectedCamera ? <CameraInspector camera={selectedCamera} project={project} onChange={(changes) => setCameraPositionOrName(selectedCamera.id, changes)} onPosition={(axis, value) => setCameraPosition(selectedCamera.id, axis, value)} onRemove={removeSelectedCamera} onAutoFocus={() => setPhoto('focusDistance', Math.max(0.5, Math.hypot(...selectedCamera.position.map((part, index) => part - [0, 1.5, 0][index]))))} />
          : selectedProp ? <PropInspector prop={selectedProp} onPosition={(axis, value) => setPropPosition(selectedProp.id, axis, value)} onRemove={() => { setProject((current) => ({ ...current, props: current.props.filter((item) => item.id !== selectedProp.id) })); setSelectedId('subject-main') }} />
          : <SubjectInspector project={project} exposure={exposure} onPose={(pose) => setProject((current) => ({ ...current, pose }))} onClothing={(color) => setProject((current) => ({ ...current, clothingColor: color }))} onBackdrop={(color) => setProject((current) => ({ ...current, backdropColor: color }))} />}
      </aside>
    </div>

    <div className="studio-learning-row"><section className="studio-controls-panel"><div className="studio-panel-heading"><div><div className="eyebrow">{project.mode === 'photo' ? 'Exposition & optique' : 'Cinéma & mouvement'}</div><h2>{project.mode === 'photo' ? 'Réglages de prise de vue' : 'Réglages de caméra'}</h2></div><Aperture size={18} /></div>
      <div className="studio-control-grid"><StudioRange label="Ouverture" value={project.photo.aperture} min={0} max={APERTURE_VALUES.length - 1} step={1} display={`f/${project.photo.aperture}`} detail="Ouverture plus grande → zone nette généralement plus courte" onChange={(index) => setPhoto('aperture', APERTURE_VALUES[index])} />
        {project.mode === 'photo' ? <StudioSelect label="Vitesse" value={String(project.photo.shutterSeconds)} options={SHUTTER_OPTIONS.map((item) => [String(item.value), item.label])} detail="Temps de pose" onChange={(value) => setPhoto('shutterSeconds', Number(value))} /> : <StudioSelect label="Fréquence d’images" value={String(project.video.fps)} options={VIDEO_FPS.map((fps) => [String(fps), `${fps} i/s`])} detail="Images capturées par seconde" onChange={(value) => setVideo('fps', Number(value))} />}
        <StudioSelect label="ISO" value={String(project.photo.iso)} options={ISO_VALUES.map((iso) => [String(iso), `ISO ${iso}`])} detail="Sensibilité simulée" onChange={(value) => setPhoto('iso', Number(value))} />
        {project.mode === 'photo' ? <StudioRange label="Vitesse d’obturation" value={Math.max(0, SHUTTER_OPTIONS.findIndex((item) => item.value === project.photo.shutterSeconds))} min={0} max={SHUTTER_OPTIONS.length - 1} step={1} display={SHUTTER_OPTIONS.find((item) => item.value === project.photo.shutterSeconds)?.label ?? '1/125 s'} detail="Une pose lente augmente le risque de flou" onChange={(index) => setPhoto('shutterSeconds', SHUTTER_OPTIONS[index].value)} /> : <StudioSelect label="Angle d’obturation" value={String(project.video.shutterAngle)} options={SHUTTER_ANGLES.map((angle) => [String(angle), `${angle}°`])} detail={`À ${project.video.fps} i/s, 180° ≈ 1/${Math.round(project.video.fps * 2)} s`} onChange={(value) => setVideo('shutterAngle', Number(value))} />}
        <StudioRange label="Focale" value={project.photo.focalLength} min={14} max={200} step={1} display={`${project.photo.focalLength} mm`} detail="Modifie le champ de vision de la caméra" onChange={(value) => setPhoto('focalLength', value)} />
        {project.mode === 'photo' ? <StudioSelect label="Capteur" value={project.photo.sensor} options={[["full-frame", 'Plein format'], ['aps-c', 'APS-C'], ['micro-four-thirds', 'Micro 4/3']]} detail="Influence le cadrage affiché" onChange={(value) => setPhoto('sensor', value as StudioProject['photo']['sensor'])} /> : <StudioSelect label="Filtre ND" value={String(project.video.ndStops)} options={[0, 1, 2, 3, 4, 5, 6].map((stop) => [String(stop), `${stop} stop${stop > 1 ? 's' : ''}`])} detail="Réduit la lumière sans modifier le mouvement" onChange={(value) => setVideo('ndStops', Number(value))} />}
        <StudioRange label="Mise au point" value={project.photo.focusDistance} min={0.5} max={10} step={0.1} display={`${project.photo.focusDistance.toFixed(1)} m`} detail="Distance de mise au point simulée" onChange={(value) => setPhoto('focusDistance', value)} />
        <StudioRange label="Balance des blancs" value={project.photo.kelvin} min={2500} max={10000} step={100} display={`${project.photo.kelvin} K`} detail="Teinte de prévisualisation" onChange={(value) => setPhoto('kelvin', value)} />
        {project.mode === 'video' && <StudioSelect label="Format d’image" value={project.video.aspectRatio} options={[["16:9", '16:9 · horizontal'], ['9:16', '9:16 · vertical'], ['2.39:1', '2.39:1 · cinéma']]} detail="Ratio de cadrage de la caméra preview" onChange={(value) => setVideo('aspectRatio', value as StudioProject['video']['aspectRatio'])} />}
        {project.mode === 'video' && <StudioSelect label="Mouvement" value={project.video.movement} options={[["static", 'Plan fixe'], ['pan', 'Panoramique'], ['tilt', 'Inclinaison'], ['dolly', 'Travelling'], ['orbit', 'Orbite']]} detail="Type de mouvement à storyboarder" onChange={(value) => setVideo('movement', value as StudioProject['video']['movement'])} />}
      </div>
      <div className="studio-meter-row"><div className="studio-meter-copy"><span className={exposure.compensationStops > 1.7 || exposure.compensationStops < -1.7 ? 'meter-warning' : 'meter-good'} />{describeExposure(exposure.compensationStops)} <strong>{exposureText}</strong><small>{clipping} · histogramme estimé</small></div><div className="studio-histogram" aria-label="Histogramme d’exposition estimé">{normalizedHistogram.map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div></div>
      <div className="studio-color-row"><label><input type="checkbox" checked={project.photo.monochrome} onChange={(event) => setPhoto('monochrome', event.target.checked)} /> Noir & blanc</label><div className="studio-readout"><span>BRUIT ISO</span><strong>{Math.round(exposure.noisePercent)}%</strong></div><div className="studio-readout"><span>FLou MOUVEMENT</span><strong>{Math.round(exposure.motionBlurPercent)}%</strong></div></div>
      <p className="studio-model-note">La lumière 3D, l’exposition, le bruit et le flou sont des approximations pédagogiques. Il ne s’agit ni d’un moteur de rendu physique, ni d’une simulation fidèle du capteur ou d’un appareil réel.</p>
    </section>

    <section className="studio-project-panel"><div className="studio-panel-heading"><div><div className="eyebrow">Projets sur cet appareil</div><h2>Storyboard & scènes</h2></div><Save size={17} /></div>
      <label className="studio-input-label">Nom de scène<input maxLength={120} value={projectName} onChange={(event) => setProjectName(event.target.value)} /></label>
      <div className="studio-save-actions"><button className="button button-dark button-small" onClick={saveProject}><Save size={14} /> Enregistrer</button><button className="button button-outline button-small" onClick={exportProject}><Download size={14} /> JSON</button><button className="button button-outline button-small" onClick={exportLightingDiagram}><ArrowDownToLine size={14} /> Plan SVG</button></div>
      <div className="studio-load-row"><select aria-label="Projet local enregistré" value={activeSaveId} onChange={(event) => loadProject(event.target.value)}><option value="">Ouvrir un projet local…</option>{savedProjects.map((item) => <option key={item.id} value={item.id}>{item.project.name}</option>)}</select><button className="icon-button" title="Supprimer ce projet local" onClick={deleteProject} disabled={!activeSaveId}><Trash2 size={15} /></button><label className="icon-button" title="Importer un projet JSON"><Upload size={15} /><input type="file" accept="application/json,.json" onChange={(event) => void importProject(event)} /></label></div>
      {saveMessage && <div className="studio-save-message">{saveMessage}</div>}
      {project.mode === 'video' && <div className="studio-timeline"><div className="studio-timeline-heading"><span><Clapperboard size={14} /> Timeline caméra</span><span>{timelineTime.toFixed(1)} s / {project.video.durationSeconds} s</span></div><div className="timeline-controls"><button className="icon-button" onClick={playTimeline} title={playing ? 'Mettre en pause' : 'Lire l’animation'}>{playing ? <Pause size={15} /> : <Play size={15} />}</button><input aria-label="Position dans la timeline" type="range" min="0" max={project.video.durationSeconds} step="0.1" value={Math.min(timelineTime, project.video.durationSeconds)} onChange={(event) => seekTimeline(Number(event.target.value))} disabled={playing} /><button className="icon-button" onClick={addKeyframe} title="Ajouter une image clé"><Plus size={15} /></button></div><div className="keyframe-strip">{project.video.keyframes.filter((frame) => frame.cameraId === project.selectedCameraId).map((frame) => <button key={frame.id} title={`Image clé à ${frame.time}s`} style={{ left: `${(frame.time / project.video.durationSeconds) * 100}%` }} onClick={() => seekTimeline(frame.time)}><span /></button>)}</div><div className="timeline-foot"><span>{project.video.keyframes.filter((frame) => frame.cameraId === project.selectedCameraId).length} images clés · caméra sélectionnée</span><button onClick={() => setVideo('keyframes', project.video.keyframes.filter((frame) => frame.cameraId !== project.selectedCameraId))}><X size={12} /> Effacer</button></div><Notice tone="warning">La timeline anime une caméra 3D. Elle ne produit pas de fichier vidéo ; l’export vidéo n’est pas activé.</Notice></div>}
      {project.mode === 'photo' && <div className="studio-shot-actions"><button className="button button-outline button-small" onClick={capturePreview}><Camera size={14} /> Capturer PNG</button><span>Capture du rendu WebGL courant</span></div>}
      <div className="studio-save-state"><span className={dirty ? 'studio-dirty-dot' : 'studio-clean-dot'} />{dirty ? 'Scène modifiée' : 'Aucune modification en attente'} · sauvegarde locale explicite</div>
    </section></div>

    <section className="studio-exercise-panel"><div className="studio-exercise-head"><div><div className="eyebrow"><Target size={14} /> Mise en pratique</div><h2>À toi de construire le set.</h2><p>Les corrections se basent sur les réglages et positions de la scène, pas sur une image de référence.</p></div><label>Exercice<select value={selectedExercise} onChange={(event) => { setSelectedExercise(event.target.value); setExercisePass(null); setExerciseMessage('') }}>{exerciseOptions.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.level} · {exercise.title}</option>)}</select></label></div><div className="studio-exercise-content"><div><span className="eyebrow">Objectif</span><p>{currentExercise.goal}</p></div><button className="button button-dark" onClick={() => void runExercise()} disabled={exerciseBusy}>{exerciseBusy ? 'Vérification…' : 'Vérifier le set'} <Check size={15} /></button></div>{exerciseMessage && <Notice tone={exercisePass ? 'success' : 'warning'}>{exerciseMessage}</Notice>}</section>
    <footer className="studio-footer-note"><span>STUDIO 3D PROCÉDURAL</span><span>Modèle humain stylisé généré localement · données des scènes stockées uniquement sur cet appareil tant qu’aucune synchronisation n’est configurée.</span></footer>
  </main>
}

function StudioRange({ label, value, min, max, step, display, detail, onChange }: { label: string; value: number; min: number; max: number; step: number; display: string; detail: string; onChange: (value: number) => void }) {
  return <label className="studio-range-control"><span><strong>{label}</strong><output>{display}</output></span><small>{detail}</small><input type="range" min={min} max={max} step={step} value={value} aria-label={label} onChange={(event) => onChange(Number(event.target.value))} /></label>
}

function StudioSelect({ label, value, options, detail, onChange }: { label: string; value: string; options: string[][]; detail: string; onChange: (value: string) => void }) {
  return <label className="studio-select-control"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select><small>{detail}</small></label>
}

function VectorInputs({ value, onChange, label }: { value: Vec3; onChange: (index: number, value: number) => void; label: string }) {
  return <fieldset className="studio-vector-inputs"><legend>{label} · X / Y / Z</legend>{value.map((part, index) => <label key={index}><span>{['X', 'Y', 'Z'][index]}</span><input type="number" step="0.1" value={Number(part.toFixed(2))} onChange={(event) => onChange(index, Number(event.target.value))} /></label>)}</fieldset>
}

function LightInspector({ light, onChange, onRemove, onPosition }: { light: StudioLight; onChange: (changes: Partial<StudioLight>) => void; onRemove: () => void; onPosition: (axis: number, value: number) => void }) {
  return <div className="studio-inspector-content"><label className="studio-enable-row"><span><Lightbulb size={16} /> Source active</span><input type="checkbox" checked={light.enabled} onChange={(event) => onChange({ enabled: event.target.checked })} /></label><label className="studio-input-label">Nom<input value={light.name} maxLength={50} onChange={(event) => onChange({ name: event.target.value })} /></label><label className="studio-input-label">Modificateur<select value={light.modifier} onChange={(event) => onChange({ modifier: event.target.value as StudioLight['modifier'], size: event.target.value === 'snoot' ? 0.35 : light.size })}>{MODIFIER_OPTIONS.map((modifier) => <option value={modifier.id} key={modifier.id}>{modifier.label}</option>)}</select></label><StudioRange label="Puissance" value={light.power} min={0} max={150} step={1} display={`${light.power}%`} detail="Intensité relative de la source" onChange={(power) => onChange({ power })} /><StudioRange label="Angle du faisceau" value={light.angleDeg} min={8} max={80} step={1} display={`${light.angleDeg}°`} detail="Cône de lumière simulé" onChange={(angleDeg) => onChange({ angleDeg })} /><StudioRange label="Taille / diffusion" value={light.size} min={0.3} max={2} step={0.05} display={`${light.size.toFixed(2)} m`} detail="Modifie la dureté visuelle des ombres (approx.)" onChange={(size) => onChange({ size })} /><StudioRange label="Température" value={light.temperature} min={2500} max={10000} step={100} display={`${light.temperature} K`} detail="Teinte estimée du projecteur" onChange={(temperature) => onChange({ temperature, color: kelvinColor(temperature) })} /><label className="studio-input-label">Gel couleur<input type="color" value={light.color} onChange={(event) => onChange({ color: event.target.value })} /></label><VectorInputs value={light.position} label="Position" onChange={onPosition} /><div className="studio-inspector-actions"><button className="button button-outline button-small" onClick={onRemove} disabled={false}><Trash2 size={14} /> Supprimer la source</button></div><p className="studio-approx-note">Puissance, diffusion et angle sont des paramètres de rendu pédagogique, non des mesures en lux ou en watts.</p></div>
}

const MODIFIER_OPTIONS = [
  { id: 'softbox', label: 'Softbox' }, { id: 'octabox', label: 'Octabox' }, { id: 'stripbox', label: 'Stripbox' },
  { id: 'reflector', label: 'Réflecteur' }, { id: 'beauty-dish', label: 'Beauty dish' }, { id: 'snoot', label: 'Snoot' },
]

function CameraInspector({ camera, project, onChange, onPosition, onRemove, onAutoFocus }: { camera: StudioCamera; project: StudioProject; onChange: (changes: Partial<StudioCamera>) => void; onPosition: (axis: number, value: number) => void; onRemove: () => void; onAutoFocus: () => void }) {
  return <div className="studio-inspector-content"><label className="studio-input-label">Nom de caméra<input value={camera.name} maxLength={60} onChange={(event) => onChange({ name: event.target.value })} /></label><div className="camera-mini-readout"><Camera size={16} /><span>{project.mode === 'photo' ? `${project.photo.focalLength} mm · ${project.photo.sensor}` : `${project.video.aspectRatio} · ${project.video.fps} i/s`}</span></div><VectorInputs value={camera.position} label="Position" onChange={onPosition} /><button className="button button-outline button-small" onClick={onAutoFocus}><Focus size={14} /> AF simulé sur le sujet</button><div className="studio-inspector-actions"><button className="button button-outline button-small" onClick={onRemove} disabled={project.cameras.length <= 1}><Trash2 size={14} /> Supprimer la caméra</button></div><p className="studio-approx-note">Le cadre, la focale et la position pilotent réellement la vue de prévisualisation. Autofocus = distance géométrique estimée vers le mannequin.</p></div>
}

function PropInspector({ prop, onPosition, onRemove }: { prop: StudioProp; onPosition: (axis: number, value: number) => void; onRemove: () => void }) {
  return <div className="studio-inspector-content"><div className="camera-mini-readout"><Settings2 size={16} /><span>{prop.kind.toUpperCase()} · OBJET DE DÉCOR</span></div><VectorInputs value={prop.position} label="Position" onChange={onPosition} /><p className="studio-approx-note">Sélectionnez l’objet sur le plateau et utilisez les poignées 3D pour le déplacer ou le tourner.</p><button className="button button-outline button-small" onClick={onRemove}><Trash2 size={14} /> Supprimer l’accessoire</button></div>
}

function SubjectInspector({ project, exposure, onPose, onClothing, onBackdrop }: { project: StudioProject; exposure: ReturnType<typeof calculateExposure>; onPose: (pose: StudioPose) => void; onClothing: (color: string) => void; onBackdrop: (color: string) => void }) {
  const exposureInput = effectiveInput(project)
  return <div className="studio-inspector-content"><div className="subject-model-card"><div className="subject-model-figure"><span /><i /><b /></div><div><strong>Mannequin procédural</strong><small>Modèle stylisé généré localement · aucune texture distante</small></div></div><label className="studio-input-label">Pose<select value={project.pose} onChange={(event) => onPose(event.target.value as StudioPose)}><option value="standing">Debout · plein pied</option><option value="portrait">Portrait · épaules</option><option value="seated">Assis · tabouret</option><option value="hands-on-hips">Mains sur les hanches</option></select></label><label className="studio-input-label">Vêtement<input type="color" value={project.clothingColor} onChange={(event) => onClothing(event.target.value)} /></label><label className="studio-input-label">Fond cyclorama<input type="color" value={project.backdropColor} onChange={(event) => onBackdrop(event.target.value)} /></label><div className="inspector-facts"><span><small>EXPOSITION</small><strong>{exposure.compensationStops > 0 ? '+' : ''}{exposure.compensationStops.toFixed(1)} EV</strong></span><span><small>FOCALE</small><strong>{project.photo.focalLength} mm</strong></span><span><small>ISO EFFECTIF</small><strong>{Math.round(exposureInput.iso)}</strong></span></div><p className="studio-approx-note">Modèle humain géométrique simplifié ; pas de scan réaliste, morphologie ni simulation d’optique exacte.</p></div>
}

