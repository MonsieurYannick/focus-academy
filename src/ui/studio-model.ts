export type Vec3 = [number, number, number]
export type Euler3 = [number, number, number]
export type StudioMode = 'photo' | 'video'
export type LightModifier = 'softbox' | 'octabox' | 'stripbox' | 'reflector' | 'beauty-dish' | 'snoot'
export type StudioPose = 'standing' | 'portrait' | 'seated' | 'hands-on-hips'

export interface StudioLight {
  id: string
  name: string
  modifier: LightModifier
  position: Vec3
  rotation: Euler3
  power: number
  angleDeg: number
  color: string
  temperature: number
  enabled: boolean
  size: number
}

export interface StudioCamera {
  id: string
  name: string
  position: Vec3
  rotation: Euler3
}

export interface StudioProp {
  id: string
  kind: 'stool' | 'cube' | 'plant' | 'reflector'
  name: string
  position: Vec3
  rotation: Euler3
  scale: Vec3
}

export interface CameraKeyframe {
  id: string
  cameraId: string
  time: number
  position: Vec3
  rotation: Euler3
}

export interface StudioProject {
  version: 1
  name: string
  mode: StudioMode
  selectedCameraId: string
  lights: StudioLight[]
  cameras: StudioCamera[]
  props: StudioProp[]
  subjectPosition: Vec3
  subjectRotation: Euler3
  subjectScale: Vec3
  pose: StudioPose
  clothingColor: string
  backdropColor: string
  photo: {
    aperture: number
    shutterSeconds: number
    iso: number
    focalLength: number
    sensor: 'full-frame' | 'aps-c' | 'micro-four-thirds'
    focusDistance: number
    kelvin: number
    monochrome: boolean
  }
  video: {
    fps: number
    shutterAngle: number
    ndStops: number
    aspectRatio: '16:9' | '9:16' | '2.39:1'
    movement: 'static' | 'pan' | 'tilt' | 'dolly' | 'orbit'
    durationSeconds: number
    keyframes: CameraKeyframe[]
  }
}

export const STUDIO_STORAGE_KEY = 'focus-academy-studio-projects-v1'

export const DEFAULT_STUDIO_PROJECT: StudioProject = {
  version: 1,
  name: 'Portrait — nouvelle scène',
  mode: 'photo',
  selectedCameraId: 'camera-main',
  pose: 'standing',
  clothingColor: '#6f816c',
  backdropColor: '#66745e',
  cameras: [
    { id: 'camera-main', name: 'Caméra principale', position: [0, 1.65, 5.4], rotation: [0, 0, 0] },
  ],
  lights: [
    { id: 'light-key', name: 'Key · softbox', modifier: 'softbox', position: [-2.1, 2.7, 1.6], rotation: [-0.45, -0.92, 0], power: 95, angleDeg: 48, color: '#fff1d2', temperature: 5600, enabled: true, size: 1.25 },
    { id: 'light-fill', name: 'Fill · réflecteur', modifier: 'reflector', position: [2.3, 1.8, 1.7], rotation: [-0.14, 0.93, 0], power: 35, angleDeg: 62, color: '#dce8ff', temperature: 6500, enabled: true, size: 1.05 },
    { id: 'light-rim', name: 'Rim · stripbox', modifier: 'stripbox', position: [0.9, 2.5, -2.5], rotation: [-0.4, 2.8, 0], power: 72, angleDeg: 28, color: '#fff5e5', temperature: 5600, enabled: true, size: 0.55 },
  ],
  props: [
    { id: 'prop-stool', kind: 'stool', name: 'Tabouret', position: [-1.45, 0, -0.15], rotation: [0, 0, 0], scale: [1, 1, 1] },
    { id: 'prop-cube', kind: 'cube', name: 'Cube de décor', position: [1.55, 0.38, -0.45], rotation: [0, 0.18, 0], scale: [0.78, 0.76, 0.78] },
  ],
  subjectPosition: [0, 0, 0],
  subjectRotation: [0, 0, 0],
  subjectScale: [1, 1, 1],
  photo: { aperture: 5.6, shutterSeconds: 1 / 125, iso: 100, focalLength: 50, sensor: 'full-frame', focusDistance: 3, kelvin: 5600, monochrome: false },
  video: { fps: 24, shutterAngle: 180, ndStops: 0, aspectRatio: '16:9', movement: 'static', durationSeconds: 6, keyframes: [] },
}

