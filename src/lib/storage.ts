import { supabase } from './supabase'
import type { LearningExercise } from '../types'

export const WORK_BUCKET = 'student-work'

export function validateSubmissionFile(file: File, exercise: LearningExercise) {
  const allowed = exercise.allowed_mime_types
  if (!allowed.includes(file.type)) return `Format non autorisé : ${file.type || 'type inconnu'}.`
  if (file.size > exercise.max_file_size_bytes) {
    return `Fichier trop volumineux. Limite : ${Math.round(exercise.max_file_size_bytes / 1024 / 1024)} Mo.`
  }
  if (file.size === 0) return 'Le fichier est vide.'
  return null
}

export async function uploadSubmissionFile(userId: string, exercise: LearningExercise, file: File) {
  if (!supabase) throw new Error('Le stockage Supabase n’est pas configuré.')
  const validationError = validateSubmissionFile(file, exercise)
  if (validationError) throw new Error(validationError)
  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
  const objectPath = `${userId}/${exercise.id}/${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage.from(WORK_BUCKET).upload(objectPath, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) throw error
  return objectPath
}
