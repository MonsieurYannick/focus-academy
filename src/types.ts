export type AppRole = 'admin' | 'instructor' | 'student' | 'guardian'

export interface Profile {
  id: string
  full_name: string
  role: AppRole
  avatar_url: string | null
}

export interface Course {
  id: string
  title: string
  slug: string
  description: string
  level: 'beginner' | 'intermediate' | 'advanced'
  duration_minutes: number | null
  category_id: string | null
  status: 'draft' | 'published' | 'archived'
  certificate_passing_score: number
  course_categories?: { name: string } | null
}

export interface Lesson {
  id: string
  module_id: string
  title: string
  content: string
  position: number
  duration_minutes: number | null
  is_required: boolean
  video_url: string | null
}

export interface LearningResource {
  id: string
  lesson_id: string
  title: string
  kind: 'pdf' | 'link' | 'video' | 'file'
  external_url: string | null
  object_path: string | null
}

export interface LearningExercise {
  id: string
  lesson_id: string | null
  course_id: string
  title: string
  instructions: string
  allowed_mime_types: string[]
  max_file_size_bytes: number
}

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Administrateur',
  instructor: 'Formateur',
  student: 'Étudiant',
  guardian: 'Parent / tuteur',
}

export const LEVEL_LABELS: Record<Course['level'], string> = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
}
