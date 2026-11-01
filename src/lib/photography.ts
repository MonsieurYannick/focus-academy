export interface ExposureInput {
  aperture: number
  shutterSeconds: number
  iso: number
}

export interface ExposureResult {
  settingsEv100: number
  compensationStops: number
  noisePercent: number
  motionBlurPercent: number
  depthOfField: { nearMeters: number; farMeters: number; hyperfocalMeters: number }
}

const referenceSceneEv = Math.log2((5.6 * 5.6) / (1 / 125))
const referenceShutter = 1 / 125
const focalLengthMm = 50
const circleOfConfusionMm = 0.019

/** Approximation pédagogique basée sur un objectif 50 mm, mise au point à 3 m et un cercle de confusion APS-C. */
export function calculateExposure(input: ExposureInput): ExposureResult {
  const { aperture, shutterSeconds, iso } = input
  const settingsEv100 = Math.log2((aperture * aperture) / shutterSeconds) - Math.log2(iso / 100)
  const compensationStops = referenceSceneEv - settingsEv100

  const focalMeters = focalLengthMm / 1000
  const cocMeters = circleOfConfusionMm / 1000
  const hyperfocalMeters = (focalMeters * focalMeters) / (aperture * cocMeters) + focalMeters
  const focusMeters = 3
  const nearMeters = (hyperfocalMeters * focusMeters) / (hyperfocalMeters + focusMeters - focalMeters)
  const farDenominator = hyperfocalMeters - (focusMeters - focalMeters)
  const farMeters = farDenominator <= 0 ? Number.POSITIVE_INFINITY : (hyperfocalMeters * focusMeters) / farDenominator

  return {
    settingsEv100,
    compensationStops,
    noisePercent: Math.max(0, Math.min(100, (Math.log2(iso / 100) / Math.log2(12800 / 100)) * 100)),
    motionBlurPercent: Math.max(0, Math.min(100, ((shutterSeconds / referenceShutter - 1) / 7) * 100)),
    depthOfField: { nearMeters, farMeters, hyperfocalMeters },
  }
}

export const SHUTTER_OPTIONS = [
  { label: '1/1000 s', value: 1 / 1000 },
  { label: '1/500 s', value: 1 / 500 },
  { label: '1/250 s', value: 1 / 250 },
  { label: '1/125 s', value: 1 / 125 },
  { label: '1/60 s', value: 1 / 60 },
  { label: '1/30 s', value: 1 / 30 },
  { label: '1/15 s', value: 1 / 15 },
]

export const CAMERA_EXERCISES = [
  {
    id: 'freeze-action',
    title: 'Figer un mouvement',
    goal: 'Choisis une vitesse de 1/500 s ou plus rapide.',
    check: (input: ExposureInput) => input.shutterSeconds <= 1 / 500,
    correction: 'Une vitesse rapide réduit le déplacement du sujet pendant l’exposition. Si l’image devient trop sombre, ouvre le diaphragme ou augmente l’ISO.',
  },
  {
    id: 'shallow-depth',
    title: 'Isoler le sujet',
    goal: 'Utilise une grande ouverture : f/2.8 ou plus ouverte.',
    check: (input: ExposureInput) => input.aperture <= 2.8,
    correction: 'Un nombre f plus petit correspond à une ouverture plus grande. À distance de mise au point constante, cela réduit généralement la zone de netteté.',
  },
  {
    id: 'low-noise',
    title: 'Limiter le bruit',
    goal: 'Garde la sensibilité à ISO 800 ou moins.',
    check: (input: ExposureInput) => input.iso <= 800,
    correction: 'Une sensibilité plus basse réduit généralement le bruit, mais nécessite davantage de lumière, une ouverture plus grande ou une vitesse plus lente.',
  },
]

export function describeExposure(stops: number) {
  if (stops > 0.5) return 'Plus clair que la référence'
  if (stops < -0.5) return 'Plus sombre que la référence'
  return 'Proche de la référence'
}
