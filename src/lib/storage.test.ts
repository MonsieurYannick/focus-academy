import { describe, expect, it } from 'vitest'
import { validateSubmissionFile } from './storage'
import type { LearningExercise } from '../types'

const exercise: LearningExercise = {
  id: 'exercise-1',
  lesson_id: null,
  course_id: 'course-1',
  title: 'Remise photo',
  instructions: '',
  allowed_mime_types: ['image/jpeg', 'image/png'],
  max_file_size_bytes: 4,
}

describe('submission file validation', () => {
  it('accepts an allowed non-empty image within the configured limit', () => {
    const file = new File(['1234'], 'prise-de-vue.jpg', { type: 'image/jpeg' })
    expect(validateSubmissionFile(file, exercise)).toBeNull()
  })

  it('rejects an unsupported media type and a file over the exercise limit', () => {
    const wrongType = new File(['x'], 'archive.zip', { type: 'application/zip' })
    const tooLarge = new File(['12345'], 'photo.png', { type: 'image/png' })
    expect(validateSubmissionFile(wrongType, exercise)).toMatch(/Format non autorisé/)
    expect(validateSubmissionFile(tooLarge, exercise)).toMatch(/trop volumineux/)
  })
})