export const STUDIO_EXERCISES = [
  { id: 'soft-beauty', title: 'Portrait beauté — lumière douce', level: 'Débutant', mode: 'photo' as const, goal: 'Approchez la source principale du sujet et choisissez une grande surface de diffusion.', check: (project: StudioProject) => project.lights.some((light) => light.enabled && light.modifier !== 'snoot' && light.size >= 1 && Math.hypot(light.position[0], light.position[2]) < 3.2), correction: 'Une source large et proche enveloppe davantage le visage. Le calcul de douceur ici reste une approximation géométrique.' },
  { id: 'one-light-drama', title: 'Portrait dramatique — une source', level: 'Intermédiaire', mode: 'photo' as const, goal: 'Éteignez les sources secondaires et gardez une lumière principale active.', check: (project: StudioProject) => project.lights.filter((light) => light.enabled).length === 1, correction: 'Une seule source active augmente le contraste. Dans un vrai studio, les murs et réflecteurs continuent toutefois à renvoyer de la lumière.' },
  { id: 'three-point', title: 'Schéma trois points', level: 'Intermédiaire', mode: 'photo' as const, goal: 'Activez trois sources et placez-les à des positions distinctes.', check: (project: StudioProject) => project.lights.filter((light) => light.enabled).length >= 3 && new Set(project.lights.filter((light) => light.enabled).map((light) => light.position.map((part) => part.toFixed(1)).join(','))).size >= 3, correction: 'Le schéma classique combine principale, remplissage et contre-jour. Les rôles dépendent aussi de la direction réelle des sources.' },
  { id: 'low-key', title: 'Portrait low-key', level: 'Avancé', mode: 'photo' as const, goal: 'Réduisez le nombre de sources et abaissez l’exposition pour garder des ombres.', check: (project: StudioProject) => project.lights.filter((light) => light.enabled).length <= 2 && project.photo.aperture >= 5.6 && project.photo.iso <= 800, correction: 'Un éclairage retenu et une exposition mesurée favorisent un rendu sombre. La prévisualisation ne remplace pas une mesure au flashmètre.' },
  { id: 'video-interview', title: 'Interview vidéo', level: 'Débutant', mode: 'video' as const, goal: 'Choisissez 24/25 i/s, un angle de 180° et un ratio 16:9.', check: (project: StudioProject) => [24, 25].includes(project.video.fps) && project.video.shutterAngle === 180 && project.video.aspectRatio === '16:9', correction: 'La règle de l’angle à 180° donne un temps de pose proche de la moitié de la durée d’une image, pour un flou de mouvement conventionnel.' },
  { id: 'cinema-light', title: 'Scène cinéma — lumière continue', level: 'Avancé', mode: 'video' as const, goal: 'Activez au moins deux sources et choisissez une fréquence de 24 i/s.', check: (project: StudioProject) => project.video.fps === 24 && project.lights.filter((light) => light.enabled).length >= 2, correction: 'En cinéma, le déplacement de la caméra et la direction de lumière participent à la narration autant que l’exposition.' },
]

export function createLight(index: number): StudioLight {
  const position: Vec3 = [index % 2 === 0 ? -2 : 2, 2.3, 1.5]
  const dx = -position[0]
  const dy = 1.35 - position[1]
  const dz = -position[2]
  const horizontal = Math.hypot(dx, dz)
  return {
    id: `light-${crypto.randomUUID()}`,
    name: `Source ${index + 1}`,
    modifier: 'softbox',
    position,
    rotation: [Math.atan2(dy, horizontal), Math.atan2(-dx, -dz), 0],
    power: 70,
    angleDeg: 45,
    color: '#fff1d2',
    temperature: 5600,
    enabled: true,
    size: 1,
  }
}

export function createCamera(index: number): StudioCamera {
  return { id: `camera-${crypto.randomUUID()}`, name: `Caméra ${index + 1}`, position: [index % 2 === 0 ? -3 : 3, 1.7, 5.1], rotation: [0, 0, 0] }
}

export function isStudioProject(value: unknown): value is StudioProject {
  if (!value || typeof value !== 'object') return false
  const project = value as Partial<StudioProject>
  const validVector = (vector: unknown): vector is Vec3 => Array.isArray(vector) && vector.length === 3 && vector.every((part) => typeof part === 'number' && Number.isFinite(part))
  const validEuler = (rotation: unknown): rotation is Euler3 => validVector(rotation)
  return project.version === 1 && typeof project.name === 'string' && project.name.length <= 120
    && (project.mode === 'photo' || project.mode === 'video')
    && Array.isArray(project.lights) && project.lights.length <= 16 && project.lights.every((light) =>
      typeof light.id === 'string' && typeof light.name === 'string' && validVector(light.position) && validEuler(light.rotation)
      && typeof light.power === 'number' && Number.isFinite(light.power) && typeof light.size === 'number' && Number.isFinite(light.size)
      && typeof light.color === 'string' && typeof light.enabled === 'boolean' && typeof light.angleDeg === 'number'
    )
    && Array.isArray(project.cameras) && project.cameras.length > 0 && project.cameras.length <= 8 && project.cameras.every((camera) =>
      typeof camera.id === 'string' && typeof camera.name === 'string' && validVector(camera.position) && validEuler(camera.rotation)
    )
    && Array.isArray(project.props) && project.props.length <= 30 && project.props.every((prop) =>
      typeof prop.id === 'string' && validVector(prop.position) && validEuler(prop.rotation) && validVector(prop.scale)
    )
    && validVector(project.subjectPosition) && validEuler(project.subjectRotation) && validVector(project.subjectScale)
    && !!project.photo && Number.isFinite(project.photo.aperture) && Number.isFinite(project.photo.shutterSeconds)
    && Number.isFinite(project.photo.iso) && Number.isFinite(project.photo.focalLength) && Number.isFinite(project.photo.focusDistance)
    && Number.isFinite(project.photo.kelvin) && typeof project.photo.monochrome === 'boolean'
    && !!project.video && Number.isFinite(project.video.fps) && Number.isFinite(project.video.shutterAngle)
    && Number.isFinite(project.video.ndStops) && Number.isFinite(project.video.durationSeconds)
    && Array.isArray(project.video.keyframes) && project.video.keyframes.length <= 120 && project.video.keyframes.every((frame) =>
      typeof frame.id === 'string' && typeof frame.cameraId === 'string' && Number.isFinite(frame.time)
      && validVector(frame.position) && validEuler(frame.rotation)
    )
}
