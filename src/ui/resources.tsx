import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { ArrowUpRight, ChevronDown, ExternalLink, FileText, Plus, Video } from 'lucide-react'
import { useAuth } from '../state/auth'
import { backendConfigured, supabase } from '../lib/supabase'
import { ErrorNotice, LoadingState, Notice } from './pages'
import type { LearningResource } from '../types'

type ManagedLesson = { id: string; title: string; module_id: string; course_modules: { course_id: string } }
type ManagedResource = LearningResource & { is_preview: boolean; lessons?: { title: string } | null }

const RESOURCE_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']

export function ResourcesPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const manager = profile?.role === 'admin' || profile?.role === 'instructor'
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([])
  const [courseId, setCourseId] = useState('')
  const [lessons, setLessons] = useState<ManagedLesson[]>([])
  const [lessonId, setLessonId] = useState('')
  const [resources, setResources] = useState<ManagedResource[]>([])
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<LearningResource['kind']>('pdf')
  const [externalUrl, setExternalUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    if (!supabase || !user || !manager) { setLoading(false); return }
    setLoading(true); setError('')
    const [{ data: courseData, error: courseError }, { data: resourceData, error: resourceError }] = await Promise.all([
      supabase.from('courses').select('id,title').order('title'),
      supabase.from('learning_resources').select('id,lesson_id,title,kind,external_url,object_path,is_preview,lessons(title)').order('created_at', { ascending: false }).limit(60),
    ])
    if (courseError || resourceError) setError((courseError || resourceError)?.message ?? '')
    else {
      setCourses((courseData ?? []) as typeof courses)
      setResources((resourceData ?? []) as unknown as ManagedResource[])
      if (!courseId && courseData?.[0]) setCourseId(courseData[0].id)
    }
    setLoading(false)
  }, [user, manager, courseId])

  const loadLessons = useCallback(async () => {
    if (!supabase || !courseId) { setLessons([]); setLessonId(''); return }
    const { data, error: lessonsError } = await supabase.from('lessons').select('id,title,module_id,course_modules!inner(course_id)').eq('course_modules.course_id', courseId).order('position')
    if (lessonsError) setError(lessonsError.message)
    else {
      setLessons((data ?? []) as unknown as ManagedLesson[])
      if (!data?.some((item) => item.id === lessonId)) setLessonId(data?.[0]?.id ?? '')
    }
  }, [courseId, lessonId])

  useEffect(() => { void load() }, [load])
  useEffect(() => { void loadLessons() }, [loadLessons])

  async function createResource(event: FormEvent) {
    event.preventDefault()
    if (!supabase || !user || !courseId || !lessonId || !title.trim()) return
    const external = kind === 'link' || (kind === 'video' && !file)
    let safeUrl: string | null = null
    if (external) {
      try {
        const parsed = new URL(externalUrl)
        if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('unsupported protocol')
        safeUrl = parsed.href
      } catch {
        setMessage('Saisissez une URL HTTP(S) valide, ou sélectionnez un fichier à téléverser.')
        return
      }
    } else if (!file) {
      setMessage('Sélectionnez un fichier pédagogique à téléverser.')
      return
    } else if (!RESOURCE_MIME_TYPES.includes(file.type) || file.size === 0 || file.size > 104857600) {
      setMessage('Format non pris en charge ou fichier supérieur à 100 Mo.')
      return
    }

    setSaving(true); setMessage('')
    let objectPath: string | null = null
    let resourceId: string | null = null
    try {
      if (file && !external) {
        const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
        objectPath = `${courseId}/${lessonId}/${crypto.randomUUID()}.${extension}`
      }
      const { data: resource, error: insertError } = await supabase.from('learning_resources').insert({
        lesson_id: lessonId,
        title: title.trim(),
        kind,
        external_url: safeUrl,
        object_path: objectPath,
        is_preview: preview,
      }).select('id').single()
      if (insertError) throw insertError
      resourceId = resource.id

      if (file && objectPath) {
        const { error: uploadError } = await supabase.storage.from('course-resources').upload(objectPath, file, { contentType: file.type, upsert: false })
        if (uploadError) throw uploadError
      }
      setTitle(''); setExternalUrl(''); setFile(null); setPreview(false)
      setMessage('Ressource ajoutée. Les droits de lecture suivent le cours, la leçon et le statut de prévisualisation.')
      await load()
    } catch (resourceError) {
      if (resourceId && objectPath) {
        await supabase.storage.from('course-resources').remove([objectPath])
        await supabase.from('learning_resources').delete().eq('id', resourceId)
      }
      setMessage(resourceError instanceof Error ? resourceError.message : 'La ressource n’a pas pu être enregistrée.')
    }
    setSaving(false)
  }

  if (authLoading) return <section className="page-wrap"><LoadingState /></section>
  if (!backendConfigured) return <section className="page-wrap"><h1>Ressources pédagogiques</h1><Notice tone="warning">Le gestionnaire de ressources nécessite Supabase et ses deux buckets privés. Aucun document n’est copié ou hébergé dans ce dépôt.</Notice></section>
  if (!user) return <Navigate to="/connexion" replace />
  if (!manager) return <section className="page-wrap"><Notice tone="error">Cet espace est réservé aux formateurs et administrateurs. Les étudiants accèdent à leurs ressources depuis les leçons auxquelles ils sont autorisés.</Notice></section>

  return <section className="page-wrap resources-page"><div className="page-heading-row"><div><div className="eyebrow"><FileText size={15} /> Bibliothèque pédagogique</div><h1>Ressources & médias</h1><p className="lead">Ajoutez des documents, illustrations, vidéos autorisées ou liens externes à une leçon.</p></div><div className="certificate-heading-mark"><Video size={31} /></div></div><Notice>Les fichiers hébergés sont déposés dans le bucket privé `course-resources`. Les vidéos externes restent chez leur fournisseur.</Notice>{error && <ErrorNotice message={error} retry={() => void load()} />}{loading ? <LoadingState label="Chargement de la bibliothèque…" /> : <><details className="manager-panel resource-manager" open><summary><span><Plus size={17} /> Ajouter une ressource à une leçon</span><ChevronDown size={16} /></summary><form className="resource-manager-form" onSubmit={(event) => void createResource(event)}><label className="field-label">Formation<select required value={courseId} onChange={(event) => setCourseId(event.target.value)}><option value="">Choisir une formation gérée</option>{courses.map((course) => <option value={course.id} key={course.id}>{course.title}</option>)}</select></label><label className="field-label">Leçon<select required value={lessonId} onChange={(event) => setLessonId(event.target.value)}><option value="">Choisir une leçon</option>{lessons.map((lesson) => <option value={lesson.id} key={lesson.id}>{lesson.title}</option>)}</select></label><label className="field-label">Titre de la ressource<input required maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} /></label><label className="field-label">Type<select value={kind} onChange={(event) => { setKind(event.target.value as LearningResource['kind']); setFile(null) }}><option value="pdf">Document PDF</option><option value="file">Image / fichier</option><option value="video">Vidéo externe ou hébergée</option><option value="link">Lien externe</option></select></label>{(kind === 'link' || kind === 'video') && <label className="field-label">URL externe (HTTP/S)<input type="url" value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} placeholder="https://…" /></label>}{(kind === 'pdf' || kind === 'file' || (kind === 'video' && !externalUrl)) && <label className="field-label">Fichier privé<input type="file" accept={RESOURCE_MIME_TYPES.join(',')} onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><small>PDF, images JPEG/PNG/WebP, vidéos MP4/MOV · limite de 100 Mo</small></label>}<label className="resource-preview-check"><input type="checkbox" checked={preview} onChange={(event) => setPreview(event.target.checked)} /> Accessible comme extrait de prévisualisation sur un cours publié</label><button className="button button-dark button-small" disabled={saving || !lessons.length}>{saving ? 'Enregistrement sécurisé…' : 'Ajouter la ressource'} <ArrowUpRight size={14} /></button>{message && <Notice tone={message.startsWith('Ressource ajoutée') ? 'success' : 'error'}>{message}</Notice>}</form></details><section className="resource-inventory"><h2>Ressources récemment ajoutées</h2>{resources.length ? resources.map((resource) => <article className="resource-inventory-row" key={resource.id}><span className="resource-icon">{resource.kind === 'pdf' ? <FileText size={17} /> : resource.kind === 'video' ? <Video size={17} /> : <ExternalLink size={17} />}</span><div><strong>{resource.title}</strong><small>{resource.lessons?.title || 'Leçon'} · {resource.kind.toUpperCase()} · {resource.object_path ? 'Fichier privé' : 'Lien externe'}</small></div><span className="preview-state">{resource.is_preview ? 'Extrait' : 'Inscrits'}</span></article>) : <div className="empty-inline"><FileText /><div><strong>Aucune ressource ajoutée</strong><p>Les supports apparaîtront dans leur leçon après enregistrement.</p></div></div>}</section></>}</section>
}
