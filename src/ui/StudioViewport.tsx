import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'
import type { Euler3, StudioCamera, StudioLight, StudioProject, StudioProp, Vec3 } from './studio-model'

export type StudioQuality = 'economy' | 'balanced' | 'high'
export type StudioTransformMode = 'translate' | 'rotate'
export type StudioViewMode = 'plateau' | 'camera'

interface StudioViewportProps {
  project: StudioProject
  selectedObjectId: string
  transformMode: StudioTransformMode
  viewMode: StudioViewMode
  quality: StudioQuality
  shadows: boolean
  exposureStops: number
  noiseAmount: number
  depthBlur: number
  monochrome: boolean
  whiteBalance: number
  onSelect: (id: string) => void
  onTransform: (id: string, position: Vec3, rotation: Euler3) => void
  onCanvasReady: (canvas: HTMLCanvasElement | null) => void
}

interface LightNode {
  group: THREE.Group
  spot: THREE.SpotLight
  aim: THREE.Object3D
  panel: THREE.Mesh
  line: THREE.Line
}

interface CameraNode {
  group: THREE.Group
  camera: THREE.PerspectiveCamera
}

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value))
const tuple = (value: THREE.Vector3): Vec3 => [value.x, value.y, value.z]
const eulerTuple = (value: THREE.Euler): Euler3 => [value.x, value.y, value.z]

function makeMaterial(color: string, roughness = 0.8, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, ...extra })
}

function addBox(parent: THREE.Group, size: Vec3, position: Vec3, material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material)
  mesh.position.set(...position)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

function addCylinder(parent: THREE.Group, top: number, bottom: number, height: number, position: Vec3, material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, 10), material)
  mesh.position.set(...position)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

function addLimb(parent: THREE.Group, id: string, length: number, radius: number, material: THREE.Material, position: Vec3) {
  const pivot = new THREE.Group()
  pivot.name = id
  pivot.position.set(...position)
  const limb = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.8, radius, length, 9), material)
  limb.position.y = -length / 2
  limb.castShadow = true
  limb.receiveShadow = true
  pivot.add(limb)
  const joint = new THREE.Mesh(new THREE.SphereGeometry(radius, 9, 7), material)
  joint.position.y = -length
  joint.castShadow = true
  pivot.add(joint)
  parent.add(pivot)
  return pivot
}

function createMannequin() {
  const root = new THREE.Group()
  root.name = 'Sujet 3D'
  root.userData.studioId = 'subject-main'
  const skin = makeMaterial('#bb9075', 0.85)
  const shirt = makeMaterial('#6f816c', 0.9)
  const trousers = makeMaterial('#343e3b', 0.92)
  const shoes = makeMaterial('#242a28', 0.9)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.145, 18, 14), skin)
  head.position.set(0, 1.68, 0)
  head.scale.set(0.82, 1.08, 0.86)
  head.castShadow = true
  root.add(head)
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.15, 18, 9, 0, Math.PI * 2, 0, Math.PI * 0.52), makeMaterial('#302b28'))
  hair.position.set(0, 1.74, -0.015)
  root.add(hair)
  addCylinder(root, 0.072, 0.078, 0.16, [0, 1.48, 0], skin)
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.235, 0.58, 12), shirt)
  torso.position.set(0, 1.15, 0)
  torso.castShadow = true
  torso.receiveShadow = true
  root.add(torso)
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.39, 0.25, 0.23), trousers)
  pelvis.position.set(0, 0.75, 0)
  pelvis.castShadow = true
  root.add(pelvis)
  const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 9), shirt)
  shoulders.position.set(0, 1.37, 0)
  shoulders.scale.set(1.18, 0.6, 0.72)
  root.add(shoulders)
  const leftArm = addLimb(root, 'arm-left', 0.55, 0.064, shirt, [-0.23, 1.34, 0])
  const rightArm = addLimb(root, 'arm-right', 0.55, 0.064, shirt, [0.23, 1.34, 0])
  const leftForearm = addLimb(root, 'forearm-left', 0.48, 0.052, skin, [-0.32, 0.81, 0])
  const rightForearm = addLimb(root, 'forearm-right', 0.48, 0.052, skin, [0.32, 0.81, 0])
  const leftLeg = addLimb(root, 'leg-left', 0.71, 0.092, trousers, [-0.105, 0.64, 0])
  const rightLeg = addLimb(root, 'leg-right', 0.71, 0.092, trousers, [0.105, 0.64, 0])
  addBox(root, [0.12, 0.08, 0.28], [-0.105, -0.04, 0.04], shoes)
  addBox(root, [0.12, 0.08, 0.28], [0.105, -0.04, 0.04], shoes)
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), skin)
  nose.position.set(0, 1.66, 0.13)
  root.add(nose)
  root.userData.poseParts = { leftArm, rightArm, leftForearm, rightForearm, leftLeg, rightLeg, torso, pelvis }
  return root
}

