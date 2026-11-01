import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AuthProvider } from '../state/auth'
import { SimulatorPage } from '../ui/pages'
import { calculateExposure } from './photography'

describe('photography exposure model', () => {
  it('uses the stated settings to compare exposure against the reference scene', () => {
    const reference = calculateExposure({ aperture: 5.6, shutterSeconds: 1 / 125, iso: 100 })
    const oneStopMoreIso = calculateExposure({ aperture: 5.6, shutterSeconds: 1 / 125, iso: 200 })

    expect(reference.compensationStops).toBeCloseTo(0, 10)
    expect(oneStopMoreIso.compensationStops - reference.compensationStops).toBeCloseTo(1, 5)
  })

  it('calculates a shallower depth of field with a larger aperture', () => {
    const wide = calculateExposure({ aperture: 2, shutterSeconds: 1 / 125, iso: 100 })
    const narrow = calculateExposure({ aperture: 11, shutterSeconds: 1 / 125, iso: 100 })

    expect(wide.depthOfField.farMeters - wide.depthOfField.nearMeters)
      .toBeLessThan(narrow.depthOfField.farMeters - narrow.depthOfField.nearMeters)
  })

  it('lets a learner change a setting and complete an exercise with clear save status', () => {
    render(<AuthProvider><SimulatorPage /></AuthProvider>)

    expect(screen.getByText('0.0 EV')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Vitesse d’obturation'), { target: { value: '1' } })
    expect(screen.getByText('-2.0 EV')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /vérifier mes réglages/i }))

    expect(screen.getByText(/Une vitesse rapide réduit le déplacement/)).toBeInTheDocument()
    expect(screen.getByText(/Réussite calculée dans cette session uniquement/)).toBeInTheDocument()
  })
})