function makeCyclorama(color: string) {
  const positions: number[] = []
  const indices: number[] = []
  const profile: [number, number][] = [
    [-4.7, 0], [-4.1, 0], [-3.8, 0.05], [-3.55, 0.2], [-3.38, 0.42], [-3.32, 0.68], [-3.32, 4.2],
  ]
  const columns = 18
  for (let row = 0; row < profile.length; row++) {
    const [z, y] = profile[row]
    for (let column = 0; column <= columns; column++) {
      positions.push(-4.8 + (9.6 * column) / columns, y, z)
    }
  }
  const stride = columns + 1
  for (let row = 0; row < profile.length - 1; row++) {
    for (let column = 0; column < columns; column++) {
      const a = row * stride + column
      const b = a + stride
      indices.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return new THREE.Mesh(geometry, makeMaterial(color, 0.92, { side: THREE.DoubleSide }))
}

function createProp(prop: StudioProp) {
  const group = new THREE.Group()
  group.name = prop.name
  group.userData.studioId = prop.id
  const wood = makeMaterial('#806c55')
  const dark = makeMaterial('#424940')
  const leaf = makeMaterial('#667a57')
  if (prop.kind === 'cube') {
    addBox(group, [0.8, 0.76, 0.78], [0, 0.38, 0], makeMaterial('#c4bca9'))
  } else if (prop.kind === 'stool') {
    addCylinder(group, 0.42, 0.42, 0.12, [0, 0.82, 0], wood)
    for (const [x, z] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]] as [number, number][]) {
      addCylinder(group, 0.035, 0.04, 0.8, [x, 0.4, z], dark)
    }
  } else if (prop.kind === 'plant') {
    addCylinder(group, 0.18, 0.2, 0.38, [0, 0.19, 0], wood)
    addCylinder(group, 0.035, 0.04, 0.72, [0, 0.72, 0], dark)
    for (let index = 0; index < 7; index++) {
      const leafMesh = new THREE.Mesh(new THREE.SphereGeometry(0.17, 9, 7), leaf)
      const angle = (index / 7) * Math.PI * 2
      leafMesh.position.set(Math.cos(angle) * 0.17, 0.78 + (index % 3) * 0.16, Math.sin(angle) * 0.17)
      leafMesh.scale.set(0.65, 1.25, 0.55)
      group.add(leafMesh)
    }
  } else {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.2), makeMaterial('#dce1d2', 0.5, { side: THREE.DoubleSide }))
    panel.position.y = 0.62
    group.add(panel)
    addBox(group, [0.06, 1.3, 0.06], [-0.37, 0.65, 0], dark)
    addBox(group, [0.06, 1.3, 0.06], [0.37, 0.65, 0], dark)
  }
  group.position.set(...prop.position)
  group.rotation.set(...prop.rotation)
  group.scale.set(...prop.scale)
  return group
}

function createLightNode(light: StudioLight): LightNode {
  const group = new THREE.Group()
  group.name = light.name
  group.userData.studioId = light.id
  const spot = new THREE.SpotLight(light.color, 2.5, 12, Math.PI / 5, 0.5, 1.5)
  const aim = new THREE.Object3D()
  spot.target = aim
  spot.castShadow = false
  group.add(spot)
  const stand = new THREE.Group()
  stand.name = 'stand'
  const metal = makeMaterial('#566057', 0.38, { metalness: 0.45 })
  addCylinder(stand, 0.022, 0.03, 1, [0, -0.58, 0], metal)
  addCylinder(stand, 0.24, 0.24, 0.06, [0, -1.08, 0], metal)
  const panelMaterial = new THREE.MeshStandardMaterial({ color: light.color, emissive: light.color, emissiveIntensity: 0.55, roughness: 0.55, side: THREE.DoubleSide })
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 0.48), panelMaterial)
  panel.position.set(0, 0.03, -0.06)
  group.add(panel, stand)
  const lineGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()])
  const line = new THREE.Line(lineGeometry, new THREE.LineDashedMaterial({ color: light.color, dashSize: 0.11, gapSize: 0.08, transparent: true, opacity: 0.65 }))
  line.computeLineDistances()
  return { group, spot, aim, panel, line }
}

function createCameraNode(cameraConfig: StudioCamera): CameraNode {
  const group = new THREE.Group()
  group.name = cameraConfig.name
  group.userData.studioId = cameraConfig.id
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.29, 0.24), makeMaterial('#29312d', 0.4, { metalness: 0.45 }))
  body.castShadow = true
  group.add(body)
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.3, 14), makeMaterial('#4b5752', 0.32, { metalness: 0.45 }))
  lens.rotation.x = Math.PI / 2
  lens.position.z = -0.25
  group.add(lens)
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.08, 16), new THREE.MeshBasicMaterial({ color: '#657d86' }))
  glass.position.z = -0.405
  group.add(glass)
  const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 50)
  group.add(camera)
  group.position.set(...cameraConfig.position)
  group.rotation.set(...cameraConfig.rotation)
  return { group, camera }
}

function disposeGroup(group: THREE.Object3D) {
  group.traverse((object: THREE.Object3D) => {
    const mesh = object as THREE.Mesh
    mesh.geometry?.dispose?.()
    if (Array.isArray(mesh.material)) mesh.material.forEach((material) => material.dispose())
    else mesh.material?.dispose?.()
  })
}

export function StudioViewport({ project, selectedObjectId, transformMode, viewMode, quality, shadows, exposureStops, noiseAmount, depthBlur, monochrome, whiteBalance, onSelect, onTransform, onCanvasReady }: StudioViewportProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const projectRef = useRef(project)
  const callbackRef = useRef({ onSelect, onTransform, onCanvasReady })
  const entitiesRef = useRef(new Map<string, THREE.Object3D>())
  const pickablesRef = useRef<THREE.Object3D[]>([])
  const lightNodesRef = useRef(new Map<string, LightNode>())
  const cameraNodesRef = useRef(new Map<string, CameraNode>())
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const orbitRef = useRef<OrbitControls | null>(null)
  const transformRef = useRef<TransformControls | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const mainCameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const targetRef = useRef<THREE.Object3D | null>(null)
  const renderSettingsRef = useRef({ viewMode, exposureStops, quality })
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

  projectRef.current = project
  callbackRef.current = { onSelect, onTransform, onCanvasReady }
  renderSettingsRef.current = { viewMode, exposureStops, quality }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect()
      setCanvasSize({ width: rect.width, height: rect.height })
    })
    observer.observe(canvas)
    const rect = canvas.getBoundingClientRect()
    setCanvasSize({ width: rect.width, height: rect.height })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    callbackRef.current.onCanvasReady(canvas)

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'low-power', preserveDrawingBuffer: true })
    } catch {
      callbackRef.current.onCanvasReady(null)
      return
    }
    rendererRef.current = renderer
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.autoClear = false
    renderer.setClearColor('#252d28', 1)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#303a33')
    sceneRef.current = scene
    const mainCamera = new THREE.PerspectiveCamera(43, 1, 0.1, 80)
    mainCamera.position.set(7, 5.3, 8)
    mainCamera.lookAt(0, 1.15, 0)
    mainCameraRef.current = mainCamera
    const orbit = new OrbitControls(mainCamera, renderer.domElement)
    orbit.target.set(0, 1.05, 0)
    orbit.enableDamping = true
    orbit.dampingFactor = 0.075
    orbit.minDistance = 2.4
    orbit.maxDistance = 18
    orbit.maxPolarAngle = Math.PI * 0.49
    orbitRef.current = orbit

    const hemisphere = new THREE.HemisphereLight('#e4e9dc', '#45443e', 1.25)
    scene.add(hemisphere)
    const ambient = new THREE.AmbientLight('#ffffff', 0.22)
    ambient.name = 'studio-ambient'
    scene.add(ambient)

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), makeMaterial('#555b53', 0.9))
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -0.015
    floor.receiveShadow = true
    floor.name = 'studio-floor'
    scene.add(floor)
    const grid = new THREE.GridHelper(12, 24, '#89937e', '#505b50')
    grid.position.y = 0.005
    grid.name = 'studio-grid'
    scene.add(grid)
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 4.4), makeMaterial('#66745e', 0.88))
    backWall.position.set(0, 2.15, -4.8)
    backWall.name = 'studio-backdrop'
    scene.add(backWall)
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 4.2), makeMaterial('#3d4740', 0.95, { side: THREE.DoubleSide }))
    leftWall.position.set(-4.9, 2, 0)
    leftWall.rotation.y = Math.PI / 2
    leftWall.name = 'studio-left-wall'
    scene.add(leftWall)
    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 4.2), makeMaterial('#3d4740', 0.95, { side: THREE.DoubleSide }))
    rightWall.position.set(4.9, 2, 0)
    rightWall.rotation.y = -Math.PI / 2
    rightWall.name = 'studio-right-wall'
    scene.add(rightWall)
    const cyclorama = makeCyclorama('#66745e')
    cyclorama.name = 'studio-cyclorama'
    scene.add(cyclorama)

    const subject = createMannequin()
    scene.add(subject)
    entitiesRef.current.set('subject-main', subject)
    pickablesRef.current = [subject]
    const target = new THREE.Object3D()
    target.position.set(0, 1.35, 0)
    scene.add(target)
    targetRef.current = target

    const lights = new Map<string, LightNode>()
    const cameras = new Map<string, CameraNode>()
    lightNodesRef.current = lights
    cameraNodesRef.current = cameras

    const transform = new TransformControls(mainCamera, renderer.domElement)
    scene.add(transform.getHelper())
    transformRef.current = transform
    transform.setSize(0.8)
    transform.addEventListener('dragging-changed', (event) => { orbit.enabled = !(event as unknown as {value:boolean}).value })
    transform.addEventListener('mouseUp', () => {
      const attached = transform.object
      const id = attached?.userData.studioId as string | undefined
      if (id && attached) callbackRef.current.onTransform(id, tuple(attached.position), eulerTuple(attached.rotation))
    })

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    const onPointerDown = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const previewWidth = Math.min(360, rect.width * 0.33)
      const mainWidth = rect.width - previewWidth
      const px = event.clientX - rect.left
      if (px >= mainWidth || transform.dragging) return
      pointer.x = (px / mainWidth) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, mainCamera)
      const intersections = raycaster.intersectObjects(pickablesRef.current, true)
      const hit = intersections.find((intersection) => {
        let node: THREE.Object3D | null = intersection.object
        while (node && !node.userData.studioId) node = node.parent
        return Boolean(node?.userData.studioId)
      })
      if (!hit) return
      let node: THREE.Object3D | null = hit.object
      while (node && !node.userData.studioId) node = node.parent
      if (node?.userData.studioId) callbackRef.current.onSelect(node.userData.studioId as string)
    }
    canvas.addEventListener('pointerdown', onPointerDown)

    let frame = 0
    let lastRenderAt = 0
    let disposed = false
    const resizeObserver = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      renderer.setSize(rect.width, rect.height, false)
      mainCamera.aspect = Math.max(0.5, (rect.width * 0.67) / rect.height)
      mainCamera.updateProjectionMatrix()
    })
    resizeObserver.observe(canvas)

    const render = (now: number) => {
      if (disposed) return
      frame = requestAnimationFrame(render)
      const frameInterval = renderSettingsRef.current.quality === 'economy' ? 40 : renderSettingsRef.current.quality === 'balanced' ? 25 : 16
      if (now - lastRenderAt < frameInterval) return
      lastRenderAt = now
      const rect = canvas.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      orbit.update()
      for (const [id, lightNode] of lights) {
        const config = projectRef.current.lights.find((light) => light.id === id)
        if (config) {
          lightNode.spot.target.position.set(0, 1.35, 0)
          lightNode.line.geometry.setFromPoints([lightNode.group.position, target.position])
          lightNode.line.computeLineDistances()
        }
      }
      renderer.toneMappingExposure = clamp(2 ** renderSettingsRef.current.exposureStops, 0.45, 1.9)
      const previewWidth = Math.min(360, rect.width * 0.33)
      const mainWidth = rect.width - previewWidth
      renderer.setScissorTest(true)
      renderer.setViewport(0, 0, rect.width, rect.height)
      renderer.setScissor(0, 0, mainWidth, rect.height)
      renderer.clear(true, true, true)
      const current = projectRef.current
      const cameraConfig = current.cameras.find((camera) => camera.id === current.selectedCameraId) ?? current.cameras[0]
      const cameraNode = cameraConfig ? cameras.get(cameraConfig.id) : null
      const mainView = renderSettingsRef.current.viewMode === 'camera' && cameraNode ? cameraNode.camera : mainCamera
      renderer.render(scene, mainView)

      if (cameraNode && cameraConfig) {
        const ratioMap = current.mode === 'video'
          ? current.video.aspectRatio === '9:16' ? 9 / 16 : current.video.aspectRatio === '2.39:1' ? 2.39 : 16 / 9
          : current.photo.sensor === 'micro-four-thirds' ? 4 / 3 : 3 / 2
        const fitWidth = Math.min(previewWidth, rect.height * ratioMap)
        const fitHeight = fitWidth / ratioMap
        const previewX = mainWidth + (previewWidth - fitWidth) / 2
        const previewY = (rect.height - fitHeight) / 2
        renderer.setScissor(previewX, previewY, fitWidth, fitHeight)
        renderer.setViewport(previewX, previewY, fitWidth, fitHeight)
        renderer.clear(true, true, true)
        cameraNode.camera.aspect = ratioMap
        cameraNode.camera.updateProjectionMatrix()
        renderer.render(scene, cameraNode.camera)
      }
      renderer.setScissorTest(false)
    }
    frame = requestAnimationFrame(render)

    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      canvas.removeEventListener('pointerdown', onPointerDown)
      orbit.dispose()
      transform.dispose()
      disposeGroup(scene)
      renderer.dispose()
      rendererRef.current = null
      orbitRef.current = null
      transformRef.current = null
      sceneRef.current = null
      targetRef.current = null
      entitiesRef.current.clear()
      pickablesRef.current = []
      lights.clear()
      cameras.clear()
      callbackRef.current.onCanvasReady(null)
    }
    // Engine lifecycle is deliberately stable; the following effects sync the scene state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const renderer = rendererRef.current
    const canvas = canvasRef.current
    if (!renderer || !canvas) return
    const dpr = quality === 'economy' ? 0.72 : quality === 'balanced' ? 0.95 : 1.2
    renderer.setPixelRatio(Math.min(dpr, window.devicePixelRatio || 1))
    renderer.shadowMap.enabled = shadows && quality === 'high'
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    const rect = canvas.getBoundingClientRect()
    if (rect.width && rect.height) renderer.setSize(rect.width, rect.height, false)
  }, [quality, shadows])

  useEffect(() => {
    const scene = sceneRef.current
    const renderer = rendererRef.current
    const target = targetRef.current
    if (!scene || !renderer || !target) return
    const subject = entitiesRef.current.get('subject-main')
    const backWall = scene.getObjectByName('studio-backdrop') as THREE.Mesh | undefined
    const cyclorama = scene.getObjectByName('studio-cyclorama') as THREE.Mesh | undefined
    if (backWall?.material instanceof THREE.MeshStandardMaterial) backWall.material.color.set(project.backdropColor)
    if (cyclorama?.material instanceof THREE.MeshStandardMaterial) cyclorama.material.color.set(project.backdropColor)
    if (subject) {
      subject.position.set(...project.subjectPosition)
      subject.rotation.set(...project.subjectRotation)
      subject.scale.set(...project.subjectScale)
      const parts = subject.userData.poseParts as Record<string, THREE.Object3D>
      const shirtColor = new THREE.Color(project.clothingColor)
      subject.traverse((object: THREE.Object3D) => {
        const mesh = object as THREE.Mesh
        if (mesh.material instanceof THREE.MeshStandardMaterial && mesh.material.color.getHexString() === '6f816c') mesh.material.color.copy(shirtColor)
      })
      const armL = parts.leftArm
      const armR = parts.rightArm
      const forearmL = parts.leftForearm
      const forearmR = parts.rightForearm
      const legL = parts.leftLeg
      const legR = parts.rightLeg
      if (project.pose === 'portrait') { legL.visible = false; legR.visible = false }
      else { legL.visible = true; legR.visible = true }
      if (project.pose === 'hands-on-hips') {
        armL.rotation.z = 0.82; armR.rotation.z = -0.82
        forearmL.rotation.z = -1.1; forearmR.rotation.z = 1.1
      } else if (project.pose === 'seated') {
        armL.rotation.z = 0.12; armR.rotation.z = -0.12
        forearmL.rotation.z = 0.08; forearmR.rotation.z = -0.08
        legL.rotation.x = -0.7; legR.rotation.x = -0.7
      } else if (project.pose === 'portrait') {
        armL.rotation.z = 0.28; armR.rotation.z = -0.05
        forearmL.rotation.z = -0.2; forearmR.rotation.z = -0.35
        legL.rotation.x = 0; legR.rotation.x = 0
      } else {
        armL.rotation.z = 0.05; armR.rotation.z = -0.05
        forearmL.rotation.z = 0; forearmR.rotation.z = 0
        legL.rotation.x = 0; legR.rotation.x = 0
      }
    }

    const lightNodes = lightNodesRef.current
    const wantedLightIds = new Set(project.lights.map((light) => light.id))
    for (const [id, node] of lightNodes) {
      if (!wantedLightIds.has(id)) {
        scene.remove(node.group, node.line, node.aim)
        entitiesRef.current.delete(id)
        pickablesRef.current = pickablesRef.current.filter((item) => item !== node.group)
        disposeGroup(node.group)
        node.line.geometry.dispose()
        ;(node.line.material as THREE.Material).dispose()
        lightNodes.delete(id)
      }
    }
    project.lights.forEach((light: StudioLight) => {
      let node = lightNodes.get(light.id)
      if (!node) {
        node = createLightNode(light)
        lightNodes.set(light.id, node)
        entitiesRef.current.set(light.id, node.group)
        pickablesRef.current.push(node.group)
        scene.add(node.group, node.line, node.aim)
      }
      node.group.position.set(...light.position)
      node.group.rotation.set(...light.rotation)
      node.aim.position.set(0, 0, -1).applyEuler(node.group.rotation).multiplyScalar(10).add(node.group.position)
      node.group.visible = light.enabled
      node.spot.visible = light.enabled
      node.spot.color.set(light.color)
      node.spot.intensity = light.power / 28
      node.spot.angle = THREE.MathUtils.degToRad(clamp(light.angleDeg, 8, 80))
      node.spot.penumbra = light.modifier === 'snoot' ? 0.08 : light.modifier === 'reflector' ? 0.28 : clamp(light.size / 2.3, 0.25, 0.86)
      node.spot.distance = 10 + light.size * 2
      node.spot.castShadow = shadows && quality === 'high' && light.enabled
      node.spot.shadow.mapSize.set(512, 512)
      node.panel.scale.set(light.size, light.size * (light.modifier === 'stripbox' ? 1.8 : 0.72), 1)
      if (node.panel.material instanceof THREE.MeshStandardMaterial) {
        node.panel.material.color.set(light.color)
        node.panel.material.emissive.set(light.color)
        node.panel.material.emissiveIntensity = light.enabled ? 0.52 : 0
      }
      node.line.visible = light.enabled
      node.line.geometry.setFromPoints([node.group.position, target.position])
      node.line.computeLineDistances()
    })

    const cameraNodes = cameraNodesRef.current
    const wantedCameraIds = new Set(project.cameras.map((camera) => camera.id))
    for (const [id, node] of cameraNodes) {
      if (!wantedCameraIds.has(id)) {
        scene.remove(node.group)
        entitiesRef.current.delete(id)
        pickablesRef.current = pickablesRef.current.filter((item) => item !== node.group)
        disposeGroup(node.group)
        cameraNodes.delete(id)
      }
    }
    project.cameras.forEach((camera: StudioCamera) => {
      let node = cameraNodes.get(camera.id)
      if (!node) {
        node = createCameraNode(camera)
        cameraNodes.set(camera.id, node)
        entitiesRef.current.set(camera.id, node.group)
        pickablesRef.current.push(node.group)
        scene.add(node.group)
      }
      node.group.position.set(...camera.position)
      node.group.rotation.set(...camera.rotation)
      node.camera.fov = focalToFov(project.photo.focalLength, sensorWidth(project.photo.sensor))
      node.camera.updateProjectionMatrix()
    })

    const propNodes = [...entitiesRef.current.entries()].filter(([id]) => id.startsWith('prop-'))
    const wantedPropIds = new Set(project.props.map((prop) => prop.id))
    propNodes.forEach(([id, node]) => {
      if (!wantedPropIds.has(id)) {
        scene.remove(node)
        entitiesRef.current.delete(id)
        pickablesRef.current = pickablesRef.current.filter((item) => item !== node)
        disposeGroup(node)
      }
    })
    project.props.forEach((prop: StudioProp) => {
      let node = entitiesRef.current.get(prop.id)
      if (!node) {
        node = createProp(prop)
        scene.add(node)
        entitiesRef.current.set(prop.id, node)
        pickablesRef.current.push(node)
      }
      node.position.set(...prop.position)
      node.rotation.set(...prop.rotation)
      node.scale.set(...prop.scale)
    })

    const selected = entitiesRef.current.get(selectedObjectId)
    if (selected) transformRef.current?.attach(selected)
    else transformRef.current?.detach()
    transformRef.current?.setMode(transformMode)
  }, [project, selectedObjectId, transformMode, shadows, quality])

  const previewLayout = (() => {
    const { width, height } = canvasSize
    if (!width || !height) return undefined
    const previewWidth = Math.min(360, width * 0.33)
    const mainWidth = width - previewWidth
    const aspect = project.mode === 'video'
      ? project.video.aspectRatio === '9:16' ? 9 / 16 : project.video.aspectRatio === '2.39:1' ? 2.39 : 16 / 9
      : project.photo.sensor === 'micro-four-thirds' ? 4 / 3 : 3 / 2
    const frameWidth = Math.min(previewWidth, height * aspect)
    const frameHeight = frameWidth / aspect
    return { left: `${((mainWidth + (previewWidth - frameWidth) / 2) / width) * 100}%`, top: `${((height - frameHeight) / 2 / height) * 100}%`, width: `${(frameWidth / width) * 100}%`, height: `${(frameHeight / height) * 100}%` }
  })()

  return <div className="studio-viewport-shell">
    <canvas ref={canvasRef} className="studio-canvas" aria-label="Scène 3D interactive. Cliquez sur un objet pour le sélectionner ; utilisez les poignées pour le déplacer ou le tourner." style={{ filter: monochrome ? 'grayscale(1)' : undefined }} />
    <div className="studio-preview-effects" style={previewLayout} aria-hidden="true">
      <div className="studio-dof-overlay" style={{ opacity: depthBlur }} />
      <div className="studio-noise-overlay" style={{ opacity: noiseAmount }} />
      <div className="studio-wb-overlay" style={{ background: whiteBalance < 5000 ? 'rgba(70,130,255,.11)' : whiteBalance > 6500 ? 'rgba(255,142,53,.12)' : 'transparent' }} />
      <div className="studio-frame-grid"><i /><i /><i /><i /></div>
      <div className="studio-frame-readout">{project.mode === 'photo' ? `${project.photo.focalLength} MM · F/${project.photo.aperture}` : `${project.video.fps} FPS · ${project.video.shutterAngle}°`}</div>
      <div className="studio-frame-crosshair">◎</div>
    </div>
    <div className="studio-viewport-topline"><span><span className="studio-rec-dot" /> LIVE VIEW · {viewMode === 'plateau' ? 'PLATEAU' : 'CAMÉRA'}</span><span>APERÇU 3D PÉDAGOGIQUE</span></div>
    <div className="studio-viewport-hint">Orbit : glisser · Zoom : molette · Déplacer/rotation : poignées de transformation</div>
    <div className="studio-quality-mark">{quality === 'economy' ? 'GPU ÉCO' : quality === 'balanced' ? 'GPU ÉQUILIBRÉ' : 'GPU HAUTE QUALITÉ'}</div>
  </div>
}

function focalToFov(focalLengthMm: number, sensorWidthMm: number) {
  return THREE.MathUtils.radToDeg(2 * Math.atan(sensorWidthMm / (2 * focalLengthMm)))
}

function sensorWidth(sensor: StudioProject['photo']['sensor']) {
  if (sensor === 'aps-c') return 23.5
  if (sensor === 'micro-four-thirds') return 17.3
  return 36
}
