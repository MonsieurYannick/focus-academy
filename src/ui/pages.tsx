import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Aperture, Award, BadgeCheck, BookOpen, CalendarDays, Camera, Check, CheckCircle2, ChevronDown, CircleHelp, Clock3, Download, ExternalLink, FileImage, FileText, LockKeyhole, Mail, Play, Plus, RefreshCw, ShieldCheck, Sparkles, Target, UploadCloud, Users, Video, XCircle } from 'lucide-react'
import { useAuth } from '../state/auth'
import { backendConfigured, supabase } from '../lib/supabase'
import { CAMERA_EXERCISES, calculateExposure, describeExposure, SHUTTER_OPTIONS, type ExposureInput } from '../lib/photography'
import { uploadSubmissionFile } from '../lib/storage'
import { learningDomains } from '../data/curriculum'
import { LEVEL_LABELS, ROLE_LABELS, type AppRole, type Course, type LearningExercise, type LearningResource, type Lesson } from '../types'

export function Notice({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'success' | 'warning' | 'error' }) {
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'error' ? XCircle : tone === 'warning' ? CircleHelp : ShieldCheck
  return <div className={`notice notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}><Icon size={17} /><span>{children}</span></div>
}

export function LoadingState({ label = 'Chargement…' }: { label?: string }) {
  return <div className="loading-state"><span className="spinner" aria-hidden="true" />{label}</div>
}

export function ErrorNotice({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="error-card"><XCircle size={20} /><div><strong>Impossible de charger ces données.</strong><p>{message}</p>{retry && <button className="button button-outline button-small" onClick={retry}><RefreshCw size={14} /> Réessayer</button>}</div></div>
}

function SectionTitle({ kicker, title, description, action }: { kicker: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="section-title"><div><div className="eyebrow">{kicker}</div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>
}

export function HomePage() {
  return <>
    <section className="hero-section">
      <div className="hero-content"><div className="eyebrow light-eyebrow"><span className="eyebrow-line" /> L’école de l’image</div><h1>Apprendre à voir.<br /><em>Maîtriser l’image.</em></h1><p className="hero-lead">De la première prise de vue au portfolio professionnel, construisez votre regard et votre savoir-faire, étape par étape.</p><div className="hero-actions"><Link to="/formations" className="button button-lime">Explorer les formations <ArrowUpRight size={17} /></Link><Link to="/simulateur" className="button button-glass"><Camera size={16} /> Essayer le simulateur</Link></div><div className="hero-meta"><span><span className="hero-meta-dot" /> Parcours débutant à avancé</span><span>PHOTO · VIDÉO · POST-PRODUCTION</span></div></div>
      <div className="hero-art" aria-label="Illustration graphique d’un objectif photo"><div className="viewfinder"><span className="finder-corner corner-tl" /><span className="finder-corner corner-tr" /><span className="finder-corner corner-bl" /><span className="finder-corner corner-br" /><div className="finder-crosshair" /><div className="lens-graphic"><div className="lens-ring ring-outer" /><div className="lens-ring ring-mid" /><div className="lens-glass"><span className="lens-glint" /></div></div><div className="finder-label finder-top">F / 2.8 <span>1/250</span></div><div className="finder-label finder-bottom"><span>ISO 100</span> <span>◉ ● ●</span></div><div className="finder-stamp">FOCUS<br /><small>ACADEMY</small></div></div><div className="hero-note">Chaque réglage raconte<br />une intention.</div></div>
      <div className="hero-index">01 — APPRENDRE</div>
    </section>

    <section className="intro-strip"><div className="intro-number">01<span>/04</span></div><p>Une pédagogie concrète pour transformer la curiosité en <strong>compétence visuelle.</strong></p><Link to="/formations" className="round-link" aria-label="Découvrir les formations"><ArrowDownRight size={20} /></Link></section>

    <section className="page-wrap home-domains"><SectionTitle kicker="Les domaines" title="Développez votre regard." description="Un apprentissage progressif, de la technique à l’expression personnelle." /><div className="domain-grid">{learningDomains.map((domain) => <article className="domain-card" key={domain.number}><div className="domain-card-top"><span className="domain-number">{domain.number}</span><span className="domain-icon" aria-hidden="true">{domain.icon}</span></div><h3>{domain.title}</h3><p>{domain.description}</p><Link to="/formations" className="text-link">Voir les cours <ArrowUpRight size={15} /></Link></article>)}</div></section>

    <section className="simulator-callout"><div className="simulator-callout-copy"><div className="eyebrow light-eyebrow"><Camera size={15} /> Le labo FOCUS</div><h2>Et si tu testais<br />avant de déclencher ?</h2><p>Joue avec l’ouverture, la vitesse et l’ISO. Observe les compromis d’exposition, de mouvement et de profondeur de champ.</p><Link to="/simulateur" className="button button-lime">Ouvrir le simulateur <ArrowUpRight size={16} /></Link></div><div className="simulator-callout-graphic"><div className="sim-circle circle-one" /><div className="sim-circle circle-two" /><div className="sim-circle circle-three" /><Aperture size={118} strokeWidth={0.8} /><span>f / 2.8</span><span>1/125</span></div></section>

    <section className="page-wrap promise-section"><div className="promise-quote">“</div><div><div className="eyebrow">La méthode FOCUS</div><h2>Comprendre.<br /><em>Pratiquer. Créer.</em></h2><p>La théorie prend tout son sens quand elle devient une image. Chaque parcours associe notions essentielles, exercices et retours de formateur.</p><Link to="/inscription" className="text-link">Rejoindre l’académie <ArrowUpRight size={15} /></Link></div><div className="promise-aside"><span>UNE COMPÉTENCE À LA FOIS</span><div className="promise-line" /><span>UN PORTFOLIO QUI VOUS RESSEMBLE</span></div></section>

    <section className="bottom-cta"><div><div className="eyebrow light-eyebrow">Votre prochain chapitre</div><h2>La prochaine image<br />peut être la vôtre.</h2></div><Link to="/formations" className="button button-lime">Découvrir FOCUS <ArrowUpRight size={17} /></Link></section>
  </>
}

interface CatalogCourse extends Course {
  course_categories?: { name: string } | null
}

export function CatalogPage() {
  const [courses, setCourses] = useState<CatalogCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    if (!supabase) { setCourses([]); setLoading(false); return }
    const { data, error: resultError } = await supabase.from('courses').select('id,title,slug,description,level,duration_minutes,category_id,status,certificate_passing_score,course_categories(name)').eq('status', 'published').order('created_at', { ascending: false })
    if (resultError) setError(resultError.message)
    else setCourses((data ?? []) as unknown as CatalogCourse[])
    setLoading(false)
  }, [])
  useEffect(() => { void load() }, [load])
  const visible = useMemo(() => courses.filter((course) => `${course.title} ${course.description} ${course.course_categories?.name ?? ''}`.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr'))), [courses, query])

  return <section className="page-wrap catalog-page"><div className="page-heading-row"><div><div className="eyebrow">Apprendre à son rythme</div><h1>Les formations</h1><p className="lead">Des fondamentaux de la prise de vue à la construction d’un portfolio singulier.</p></div><div className="catalog-count"><span>{courses.length.toString().padStart(2, '0')}</span><small>COURS<br />PUBLIÉS</small></div></div>
    <div className="catalog-toolbar"><label className="search-field"><span className="sr-only">Rechercher une formation</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une formation…" /><span className="search-key">⌘ K</span></label><div className="filter-label"><span className="filter-dot" /> Photographie · Vidéo · Création</div></div>
    {loading ? <LoadingState label="Chargement des formations…" /> : error ? <ErrorNotice message={error} retry={() => void load()} /> : !backendConfigured ? <div className="empty-state large-empty"><div className="empty-icon"><BookOpen /></div><span className="eyebrow">Catalogue en préparation</span><h2>Les cours de FOCUS<br />n’attendent que leurs supports.</h2><p>Connectez Supabase et publiez les formations depuis l’espace de gestion. Aucun cours ou document fictif n’est présenté comme contenu réel.</p><Link to="/aide" className="text-link">Configurer la plateforme <ArrowUpRight size={15} /></Link></div> : visible.length === 0 ? <div className="empty-state"><BookOpen /><h2>{query ? 'Aucun résultat' : 'Aucune formation publiée'}</h2><p>{query ? 'Essayez un autre terme.' : 'Les formations apparaîtront ici dès leur publication par l’équipe pédagogique.'}</p></div> : <div className="course-grid">{visible.map((course, index) => <CourseCard key={course.id} course={course} index={index} />)}</div>}
    <div className="catalog-footnote"><ShieldCheck size={16} /> Les formations et supports sont publiés par l’équipe FOCUS Academy.</div>
  </section>
}

function CourseCard({ course, index }: { course: CatalogCourse; index: number }) {
  return <Link className={`course-card course-card-${index % 3}`} to={`/cours/${course.slug}`}><div className="course-card-art"><div className="course-art-grid" /><span className="course-card-index">{String(index + 1).padStart(2, '0')}</span><span className="course-card-art-mark">{index % 3 === 0 ? <Aperture /> : index % 3 === 1 ? <Video /> : <Camera />}</span><span className="course-level">{LEVEL_LABELS[course.level]}</span></div><div className="course-card-body"><div className="course-category">{course.course_categories?.name || 'FOCUS Academy'}</div><h3>{course.title}</h3><p>{course.description}</p><div className="course-card-foot"><span>{course.duration_minutes ? `${Math.ceil(course.duration_minutes / 60)} h d’apprentissage` : 'Parcours guidé'}</span><span className="course-arrow"><ArrowUpRight size={17} /></span></div></div></Link>
}

export function CoursePage() {
  const { slug } = useParams()
  const { user, profile } = useAuth()
  const [course, setCourse] = useState<(Course & { course_modules?: { id: string; title: string; position: number; lessons: Lesson[] }[] }) | null>(null)
  const [enrolled, setEnrolled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const manager = profile?.role === 'admin' || profile?.role === 'instructor'

  const load = useCallback(async () => {
    if (!supabase || !slug) { setLoading(false); return }
    setLoading(true)
    setError(null)
    let courseQuery = supabase.from('courses').select('id,title,slug,description,level,duration_minutes,status,certificate_passing_score,course_modules(id,title,position,lessons(id,module_id,title,content,position,duration_minutes,is_required,video_url))').eq('slug', slug)
    if (!manager) courseQuery = courseQuery.eq('status', 'published')
    const { data, error: courseError } = await courseQuery.maybeSingle()
    if (courseError) setError(courseError.message)
    else setCourse(data as unknown as typeof course)
    if (data && user) {
      const { data: enrollment } = await supabase.from('enrollments').select('id').eq('course_id', data.id).eq('student_id', user.id).maybeSingle()
      setEnrolled(Boolean(enrollment))
    }
    setLoading(false)
  }, [slug, user, manager])
  useEffect(() => { void load() }, [load])

  async function enroll() {
    if (!supabase || !user || !course) return
    setBusy(true); setMessage('')
    const { error: enrollError } = await supabase.from('enrollments').insert({ course_id: course.id, student_id: user.id })
    if (enrollError) setMessage(enrollError.message)
    else { setEnrolled(true); setMessage('Inscription enregistrée. Votre progression sera conservée dans votre compte.') }
    setBusy(false)
  }

  if (loading) return <section className="page-wrap"><LoadingState /></section>
  if (error) return <section className="page-wrap"><ErrorNotice message={error} retry={() => void load()} /></section>
  if (!backendConfigured) return <section className="page-wrap"><Notice>Les fiches de cours se chargeront depuis la base pédagogique après configuration de Supabase.</Notice><Link to="/formations" className="text-link"><ArrowLeft size={15} /> Retour au catalogue</Link></section>
  if (!course) return <section className="page-wrap"><div className="empty-state"><BookOpen /><h2>Formation introuvable</h2><p>Ce cours n’est pas publié ou n’existe plus.</p><Link to="/formations" className="text-link">Retour au catalogue <ArrowRight size={15} /></Link></div></section>

  const modules = [...(course.course_modules ?? [])].sort((a, b) => a.position - b.position)
  const lessons = modules.flatMap((module) => [...module.lessons].sort((a, b) => a.position - b.position))
  return <section className="page-wrap course-detail-page"><Link to="/formations" className="back-link"><ArrowLeft size={15} /> Toutes les formations</Link><div className="course-detail-hero"><div><div className="eyebrow">{LEVEL_LABELS[course.level]} · {course.status === 'published' ? 'Formation publiée' : 'Brouillon formateur'}</div><h1>{course.title}</h1><p className="lead">{course.description}</p><div className="course-detail-meta"><span><BookOpen size={16} /> {modules.length} modules</span><span><Play size={16} /> {lessons.length} leçons</span><span><Award size={16} /> Certificat sous conditions</span></div>{message && <Notice tone={message.includes('enregistrée') ? 'success' : 'error'}>{message}</Notice>}{user && profile?.role === 'student' && !enrolled && <button className="button button-dark" onClick={() => void enroll()} disabled={busy}>{busy ? 'Inscription…' : 'Commencer cette formation'} <ArrowUpRight size={16} /></button>}{enrolled && <Notice tone="success">Vous êtes inscrit·e à cette formation.</Notice>}{!user && <Link to="/connexion" className="button button-dark">Connectez-vous pour vous inscrire <ArrowUpRight size={16} /></Link>}</div><div className="course-detail-visual"><div className="course-detail-orbit"><Aperture size={95} strokeWidth={0.9} /></div><span className="visual-caption">FOCUS / {course.level.toUpperCase()}</span></div></div>
    {manager && <CourseContentManager course={course} onCreated={() => void load()} />}
    {modules.length ? <div className="module-list">{modules.map((module, moduleIndex) => <article className="module-card" key={module.id}><div className="module-header"><span className="module-number">MODULE {String(moduleIndex + 1).padStart(2, '0')}</span><h2>{module.title}</h2><span>{module.lessons.length} leçons</span></div>{[...module.lessons].sort((a, b) => a.position - b.position).map((lesson, lessonIndex) => <Link className="lesson-row" key={lesson.id} to={`/lecon/${lesson.id}`}><span className="lesson-play"><Play size={14} fill="currentColor" /></span><span className="lesson-title">{lesson.title}</span><span className="lesson-duration">{lesson.duration_minutes ? `${lesson.duration_minutes} min` : `Leçon ${lessonIndex + 1}`}</span><ArrowUpRight size={15} /></Link>)}</article>)}</div> : <div className="empty-state"><BookOpen /><h2>Le programme détaillé arrive bientôt</h2><p>Les modules et leçons seront ajoutés par les formateurs.</p>{manager && <p>Utilisez le formulaire de gestion ci-dessus pour préparer le contenu.</p>}</div>}</section>
}

function CourseContentManager({ course, onCreated }: { course: Course; onCreated: () => void }) {
  const [moduleTitle, setModuleTitle] = useState('')
  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonText, setLessonText] = useState('')
  const [moduleId, setModuleId] = useState('')
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [modules, setModules] = useState<{ id: string; title: string; position: number }[]>([])

  const loadModules = useCallback(async () => {
    if (!supabase) return
    const { data } = await supabase.from('course_modules').select('id,title,position').eq('course_id', course.id).order('position')
    setModules((data ?? []) as typeof modules)
    if (!moduleId && data?.[0]) setModuleId(data[0].id)
  }, [course.id, moduleId])
  useEffect(() => { void loadModules() }, [loadModules])

  async function createModule(event: FormEvent) {
    event.preventDefault(); if (!supabase || !moduleTitle.trim()) return
    setSaving(true); setStatus('')
    const { error } = await supabase.from('course_modules').insert({ course_id: course.id, title: moduleTitle.trim(), position: modules.length + 1 })
    if (error) setStatus(error.message)
    else { setModuleTitle(''); setStatus('Module ajouté.'); await loadModules(); onCreated() }
    setSaving(false)
  }
  async function createLesson(event: FormEvent) {
    event.preventDefault(); if (!supabase || !moduleId || !lessonTitle.trim()) return
    setSaving(true); setStatus('')
    const { count } = await supabase.from('lessons').select('id', { count: 'exact', head: true }).eq('module_id', moduleId)
    const { error } = await supabase.from('lessons').insert({ module_id: moduleId, title: lessonTitle.trim(), content: lessonText.trim(), position: (count ?? 0) + 1, is_required: true })
    if (error) setStatus(error.message)
    else { setLessonTitle(''); setLessonText(''); setStatus('Leçon créée. Vous pouvez la compléter depuis son lien dans le programme.'); onCreated() }
    setSaving(false)
  }
  async function publish() {
    if (!supabase) return
    setPublishing(true); setStatus('')
    const { count: lessonCount } = await supabase.from('lessons').select('id', { count: 'exact', head: true }).in('module_id', modules.map((item) => item.id))
    if (course.status !== 'published' && (!modules.length || !lessonCount)) {
      setStatus('Ajoutez au moins un module et une leçon avant de publier cette formation.')
      setPublishing(false); return
    }
    const nextStatus = course.status === 'published' ? 'draft' : 'published'
    const { error } = await supabase.from('courses').update({ status: nextStatus }).eq('id', course.id)
    if (error) setStatus(error.message)
    else { setStatus(nextStatus === 'published' ? 'Formation publiée dans le catalogue.' : 'Formation repassée en brouillon.'); onCreated() }
    setPublishing(false)
  }
  return <details className="manager-panel"><summary><span><Plus size={17} /> Gérer le contenu de cette formation</span><ChevronDown size={16} /></summary><div className="manager-publish-row"><div><strong>Statut : {course.status === 'published' ? 'publiée' : 'brouillon'}</strong><p>{course.status === 'published' ? 'Visible dans le catalogue.' : 'Visible uniquement pour les gestionnaires.'}</p></div><button className="button button-outline button-small" onClick={() => void publish()} disabled={publishing}>{publishing ? 'Mise à jour…' : course.status === 'published' ? 'Repasser en brouillon' : 'Publier la formation'}</button></div><div className="manager-grid"><form onSubmit={(event) => void createModule(event)}><h3>Ajouter un module</h3><label className="field-label">Titre du module<input required maxLength={120} value={moduleTitle} onChange={(event) => setModuleTitle(event.target.value)} /></label><button className="button button-dark button-small" disabled={saving}><Plus size={14} /> Ajouter</button></form><form onSubmit={(event) => void createLesson(event)}><h3>Ajouter une leçon</h3><label className="field-label">Module<select required value={moduleId} onChange={(event) => setModuleId(event.target.value)}><option value="">Choisir un module</option>{modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}</select></label><label className="field-label">Titre<input required maxLength={120} value={lessonTitle} onChange={(event) => setLessonTitle(event.target.value)} /></label><label className="field-label">Contenu pédagogique<textarea rows={3} value={lessonText} onChange={(event) => setLessonText(event.target.value)} placeholder="Rédigez uniquement un contenu vérifié ou fourni par l’équipe." /></label><button className="button button-dark button-small" disabled={saving || !modules.length}><Plus size={14} /> Créer la leçon</button></form></div>{status && <Notice tone={status.includes('publiée') || status.includes('brouillon') || status.includes('ajouté') || status.includes('créée') ? 'success' : 'error'}>{status}</Notice>}</details>
}

export function AuthPage({ mode }: { mode: 'signin' | 'signup' }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  if (user) return <Navigate to="/tableau-de-bord" replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true); setError(''); setMessage('')
    if (mode === 'signup') {
      const { data, error: authError } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: fullName.trim() } } })
      if (authError) setError(authError.message)
      else if (data.session) navigate('/tableau-de-bord')
      else setMessage('Inscription reçue. Vérifiez votre boîte de réception si la confirmation par courriel est activée.')
    } else {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (authError) setError(authError.message)
      else navigate('/tableau-de-bord')
    }
    setBusy(false)
  }

  return <section className="auth-page"><div className="auth-visual"><div className="auth-visual-mark"><Aperture size={150} strokeWidth={0.7} /></div><div className="eyebrow light-eyebrow">FOCUS / COMPTE APPRENANT</div><h2>Votre regard<br />a sa place ici.</h2><p>Retrouvez vos cours, vos exercices et votre progression depuis un seul espace.</p><span className="auth-visual-note">APPRENDRE À VOIR — 2026</span></div><div className="auth-form-wrap"><div className="auth-form-head"><div className="eyebrow">{mode === 'signup' ? 'Bienvenue chez FOCUS' : 'Heureux de vous revoir'}</div><h1>{mode === 'signup' ? 'Créer un compte' : 'Se connecter'}</h1><p>{mode === 'signup' ? 'Commencez votre parcours d’apprentissage.' : 'Accédez à votre espace pédagogique.'}</p></div>{!backendConfigured && <Notice tone="warning">L’authentification n’est pas encore configurée. Renseignez les variables Supabase du fichier `.env.local` après avoir créé votre projet et appliqué les migrations.</Notice>}{error && <Notice tone="error">{error}</Notice>}{message && <Notice tone="success">{message}</Notice>}<form className="auth-form" onSubmit={(event) => void submit(event)}>
      {mode === 'signup' && <label className="field-label">Nom complet<input autoComplete="name" required minLength={2} maxLength={120} value={fullName} onChange={(event) => setFullName(event.target.value)} disabled={!backendConfigured} /></label>}
      <label className="field-label">Adresse e-mail<span className="input-icon"><Mail size={16} /><input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={!backendConfigured} /></span></label>
      <label className="field-label">Mot de passe<span className="input-icon"><LockKeyhole size={16} /><input type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} disabled={!backendConfigured} /></span>{mode === 'signup' && <small>8 caractères minimum. Choisissez un mot de passe unique.</small>}</label>
      <button className="button button-dark auth-submit" disabled={!backendConfigured || busy}>{busy ? 'Veuillez patienter…' : mode === 'signup' ? 'Créer mon compte' : 'Connexion'} <ArrowRight size={16} /></button>
    </form><div className="auth-switch">{mode === 'signup' ? <>Déjà inscrit·e ? <Link to="/connexion">Se connecter</Link></> : <>Pas encore de compte ? <Link to="/inscription">Créer un compte</Link></>}</div><p className="auth-privacy"><ShieldCheck size={14} /> Vos données pédagogiques sont privées et protégées par les règles d’accès de la plateforme.</p></div></section>
}

export function DashboardPage() {
  const { user, profile, loading, profileError, refreshProfile } = useAuth()
  const [enrollmentCount, setEnrollmentCount] = useState(0)
  const [submissionCount, setSubmissionCount] = useState(0)
  const [sessionCount, setSessionCount] = useState(0)
  const [associatedStudents, setAssociatedStudents] = useState<{ id: string; full_name: string }[]>([])
  const [courses, setCourses] = useState<{ id: string; title: string; slug: string; status: string }[]>([])
  const [dashboardError, setDashboardError] = useState('')
  const [dataLoading, setDataLoading] = useState(false)

  const load = useCallback(async () => {
    if (!supabase || !user || !profile) return
    setDataLoading(true); setDashboardError('')
    if (profile.role === 'student') {
      const [{ count: enrollments, error: enrollmentError }, { count: submissions, error: submissionError }] = await Promise.all([
        supabase.from('enrollments').select('id', { count: 'exact', head: true }).eq('student_id', user.id),
        supabase.from('submissions').select('id', { count: 'exact', head: true }).eq('student_id', user.id),
      ])
      if (enrollmentError || submissionError) setDashboardError((enrollmentError || submissionError)?.message ?? '')
      setEnrollmentCount(enrollments ?? 0); setSubmissionCount(submissions ?? 0)
    } else if (profile.role === 'guardian') {
      const { data, error } = await supabase.from('guardian_student_links').select('student_id, profiles!guardian_student_links_student_id_fkey(id,full_name)').eq('guardian_id', user.id)
      if (error) setDashboardError(error.message)
      else setAssociatedStudents((data ?? []).map((link: any) => link.profiles).filter(Boolean))
    }
    if (profile.role === 'admin' || profile.role === 'instructor') {
      const { data, error } = await supabase.from('courses').select('id,title,slug,status').order('created_at', { ascending: false }).limit(8)
      if (error) setDashboardError(error.message)
      else setCourses((data ?? []) as typeof courses)
      const { count } = await supabase.from('live_sessions').select('id', { count: 'exact', head: true }).gte('starts_at', new Date().toISOString())
      setSessionCount(count ?? 0)
    }
    setDataLoading(false)
  }, [user, profile])
  useEffect(() => { void load() }, [load])

  if (loading) return <section className="page-wrap"><LoadingState /></section>
  if (!backendConfigured) return <section className="page-wrap dashboard-unavailable"><div className="eyebrow">Espace personnel</div><h1>Votre apprentissage,<br /><em>au même endroit.</em></h1><Notice tone="warning">Le tableau de bord nécessite Supabase Auth et la base configurés. Aucun faux profil ou avancement local n’est créé.</Notice><Link to="/connexion" className="button button-dark">Se connecter <ArrowRight size={16} /></Link></section>
  if (!user) return <Navigate to="/connexion" replace />
  if (!profile) return <section className="page-wrap"><div className="eyebrow">Initialisation du profil</div><h1>Un instant…</h1><Notice tone="warning">{profileError || 'Votre profil authentifié est nécessaire pour ouvrir l’espace.'}</Notice><button className="button button-outline" onClick={() => void refreshProfile()}><RefreshCw size={15} /> Actualiser le profil</button></section>

  const role = profile.role as AppRole
  const name = profile.full_name || user.email?.split('@')[0] || 'apprenant'
  return <section className="page-wrap dashboard-page"><div className="dashboard-welcome"><div><div className="eyebrow"><span className="status-dot" /> {ROLE_LABELS[role]} · ESPACE FOCUS</div><h1>Bonjour, {name.split(' ')[0]}<span className="welcome-period">.</span></h1><p>{role === 'student' ? 'Prêt·e à faire avancer votre regard ?' : role === 'guardian' ? 'Voici les apprentissages des étudiants associés à votre compte.' : 'Voici votre espace de pilotage pédagogique.'}</p></div><div className="dashboard-date"><span>AUJOURD’HUI</span><strong>{new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date())}</strong></div></div>
    {dashboardError && <ErrorNotice message={dashboardError} retry={() => void load()} />}
    {dataLoading && <LoadingState label="Mise à jour de votre espace…" />}
    {role === 'student' && <><div className="stat-grid"><StatCard icon={<BookOpen />} value={String(enrollmentCount).padStart(2, '0')} label="Formations suivies" tone="olive" /><StatCard icon={<FileImage />} value={String(submissionCount).padStart(2, '0')} label="Travaux remis" tone="sand" /><StatCard icon={<Target />} value="—" label="Progression globale" tone="dark" /></div><div className="dashboard-content-grid"><div className="panel dashboard-main-panel"><SectionTitle kicker="Continuer" title="Mon apprentissage" action={<Link to="/formations" className="text-link">Catalogue <ArrowRight size={14} /></Link>} /><StudentEnrollments studentId={user.id} /></div><aside className="panel dashboard-side-panel"><div className="side-panel-icon"><Camera size={20} /></div><div className="eyebrow">Le labo FOCUS</div><h3>Une minute pour tester ?</h3><p>Explorez les compromis entre lumière, mouvement et profondeur de champ.</p><Link to="/simulateur" className="text-link">Ouvrir le simulateur <ArrowUpRight size={15} /></Link><div className="side-rule" /><Link to="/sessions" className="side-nav-row"><CalendarDays size={16} /> Mes sessions en direct <ArrowRight size={14} /></Link><Link to="/quiz" className="side-nav-row"><CircleHelp size={16} /> Quiz & évaluations <ArrowRight size={14} /></Link><Link to="/exercices" className="side-nav-row"><Target size={16} /> Exercices & remises <ArrowRight size={14} /></Link><Link to="/rapports" className="side-nav-row"><FileText size={16} /> Mon rapport pédagogique <ArrowRight size={14} /></Link><Link to="/certificats" className="side-nav-row"><Award size={16} /> Mes certificats <ArrowRight size={14} /></Link></aside></div></>}
    {role === 'guardian' && <div className="panel guardian-panel"><SectionTitle kicker="Suivi pédagogique" title="Étudiants associés" description="Vous ne voyez que les étudiants explicitement rattachés à votre compte." />{associatedStudents.length ? associatedStudents.map((student) => <GuardianStudentCard key={student.id} student={student} />) : <div className="empty-inline"><Users /><div><strong>Aucun étudiant associé</strong><p>Un administrateur FOCUS doit associer votre compte au profil de l’étudiant.</p></div></div>}<div className="guardian-actions"><Link to="/rapports" className="side-nav-row"><FileText size={16} /> Rapports des étudiants associés <ArrowRight size={14} /></Link><Link to="/certificats" className="side-nav-row"><Award size={16} /> Certificats associés <ArrowRight size={14} /></Link></div></div>}
    {(role === 'admin' || role === 'instructor') && <><div className="stat-grid"><StatCard icon={<BookOpen />} value={String(courses.length).padStart(2, '0')} label="Cours visibles" tone="olive" /><StatCard icon={<CalendarDays />} value={String(sessionCount).padStart(2, '0')} label="Sessions à venir" tone="sand" /><StatCard icon={<Users />} value="—" label="Apprenants" tone="dark" /></div><div className="manager-dashboard-grid"><div className="panel"><SectionTitle kicker="Gestion pédagogique" title="Formations" description="Les cours sont visibles selon les règles d’accès du serveur." action={<Link to="/formations" className="text-link">Voir le catalogue <ArrowRight size={14} /></Link>} />{courses.map((course) => <div className="manager-course-row" key={course.id}><div><strong>{course.title}</strong><small>{course.status === 'published' ? 'Publié' : 'Brouillon'}</small></div><Link to={`/cours/${course.slug}`} aria-label={`Gérer ${course.title}`}><ArrowUpRight size={16} /></Link></div>)}{!courses.length && <p className="muted">Aucune formation gérée pour le moment.</p>}<CourseCreateForm onCreated={() => void load()} /></div><div className="panel manager-aside"><div className="eyebrow">Prochaines étapes</div><h3>Complétez votre espace pédagogique</h3><p>Créez une formation, structurez ses modules, ajoutez des leçons puis publiez-la quand ses ressources sont prêtes.</p><Link to="/sessions" className="side-nav-row"><CalendarDays size={16} /> Gérer les sessions <ArrowRight size={14} /></Link><Link to="/quiz" className="side-nav-row"><CircleHelp size={16} /> Quiz & évaluations <ArrowRight size={14} /></Link><Link to="/exercices" className="side-nav-row"><Target size={16} /> Exercices & remises <ArrowRight size={14} /></Link><Link to="/groupes" className="side-nav-row"><Users size={16} /> Groupes d’apprenants <ArrowRight size={14} /></Link><Link to="/gestion-medias" className="side-nav-row"><Video size={16} /> Ressources & médias <ArrowRight size={14} /></Link><Link to="/certificats" className="side-nav-row"><Award size={16} /> Délivrance des certificats <ArrowRight size={14} /></Link><Link to="/aide" className="side-nav-row"><CircleHelp size={16} /> Guide de configuration <ArrowRight size={14} /></Link></div></div><SubmissionReviewQueue /></>}
  </section>
}

function StatCard({ icon, value, label, tone }: { icon: React.ReactNode; value: string; label: string; tone: string }) {
  return <article className={`stat-card stat-${tone}`}><div className="stat-icon">{icon}</div><strong>{value}</strong><span>{label}</span></article>
}

function StudentEnrollments({ studentId }: { studentId: string }) {
  const [items, setItems] = useState<{ course: Course; completed: number; total: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    const { data, error: enrollmentError } = await supabase.from('enrollments').select('id,course_id,courses(id,title,slug,description,level,status,certificate_passing_score,duration_minutes)').eq('student_id', studentId).order('enrolled_at', { ascending: false })
    if (enrollmentError) { setError(enrollmentError.message); setLoading(false); return }
    const enrollments = data ?? []
    const mapped = await Promise.all(enrollments.map(async (enrollment: any) => {
      const { data: modules } = await supabase!.from('course_modules').select('id,lessons(id,is_required)').eq('course_id', enrollment.course_id)
      const lessonRows = (modules ?? []).flatMap((module: any) => module.lessons ?? [])
      const requiredIds = lessonRows.filter((lesson: any) => lesson.is_required).map((lesson: any) => lesson.id)
      const { data: progress } = requiredIds.length ? await supabase!.from('lesson_progress').select('lesson_id').eq('student_id', studentId).in('lesson_id', requiredIds) : { data: [] }
      return { course: enrollment.courses as Course, completed: progress?.length ?? 0, total: requiredIds.length }
    }))
    setItems(mapped.filter((item) => item.course))
    setLoading(false)
  }, [studentId])
  useEffect(() => { void load() }, [load])
  if (loading) return <LoadingState label="Chargement de vos formations…" />
  if (error) return <ErrorNotice message={error} retry={() => void load()} />
  if (!items.length) return <div className="empty-inline"><BookOpen /><div><strong>Votre première formation vous attend.</strong><p>Parcourez le catalogue et inscrivez-vous à un cours publié.</p><Link to="/formations" className="text-link">Découvrir les cours <ArrowRight size={14} /></Link></div></div>
  return <div className="enrollment-list">{items.map(({ course, completed, total }) => <Link className="enrollment-row" key={course.id} to={`/cours/${course.slug}`}><div className="enrollment-art"><Aperture size={21} /></div><div className="enrollment-info"><strong>{course.title}</strong><span>{total ? `${completed} / ${total} leçons terminées` : 'Le contenu sera bientôt disponible'}</span><div className="progress-track"><span style={{ width: `${total ? Math.min(100, (completed / total) * 100) : 0}%` }} /></div></div><ArrowUpRight size={17} /></Link>)}</div>
}

function GuardianStudentCard({ student }: { student: { id: string; full_name: string } }) {
  const [summary, setSummary] = useState<{ courses: number; completed: number; submissions: number } | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!supabase) return
    void Promise.all([
      supabase.from('enrollments').select('id,status', { count: 'exact' }).eq('student_id', student.id),
      supabase.from('submissions').select('id', { count: 'exact', head: true }).eq('student_id', student.id),
    ]).then(([enrollments, submissions]) => {
      if (enrollments.error || submissions.error) { setError((enrollments.error || submissions.error)?.message ?? 'Erreur de lecture'); return }
      setSummary({ courses: enrollments.count ?? 0, completed: enrollments.data?.filter((item: any) => item.status === 'completed').length ?? 0, submissions: submissions.count ?? 0 })
    })
  }, [student.id])
  return <article className="guardian-student"><span className="avatar avatar-large">{student.full_name.slice(0, 1).toUpperCase()}</span><div className="guardian-student-info"><strong>{student.full_name}</strong><small>Profil associé à votre compte</small>{error ? <small className="error-text">{error}</small> : summary ? <p>{summary.courses} formations · {summary.completed} terminées · {summary.submissions} travaux remis</p> : <small>Chargement du suivi…</small>}</div><ShieldCheck size={18} className="guardian-secure" /></article>
}

function CourseCreateForm({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [level, setLevel] = useState<Course['level']>('beginner')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!supabase || !user) return
    setBusy(true); setError('')
    const slug = title.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const { error: insertError } = await supabase.from('courses').insert({ title: title.trim(), slug, description: description.trim(), level, status: 'draft', created_by: user.id })
    if (insertError) setError(insertError.message)
    else { setTitle(''); setDescription(''); onCreated() }
    setBusy(false)
  }
  return <details className="create-course"><summary><Plus size={15} /> Créer une formation</summary><form onSubmit={(event) => void submit(event)}><label className="field-label">Titre<input required maxLength={140} value={title} onChange={(event) => setTitle(event.target.value)} /></label><label className="field-label">Description<textarea rows={3} required maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} /></label><label className="field-label">Niveau<select value={level} onChange={(event) => setLevel(event.target.value as Course['level'])}><option value="beginner">Débutant</option><option value="intermediate">Intermédiaire</option><option value="advanced">Avancé</option></select></label>{error && <Notice tone="error">{error}</Notice>}<button className="button button-dark button-small" disabled={busy}>{busy ? 'Création…' : 'Créer en brouillon'} <ArrowRight size={14} /></button></form></details>
}

function SubmissionReviewQueue() {
  const { user } = useAuth()
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Record<string, string>>({})
  const [grades, setGrades] = useState<Record<string, string>>({})
  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true); setError('')
    const { data, error: resultError } = await supabase.from('submissions').select('id,file_name,status,grade,feedback,submitted_at,object_path,exercises(title,course_id),profiles!submissions_student_id_fkey(full_name)').order('submitted_at', { ascending: false }).limit(30)
    if (resultError) setError(resultError.message)
    else setSubmissions(data ?? [])
    setLoading(false)
  }, [])
  useEffect(() => { void load() }, [load])
  async function openSubmission(path: string) {
    if (!supabase) return
    const { data, error: signedError } = await supabase.storage.from('student-work').createSignedUrl(path, 60)
    if (signedError) setError(signedError.message)
    else if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }
  async function review(submission: any) {
    if (!supabase || !user) return
    const rawGrade = grades[submission.id] ?? (submission.grade == null ? '' : String(submission.grade))
    const grade = rawGrade === '' ? null : Number(rawGrade)
    if (grade !== null && (!Number.isFinite(grade) || grade < 0 || grade > 100)) { setError('La note doit être comprise entre 0 et 100.'); return }
    setBusyId(submission.id); setError('')
    const { error: updateError } = await supabase.from('submissions').update({ status: 'reviewed', grade, feedback: (feedback[submission.id] ?? submission.feedback ?? '').trim(), reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq('id', submission.id)
    if (updateError) setError(updateError.message)
    else await load()
    setBusyId(null)
  }
  return <section className="panel review-queue"><SectionTitle kicker="Retours pédagogiques" title="Travaux à corriger" description="Les règles RLS limitent cette liste aux formations que vous gérez." />{loading ? <LoadingState label="Chargement des remises…" /> : error ? <ErrorNotice message={error} retry={() => void load()} /> : !submissions.length ? <div className="empty-inline"><FileImage /><div><strong>Aucune remise visible</strong><p>Les travaux remis pour vos cours apparaîtront ici.</p></div></div> : <div className="review-list">{submissions.map((submission) => <article className="review-card" key={submission.id}><div className="review-card-top"><div className="review-file-icon"><FileImage size={18} /></div><div><strong>{submission.file_name}</strong><small>{submission.profiles?.full_name || 'Étudiant'} · {submission.exercises?.title || 'Exercice'} · {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(submission.submitted_at))}</small></div><button className="button button-outline button-small" onClick={() => void openSubmission(submission.object_path)}><Download size={14} /> Ouvrir</button></div><div className="review-fields"><label className="field-label">Note / 100<input type="number" min="0" max="100" step="0.5" value={grades[submission.id] ?? (submission.grade == null ? '' : String(submission.grade))} onChange={(event) => setGrades((current) => ({ ...current, [submission.id]: event.target.value }))} /></label><label className="field-label">Commentaire du formateur<textarea rows={2} maxLength={6000} value={feedback[submission.id] ?? submission.feedback ?? ''} onChange={(event) => setFeedback((current) => ({ ...current, [submission.id]: event.target.value }))} /></label><button className="button button-dark button-small" onClick={() => void review(submission)} disabled={busyId === submission.id}>{busyId === submission.id ? 'Enregistrement…' : 'Enregistrer le retour'} <Check size={14} /></button></div></article>)}</div>}</section>
}

export function SessionsPage() {
  const { profile } = useAuth()
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [meetingUrl, setMeetingUrl] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const canManage = profile?.role === 'admin' || profile?.role === 'instructor'
  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); return }
    setLoading(true); setError('')
    const { data, error: loadError } = await supabase.from('live_sessions').select('id,title,description,starts_at,ends_at,meeting_url,course_id,profiles!live_sessions_instructor_id_fkey(full_name),courses(title)').gte('starts_at', new Date(Date.now() - 86400000).toISOString()).order('starts_at').limit(30)
    if (loadError) setError(loadError.message)
    else setSessions(data ?? [])
    setLoading(false)
  }, [])
  useEffect(() => { void load() }, [load])
  async function createSession(event: FormEvent) {
    event.preventDefault(); if (!supabase) return
    setSaving(true); setFormMessage('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !startsAt || new Date(startsAt) <= new Date()) { setFormMessage('Choisissez une date future et un compte formateur valide.'); setSaving(false); return }
    const { error: createError } = await supabase.from('live_sessions').insert({ title: title.trim(), starts_at: new Date(startsAt).toISOString(), meeting_url: meetingUrl.trim() || null, instructor_id: user.id })
    if (createError) setFormMessage(createError.message)
    else { setTitle(''); setStartsAt(''); setMeetingUrl(''); setFormMessage('Session créée.'); await load() }
    setSaving(false)
  }
  return <section className="page-wrap sessions-page"><div className="page-heading-row"><div><div className="eyebrow"><span className="status-dot" /> Rendez-vous pédagogiques</div><h1>Sessions en direct</h1><p className="lead">Retrouvez les prochains temps d’échange et de pratique avec les formateurs.</p></div><div className="session-heading-icon"><CalendarDays size={38} /></div></div>
    {canManage && backendConfigured && <details className="manager-panel session-manager"><summary><span><Plus size={17} /> Planifier une session</span><ChevronDown size={16} /></summary><form className="session-form" onSubmit={(event) => void createSession(event)}><label className="field-label">Titre<input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} /></label><label className="field-label">Date et heure<input required type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></label><label className="field-label">Lien de participation (facultatif)<input type="url" value={meetingUrl} onChange={(event) => setMeetingUrl(event.target.value)} placeholder="À ajouter lorsque le fournisseur est configuré" /></label><button className="button button-dark button-small" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer la session'}</button>{formMessage && <Notice tone={formMessage === 'Session créée.' ? 'success' : 'error'}>{formMessage}</Notice>}</form></details>}
    {loading ? <LoadingState label="Chargement des sessions…" /> : error ? <ErrorNotice message={error} retry={() => void load()} /> : !backendConfigured ? <div className="empty-state large-empty"><div className="empty-icon"><Video /></div><span className="eyebrow">Aucune visioconférence simulée</span><h2>Les sessions apparaîtront<br />une fois planifiées.</h2><p>FOCUS ne lance pas de fausse visioconférence. Un lien de participation est affiché uniquement après sa configuration par un formateur.</p><Link to="/aide" className="text-link">À propos de la configuration <ArrowUpRight size={15} /></Link></div> : sessions.length ? <div className="session-list">{sessions.map((session) => { const start = new Date(session.starts_at); const meeting = validWebUrl(session.meeting_url); return <article className="session-card" key={session.id}><div className="session-date"><strong>{new Intl.DateTimeFormat('fr-FR', { day: '2-digit' }).format(start)}</strong><span>{new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(start).replace('.', '').toUpperCase()}</span></div><div className="session-info"><div className="eyebrow">{session.courses?.title || 'FOCUS Academy'} · SESSION EN DIRECT</div><h2>{session.title}</h2><p><Clock3 size={15} /> {new Intl.DateTimeFormat('fr-FR', { weekday: 'long', hour: '2-digit', minute: '2-digit' }).format(start)} <span>·</span> {session.profiles?.full_name || 'Équipe pédagogique'}</p>{session.description && <p className="session-description">{session.description}</p>}</div><div className="session-action">{meeting ? <a className="button button-dark button-small" href={meeting} target="_blank" rel="noreferrer">Rejoindre <ExternalLink size={14} /></a> : <span className="session-pending"><span className="status-dot" /> Lien à venir</span>}</div></article> })}</div> : <div className="empty-state"><CalendarDays /><h2>Aucune session planifiée</h2><p>Les rendez-vous à venir apparaîtront ici lorsqu’ils seront publiés.</p></div>}
  </section>
}

interface ReportEnrollment {
  id: string
  course_id: string
  status: string
  courses: { id: string; title: string; slug: string } | null
}

export function ReportsPage() {
  const { user, profile } = useAuth()
  const [students, setStudents] = useState<{ id: string; full_name: string }[]>([])
  const [studentId, setStudentId] = useState('')
  const [studentName, setStudentName] = useState('')
  const [enrollments, setEnrollments] = useState<ReportEnrollment[]>([])
  const [progressCount, setProgressCount] = useState(0)
  const [lessonCount, setLessonCount] = useState(0)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const canView = profile?.role === 'student' || profile?.role === 'guardian'

  const load = useCallback(async (targetId?: string) => {
    if (!supabase || !user || !profile || !canView) { setLoading(false); return }
    setLoading(true); setError('')
    let target = targetId || (profile.role === 'student' ? user.id : studentId)
    let name = profile.role === 'student' ? profile.full_name : ''
    if (profile.role === 'guardian') {
      const { data: links, error: linksError } = await supabase.from('guardian_student_links').select('student_id,profiles!guardian_student_links_student_id_fkey(id,full_name)').eq('guardian_id', user.id)
      if (linksError) { setError(linksError.message); setLoading(false); return }
      const associated = (links ?? []).map((link: any) => link.profiles).filter(Boolean) as { id: string; full_name: string }[]
      setStudents(associated)
      if (!target || !associated.some((item) => item.id === target)) target = associated[0]?.id ?? ''
      name = associated.find((item) => item.id === target)?.full_name ?? ''
      if (target) setStudentId(target)
    }
    if (!target) { setEnrollments([]); setSubmissions([]); setProgressCount(0); setLessonCount(0); setLoading(false); return }
    const [{ data: enrollmentData, error: enrollmentError }, { data: progressData, error: progressError }, { data: submissionData, error: submissionError }] = await Promise.all([
      supabase.from('enrollments').select('id,course_id,status,courses(id,title,slug)').eq('student_id', target).order('enrolled_at', { ascending: true }),
      supabase.from('lesson_progress').select('lesson_id').eq('student_id', target),
      supabase.from('submissions').select('id,file_name,status,grade,feedback,submitted_at,exercises(title)').eq('student_id', target).order('submitted_at', { ascending: false }),
    ])
    const resultError = enrollmentError || progressError || submissionError
    if (resultError) { setError(resultError.message); setLoading(false); return }
    const currentEnrollments = (enrollmentData ?? []) as unknown as ReportEnrollment[]
    const moduleResults = await Promise.all(currentEnrollments.map((enrollment) => supabase!.from('course_modules').select('id,lessons(id,is_required)').eq('course_id', enrollment.course_id)))
    let total = 0
    for (const result of moduleResults) total += (result.data ?? []).flatMap((module: any) => module.lessons ?? []).filter((lesson: any) => lesson.is_required).length
    setEnrollments(currentEnrollments)
    setProgressCount(progressData?.length ?? 0)
    setLessonCount(total)
    setSubmissions(submissionData ?? [])
    setStudentName(name)
    setLoading(false)
  }, [user, profile, canView, studentId])

  useEffect(() => { void load() }, [load])
  if (!backendConfigured) return <section className="page-wrap"><div className="eyebrow">Rapport pédagogique</div><h1>Un bilan fondé sur vos données.</h1><Notice tone="warning">La génération de rapports nécessite Supabase et un compte étudiant ou parent configuré. Aucun résultat fictif n’est affiché.</Notice></section>
  if (!user) return <Navigate to="/connexion" replace />
  if (!canView) return <section className="page-wrap"><Notice tone="error">Ce rapport est disponible uniquement pour l’étudiant concerné et ses tuteurs explicitement associés.</Notice></section>
  const progressPercent = lessonCount ? Math.round(Math.min(100, progressCount / lessonCount * 100)) : 0
  const pendingCourses = enrollments.filter((item) => item.status !== 'completed')
  return <section className="page-wrap report-page"><div className="report-page-heading no-print"><div><div className="eyebrow">Bilan individuel · données protégées</div><h1>Rapport pédagogique</h1><p className="lead">Un aperçu construit à partir des formations, de la progression et des retours enregistrés.</p></div><button className="button button-dark" onClick={() => window.print()} disabled={loading || !enrollments.length}><Download size={16} /> Enregistrer en PDF</button></div>{profile.role === 'guardian' && <label className="field-label report-student-select no-print">Étudiant associé<select value={studentId} onChange={(event) => { setStudentId(event.target.value); void load(event.target.value) }}>{students.map((student) => <option value={student.id} key={student.id}>{student.full_name}</option>)}</select></label>}{loading ? <LoadingState label="Construction du rapport avec les données autorisées…" /> : error ? <ErrorNotice message={error} retry={() => void load()} /> : !enrollments.length ? <div className="empty-state no-print"><FileText /><h2>Aucune donnée de formation</h2><p>Un rapport sera disponible après inscription à une formation.</p></div> : <article className="report-document"><header className="report-document-header"><div className="report-brand"><Aperture size={21} /> FOCUS ACADEMY</div><span>RAPPORT DE PROGRESSION</span></header><div className="report-student"><div><small>APPRENANT·E</small><h2>{studentName || profile.full_name}</h2></div><div><small>GÉNÉRÉ LE</small><strong>{new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date())}</strong></div></div><div className="report-summary"><div><span>FORMATIONS SUIVIES</span><strong>{enrollments.length}</strong></div><div><span>LEÇONS OBLIGATOIRES TERMINÉES</span><strong>{progressCount} / {lessonCount}</strong></div><div><span>PROGRESSION OBSERVÉE</span><strong>{progressPercent}%</strong></div><div><span>TRAVAUX REMIS</span><strong>{submissions.length}</strong></div></div><section className="report-section"><h3>Parcours de formation</h3>{enrollments.map((item) => <div className="report-course-row" key={item.id}><span className={`report-status-dot status-${item.status}`} /><div><strong>{item.courses?.title || 'Formation'}</strong><small>{item.status === 'completed' ? 'Formation terminée' : 'En cours'}</small></div><span>{item.status === 'completed' ? 'Terminée' : 'En cours'}</span></div>)}</section><section className="report-section"><h3>Évaluations et retours formateur</h3>{submissions.filter((item) => item.status === 'reviewed').length ? submissions.filter((item) => item.status === 'reviewed').map((item) => <div className="report-feedback" key={item.id}><div><strong>{item.exercises?.title || item.file_name}</strong><span>{item.grade == null ? 'Note non renseignée' : `${item.grade} / 100`}</span></div><p>{item.feedback || 'Aucun commentaire rédigé pour cette remise.'}</p></div>) : <p className="report-empty-note">Aucun retour évalué n’est encore enregistré.</p>}</section><section className="report-section"><h3>Recommandations de progression</h3>{pendingCourses.length ? <p>Continuer les formations en cours et valider les leçons obligatoires afin de compléter le parcours.</p> : <p>Les formations actuellement suivies sont marquées comme terminées. Consultez les certificats délivrés pour les parcours éligibles.</p>}</section><div className="guardian-observation"><div><strong>Observations du parent / tuteur</strong><span>À compléter lors d’un échange pédagogique.</span></div><div className="signature-line"><span>Signature</span><span>Date</span></div></div><footer className="report-document-footer">Document de suivi pédagogique privé · généré depuis les données autorisées de FOCUS Academy</footer></article>}</section>
}

export function CertificatesPage() {
  const { user, profile } = useAuth()
  const [certificates, setCertificates] = useState<any[]>([])
  const [eligible, setEligible] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [issuing, setIssuing] = useState<string | null>(null)
  const canIssue = profile?.role === 'admin' || profile?.role === 'instructor'
  const canView = profile?.role === 'student' || profile?.role === 'guardian' || canIssue
  const load = useCallback(async () => {
    if (!supabase || !user || !canView) { setLoading(false); return }
    setLoading(true); setError('')
    const [{ data: certificateData, error: certError }, { data: enrollmentData, error: enrollmentError }] = await Promise.all([
      supabase.from('certificates').select('id,certificate_code,status,score,issued_at,enrollments(id,student_id,course_id,courses(title),profiles(full_name))').order('issued_at', { ascending: false }),
      canIssue ? supabase.from('enrollments').select('id,student_id,course_id,status,courses(title),profiles(full_name)').eq('status', 'completed').order('completed_at', { ascending: false }) : Promise.resolve({ data: [], error: null }),
    ])
    if (certError || enrollmentError) setError((certError || enrollmentError)?.message ?? '')
    else {
      setCertificates(certificateData ?? [])
      const existingEnrollmentIds = new Set((certificateData ?? []).map((item: any) => item.enrollments?.id))
      setEligible((enrollmentData ?? []).filter((item: any) => !existingEnrollmentIds.has(item.id)))
    }
    setLoading(false)
  }, [user, canView, canIssue])
  useEffect(() => { void load() }, [load])
  async function issue(enrollmentId: string) {
    if (!supabase) return
    setIssuing(enrollmentId); setError('')
    const { error: issueError } = await supabase.rpc('issue_certificate', { p_enrollment_id: enrollmentId })
    if (issueError) setError(issueError.message)
    else await load()
    setIssuing(null)
  }
  if (!backendConfigured) return <section className="page-wrap"><div className="eyebrow">Certificats vérifiables</div><h1>Une réussite qui se vérifie.</h1><Notice tone="warning">Les certificats dépendent des conditions de réussite stockées côté serveur. Aucun certificat fictif ou validé n’est affiché.</Notice></section>
  if (!user) return <Navigate to="/connexion" replace />
  if (!canView) return <section className="page-wrap"><Notice tone="error">Accès non autorisé à cet espace de certificats.</Notice></section>
  return <section className="page-wrap certificate-page"><div className="page-heading-row"><div><div className="eyebrow"><BadgeCheck size={15} /> Parcours reconnus</div><h1>Certificats</h1><p className="lead">Chaque référence est vérifiée côté serveur et peut être révoquée par un administrateur.</p></div><div className="certificate-heading-mark"><Award size={35} /></div></div>{error && <Notice tone="error">{error}</Notice>}{loading ? <LoadingState label="Chargement des certificats…" /> : <>{certificates.length ? <div className="certificate-list">{certificates.map((item) => { const enrollment = item.enrollments; const active = item.status === 'issued'; return <article className={`certificate-card ${active ? '' : 'certificate-revoked'}`} key={item.id}><div className="certificate-card-mark"><Award size={23} /></div><div className="certificate-card-info"><div className="eyebrow">{active ? 'CERTIFICAT DÉLIVRÉ' : 'CERTIFICAT RÉVOQUÉ'}</div><h2>{enrollment?.courses?.title || 'Formation FOCUS'}</h2><p>{enrollment?.profiles?.full_name || 'Étudiant'} · {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(item.issued_at))}</p><code>{item.certificate_code}</code></div><div className="certificate-card-actions"><Link className="button button-outline button-small" to={`/verifier/${item.certificate_code}`}>Vérifier <ShieldCheck size={14} /></Link>{active && <button className="icon-button" title="Imprimer le certificat" onClick={() => window.print()}><Download size={16} /></button>}</div></article> })}</div> : <div className="empty-state"><Award /><h2>Aucun certificat délivré</h2><p>Ils apparaîtront après validation des conditions de réussite par l’équipe pédagogique.</p></div>}{canIssue && <section className="panel certificate-issue-panel"><SectionTitle kicker="Gestionnaire pédagogique" title="Délivrance contrôlée" description="Le serveur re-vérifie l’achèvement et les seuils de réussite avant toute délivrance." />{eligible.length ? eligible.map((item) => <div className="eligible-enrollment" key={item.id}><div><strong>{item.profiles?.full_name || 'Étudiant'}</strong><small>{item.courses?.title || 'Formation terminée'}</small></div><button className="button button-dark button-small" onClick={() => void issue(item.id)} disabled={issuing === item.id}>{issuing === item.id ? 'Vérification…' : 'Vérifier et délivrer'} <Award size={14} /></button></div>) : <p className="muted">Aucune inscription terminée en attente de certificat.</p>}</section>}</>}</section>
}

function validWebUrl(value: string | null | undefined) {
  if (!value) return null
  try { const parsed = new URL(value); return ['https:', 'http:'].includes(parsed.protocol) ? parsed.href : null } catch { return null }
}

export function LessonPage() {
  const { lessonId } = useParams()
  const { user, profile } = useAuth()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [course, setCourse] = useState<{ id: string; title: string; slug: string } | null>(null)
  const [resources, setResources] = useState<LearningResource[]>([])
  const [exercises, setExercises] = useState<LearningExercise[]>([])
  const [completed, setCompleted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const isManager = profile?.role === 'admin' || profile?.role === 'instructor'
  const load = useCallback(async () => {
    if (!supabase || !lessonId) { setLoading(false); return }
    setLoading(true); setError('')
    const { data: lessonData, error: lessonError } = await supabase.from('lessons').select('id,module_id,title,content,position,duration_minutes,is_required,video_url').eq('id', lessonId).maybeSingle()
    if (lessonError || !lessonData) { setError(lessonError?.message || 'Leçon indisponible.'); setLoading(false); return }
    setLesson(lessonData as Lesson)
    const { data: moduleData, error: moduleError } = await supabase.from('course_modules').select('course_id,courses(id,title,slug)').eq('id', lessonData.module_id).maybeSingle()
    if (moduleError) { setError(moduleError.message); setLoading(false); return }
    const courseData = (moduleData as any)?.courses
    if (!courseData) { setError('Formation associée introuvable.'); setLoading(false); return }
    setCourse(courseData)
    const [{ data: resourceData }, { data: exerciseData }] = await Promise.all([
      supabase.from('learning_resources').select('id,lesson_id,title,kind,external_url,object_path').eq('lesson_id', lessonId).order('created_at'),
      supabase.from('exercises').select('id,lesson_id,course_id,title,instructions,allowed_mime_types,max_file_size_bytes').eq('lesson_id', lessonId).order('created_at'),
    ])
    setResources((resourceData ?? []) as LearningResource[])
    setExercises((exerciseData ?? []) as LearningExercise[])
    if (user) {
      const { data: progress } = await supabase.from('lesson_progress').select('lesson_id').eq('student_id', user.id).eq('lesson_id', lessonId).maybeSingle()
      setCompleted(Boolean(progress))
    }
    setLoading(false)
  }, [lessonId, user])
  useEffect(() => { void load() }, [load])

  async function markComplete() {
    if (!supabase || !user) return
    setBusy(true); setActionMessage('')
    const { error: completeError } = await supabase.rpc('complete_lesson', { p_lesson_id: lessonId })
    if (completeError) setActionMessage(completeError.message)
    else { setCompleted(true); setActionMessage('Progression enregistrée dans votre compte.') }
    setBusy(false)
  }

  if (loading) return <section className="page-wrap"><LoadingState label="Chargement de la leçon…" /></section>
  if (error) return <section className="page-wrap"><ErrorNotice message={error} retry={() => void load()} /><Link to="/formations" className="text-link">Retour au catalogue</Link></section>
  if (!backendConfigured || !lesson || !course) return <section className="page-wrap"><Notice>Les leçons sont chargées depuis Supabase. Aucun contenu pédagogique fictif n’est affiché.</Notice></section>
  return <section className="page-wrap lesson-page"><Link to={`/cours/${course.slug}`} className="back-link"><ArrowLeft size={15} /> {course.title}</Link><div className="lesson-layout"><article className="lesson-main"><div className="eyebrow">LEÇON {String(lesson.position).padStart(2, '0')} · {course.title}</div><h1>{lesson.title}</h1><div className="lesson-meta"><span><Clock3 size={14} /> {lesson.duration_minutes ? `${lesson.duration_minutes} min` : 'À votre rythme'}</span>{lesson.is_required && <span className="required-tag">Leçon obligatoire</span>}</div>{lesson.video_url && <SafeVideoLink url={lesson.video_url} />}{lesson.content ? <div className="lesson-copy">{lesson.content.split('\n').filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div> : <div className="empty-content"><FileText /><p>Le contenu de cette leçon n’a pas encore été ajouté.</p>{isManager && <p>Vous pouvez le compléter depuis la gestion du programme.</p>}</div>}{resources.length > 0 && <section className="lesson-resources"><h2>Ressources pédagogiques</h2>{resources.map((resource) => <ResourceLink key={resource.id} resource={resource} />)}</section>}{exercises.map((exercise) => <SubmissionForm exercise={exercise} key={exercise.id} />)}{user && profile?.role === 'student' && <div className="lesson-complete-box"><div><div className="eyebrow">Votre progression</div><strong>{completed ? 'Leçon terminée' : 'Vous avez terminé cette leçon ?'}</strong><p>{completed ? 'Cette étape est enregistrée dans votre compte.' : 'Marquez-la comme terminée pour retrouver votre avancement sur vos autres appareils.'}</p></div><button className={`button ${completed ? 'button-complete' : 'button-dark'}`} onClick={() => void markComplete()} disabled={busy || completed}>{busy ? 'Enregistrement…' : completed ? <><CheckCircle2 size={17} /> Terminé</> : <>Marquer comme terminé <Check size={16} /></>}</button>{actionMessage && !completed && <Notice tone="error">{actionMessage}</Notice>}</div>}{!user && <Notice>Connectez-vous comme étudiant pour enregistrer votre progression.</Notice>}</article><aside className="lesson-sidebar"><div className="lesson-sidebar-sticky"><div className="eyebrow">Votre espace</div><h3>Apprendre en pratiquant.</h3><p>Faites l’exercice photo, remettez votre travail et recevez un retour de votre formateur.</p><Link to="/simulateur" className="side-nav-row"><Camera size={16} /> Simulateur photo <ArrowRight size={14} /></Link><Link to="/sessions" className="side-nav-row"><CalendarDays size={16} /> Sessions en direct <ArrowRight size={14} /></Link><div className="private-note"><ShieldCheck size={15} /> Vos remises sont privées et accessibles selon votre rôle.</div></div></aside></div></section>
}

function SafeVideoLink({ url }: { url: string }) {
  const safe = validWebUrl(url)
  if (!safe) return <Notice tone="warning">Le lien vidéo n’est pas une URL HTTP(S) valide.</Notice>
  return <div className="video-link-card"><div className="video-link-icon"><Play size={18} /></div><div><strong>Ressource vidéo externe</strong><p>La lecture dépend du fournisseur et de ses règles d’intégration.</p></div><a href={safe} target="_blank" rel="noreferrer" className="button button-outline button-small">Ouvrir le lien <ExternalLink size={13} /></a></div>
}

function ResourceLink({ resource }: { resource: LearningResource }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function open() {
    if (resource.external_url) { const url = validWebUrl(resource.external_url); if (url) window.open(url, '_blank', 'noopener,noreferrer'); else setError('Ce lien n’est pas une URL HTTP(S) valide.'); return }
    if (!supabase || !resource.object_path) return
    setBusy(true); setError('')
    const { data, error: signedError } = await supabase.storage.from('course-resources').createSignedUrl(resource.object_path, 60)
    if (signedError) setError(signedError.message)
    else if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    setBusy(false)
  }
  return <div className="resource-row"><span className="resource-icon">{resource.kind === 'pdf' ? <FileText size={17} /> : resource.kind === 'video' ? <Video size={17} /> : <ExternalLink size={17} />}</span><span>{resource.title}</span><button className="icon-button" onClick={() => void open()} aria-label={`Ouvrir ${resource.title}`} disabled={busy}>{resource.kind === 'pdf' || resource.object_path ? <Download size={16} /> : <ArrowUpRight size={16} />}</button>{error && <small className="error-text">{error}</small>}</div>
}

export function SubmissionForm({ exercise }: { exercise: LearningExercise }) {
  const { user, profile } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const isStudent = profile?.role === 'student'
  const load = useCallback(async () => {
    if (!supabase || !user || !isStudent) return
    const { data } = await supabase.from('submissions').select('id,file_name,status,grade,feedback,submitted_at').eq('exercise_id', exercise.id).eq('student_id', user.id).order('submitted_at', { ascending: false })
    setSubmissions(data ?? [])
  }, [exercise.id, user, isStudent])
  useEffect(() => { void load() }, [load])
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!file || !user || !supabase) return
    setBusy(true); setMessage('Téléversement sécurisé en cours…')
    let objectPath: string | null = null
    try {
      objectPath = await uploadSubmissionFile(user.id, exercise, file)
      const { error } = await supabase.from('submissions').insert({ exercise_id: exercise.id, student_id: user.id, object_path: objectPath, file_name: file.name, mime_type: file.type, file_size_bytes: file.size })
      if (error) {
        await supabase.storage.from('student-work').remove([objectPath])
        throw error
      }
      setFile(null); setMessage('Votre remise a été envoyée et enregistrée.'); await load()
    } catch (uploadError) {
      setMessage(uploadError instanceof Error ? uploadError.message : 'Le téléversement a échoué.')
    }
    setBusy(false)
  }
  return <section className="exercise-card"><div className="eyebrow"><Target size={14} /> Exercice pratique</div><h2>{exercise.title}</h2><p>{exercise.instructions}</p>{isStudent ? <form className="submission-form" onSubmit={(event) => void submit(event)}><label className="upload-zone"><UploadCloud size={22} /><span>{file ? file.name : 'Choisir une photo, une vidéo ou un projet autorisé'}</span><small>Maximum {Math.round(exercise.max_file_size_bytes / 1024 / 1024)} Mo · types autorisés vérifiés avant envoi</small><input type="file" accept={exercise.allowed_mime_types.join(',')} onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label><button className="button button-dark button-small" disabled={!file || busy}>{busy ? 'Envoi en cours…' : 'Envoyer ma remise'} <ArrowUpRight size={14} /></button>{message && <Notice tone={message.includes('enregistrée') ? 'success' : message.includes('cours') ? 'info' : 'error'}>{message}</Notice>}</form> : !user ? <Notice>Connectez-vous comme étudiant pour remettre un travail.</Notice> : <Notice>Seul un étudiant peut envoyer une remise. Les retours du formateur seront affichés au propriétaire du travail.</Notice>}{submissions.length > 0 && <div className="submission-history"><h3>Historique de vos remises</h3>{submissions.map((submission) => <div className="submission-history-row" key={submission.id}><FileText size={16} /><div><strong>{submission.file_name}</strong><small>{new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(submission.submitted_at))} · {submission.status === 'reviewed' ? 'Corrigé' : 'En attente'}</small>{submission.feedback && <p>{submission.feedback}</p>}</div><span>{submission.grade == null ? '—' : `${submission.grade}/100`}</span></div>)}</div>}</section>
}

export function SimulatorPage() {
  const { user, profile } = useAuth()
  const [input, setInput] = useState<ExposureInput>({ aperture: 5.6, shutterSeconds: 1 / 125, iso: 100 })
  const [selectedExercise, setSelectedExercise] = useState(CAMERA_EXERCISES[0].id)
  const [exerciseMessage, setExerciseMessage] = useState('')
  const [exercisePassed, setExercisePassed] = useState(false)
  const [savingExercise, setSavingExercise] = useState(false)
  const result = useMemo(() => calculateExposure(input), [input])
  const exercise = CAMERA_EXERCISES.find((item) => item.id === selectedExercise) ?? CAMERA_EXERCISES[0]
  const apertureSteps = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16]
  const apertureIndex = apertureSteps.indexOf(input.aperture)
  const evDisplay = `${result.compensationStops > 0 ? '+' : ''}${result.compensationStops.toFixed(1)} EV`
  const displayBrightness = Math.max(0.55, Math.min(1.5, 1 + result.compensationStops * 0.09))

  async function checkExercise() {
    const passed = exercise.check(input)
    setExercisePassed(passed)
    setExerciseMessage(passed ? exercise.correction : `Pas encore. ${exercise.goal}`)
    if (!passed || !user || profile?.role !== 'student' || !supabase) return
    setSavingExercise(true)
    const { data, error } = await supabase.rpc('record_simulator_attempt', {
      p_exercise_key: exercise.id,
      p_aperture: input.aperture,
      p_shutter_seconds: input.shutterSeconds,
      p_iso: input.iso,
    })
    if (error) setExerciseMessage(`${exercise.correction} Cette réussite n’a pas été enregistrée : ${error.message}`)
    else if (data) setExerciseMessage(`${exercise.correction} Réussite enregistrée dans votre compte.`)
    else { setExercisePassed(false); setExerciseMessage('Le serveur n’a pas validé les réglages : recommencez l’exercice.') }
    setSavingExercise(false)
  }

  return <section className="page-wrap simulator-page"><div className="page-heading-row"><div><div className="eyebrow"><Camera size={15} /> Le labo FOCUS</div><h1>Simulateur photo</h1><p className="lead">Modifie un réglage, observe les conséquences et comprends les compromis avant de déclencher.</p></div><div className="simulator-badge"><Aperture size={22} /><span>EXPÉRIENCE<br />INTERACTIVE</span></div></div><div className="simulator-workspace"><div className="simulator-preview-panel"><div className="preview-topline"><span><span className="record-dot" /> VISEUR PÉDAGOGIQUE</span><span>50 MM · APS-C · SUJET À 3 M</span></div><div className="simulator-scene" style={{ filter: `brightness(${displayBrightness})` }}><div className="scene-sun" /><div className="scene-backdrop" /><div className="scene-ground" /><div className="scene-subject"><div className="subject-head" /><div className="subject-body" /></div><div className="scene-grid"><span /><span /><span /><span /></div><div className="scene-focus">◎</div><div className="scene-meter"><span>−3</span><i><b style={{ left: `${Math.max(0, Math.min(100, 50 + result.compensationStops * 12.5))}%` }} /></i><span>+3</span></div><div className="scene-vignette" /></div><div className="preview-readout"><span>{describeExposure(result.compensationStops)}</span><strong>{evDisplay}</strong></div><p className="simulator-disclaimer">Aperçu graphique indicatif : ce rendu n’est pas une simulation physique du capteur, de l’objectif ni de la scène.</p></div>
      <div className="simulator-controls"><div className="controls-heading"><div><div className="eyebrow">Réglages manuels</div><h2>Compose ton exposition.</h2></div><button className="reset-button" onClick={() => { setInput({ aperture: 5.6, shutterSeconds: 1 / 125, iso: 100 }); setExercisePassed(false); setExerciseMessage('') }}><RefreshCw size={14} /> Réinitialiser</button></div>
        <ControlRow icon={<Aperture size={18} />} title="Ouverture" symbol="f/" value={input.aperture.toFixed(1)} detail={input.aperture <= 2.8 ? 'Grande ouverture · profondeur de champ réduite' : input.aperture >= 11 ? 'Petite ouverture · profondeur de champ étendue' : 'Ouverture intermédiaire'}><input aria-label="Ouverture du diaphragme" type="range" min="0" max={apertureSteps.length - 1} step="1" value={Math.max(0, apertureIndex)} onChange={(event) => setInput((previous) => ({ ...previous, aperture: apertureSteps[Number(event.target.value)] }))} /><div className="range-labels"><span>f/1.4</span><span>f/16</span></div></ControlRow>
        <ControlRow icon={<Clock3 size={18} />} title="Vitesse" symbol="" value={SHUTTER_OPTIONS.find((item) => item.value === input.shutterSeconds)?.label ?? '1/125 s'} detail={input.shutterSeconds <= 1 / 500 ? 'Vitesse rapide · mouvement mieux figé' : input.shutterSeconds >= 1 / 30 ? 'Vitesse lente · risque de flou de mouvement' : 'Vitesse intermédiaire'}><input aria-label="Vitesse d’obturation" type="range" min="0" max={SHUTTER_OPTIONS.length - 1} step="1" value={SHUTTER_OPTIONS.findIndex((item) => item.value === input.shutterSeconds)} onChange={(event) => setInput((previous) => ({ ...previous, shutterSeconds: SHUTTER_OPTIONS[Number(event.target.value)].value }))} /><div className="range-labels"><span>1/1000 s</span><span>1/15 s</span></div></ControlRow>
        <ControlRow icon={<Sparkles size={18} />} title="Sensibilité" symbol="ISO " value={String(input.iso)} detail={input.iso <= 400 ? 'Faible sensibilité · bruit généralement contenu' : input.iso >= 3200 ? 'Sensibilité élevée · bruit potentiellement visible' : 'Sensibilité modérée'}><input aria-label="Sensibilité ISO" type="range" min="0" max="7" step="1" value={[100, 200, 400, 800, 1600, 3200, 6400, 12800].indexOf(input.iso)} onChange={(event) => setInput((previous) => ({ ...previous, iso: [100, 200, 400, 800, 1600, 3200, 6400, 12800][Number(event.target.value)] }))} /><div className="range-labels"><span>ISO 100</span><span>ISO 12 800</span></div></ControlRow>
        <div className="result-grid"><ResultMeter label="Profondeur de champ" value={result.depthOfField.farMeters === Number.POSITIVE_INFINITY ? '∞' : `${(result.depthOfField.farMeters - result.depthOfField.nearMeters).toFixed(1)} m`} detail={`Netteté approx. ${result.depthOfField.nearMeters.toFixed(1)}–${result.depthOfField.farMeters === Number.POSITIVE_INFINITY ? '∞' : result.depthOfField.farMeters.toFixed(1)} m`} percent={Math.max(8, Math.min(100, (result.depthOfField.farMeters - result.depthOfField.nearMeters) * 9))} /><ResultMeter label="Flou de mouvement" value={`${Math.round(result.motionBlurPercent)}%`} detail={input.shutterSeconds <= 1 / 500 ? 'Mouvement mieux figé' : 'Dépend du mouvement réel'} percent={result.motionBlurPercent} /><ResultMeter label="Bruit numérique estimé" value={`${Math.round(result.noisePercent)}%`} detail={`ISO ${input.iso} · estimation relative`} percent={result.noisePercent} /></div>
      </div></div>
    <div className="simulator-theory"><div className="theory-heading"><div className="eyebrow">Comprendre les nombres</div><h2>Ce que le simulateur calcule.</h2></div><div className="theory-cards"><article><span>01</span><h3>Exposition</h3><p>EV100 = log₂(f² / t) − log₂(ISO / 100). Le simulateur compare ces réglages à une scène de référence fixée à EV 12.</p></article><article><span>02</span><h3>Profondeur de champ</h3><p>Approximation optique à 50 mm, mise au point à 3 m et cercle de confusion APS-C de 0,019 mm. La distance réelle et le capteur changent le résultat.</p></article><article><span>03</span><h3>Mouvement & bruit</h3><p>Indices pédagogiques normalisés par rapport à 1/125 s et ISO 100. Ils indiquent une tendance, pas une mesure de capteur ou une garantie d’image nette.</p></article></div></div>
    <div className="simulator-exercise panel"><div className="exercise-intro"><div className="exercise-icon"><Target size={19} /></div><div><div className="eyebrow">À toi de jouer</div><h2>Un défi, trois réglages.</h2><p>Choisis une situation, ajuste les paramètres et vérifie si ton intention est atteinte.</p></div></div><div className="exercise-controls"><label className="field-label">Choisir un exercice<select value={selectedExercise} onChange={(event) => { setSelectedExercise(event.target.value); setExerciseMessage(''); setExercisePassed(false) }}>{CAMERA_EXERCISES.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><div className="exercise-goal"><span className="eyebrow">Objectif</span><p>{exercise.goal}</p></div><button className="button button-dark" onClick={() => void checkExercise()} disabled={savingExercise}>{savingExercise ? 'Enregistrement…' : 'Vérifier mes réglages'} <ArrowRight size={15} /></button></div>{exerciseMessage && <Notice tone={exercisePassed ? 'success' : 'warning'}>{exerciseMessage}</Notice>}{exercisePassed && (!user || profile?.role !== 'student' || !backendConfigured) && <p className="not-saved-note">Réussite calculée dans cette session uniquement. Connectez-vous avec Supabase configuré pour l’enregistrer dans votre progression.</p>}</div>
    </section>
}

function ControlRow({ icon, title, symbol, value, detail, children }: { icon: React.ReactNode; title: string; symbol: string; value: string; detail: string; children: React.ReactNode }) {
  return <div className="control-row"><div className="control-label"><span className="control-icon">{icon}</span><span><strong>{title}</strong><small>{detail}</small></span><output>{symbol}{value}</output></div><div className="control-input">{children}</div></div>
}

function ResultMeter({ label, value, detail, percent }: { label: string; value: string; detail: string; percent: number }) {
  return <div className="result-meter"><div className="result-meter-head"><span>{label}</span><strong>{value}</strong></div><div className="meter-track"><span style={{ width: `${Math.max(3, Math.min(100, percent))}%` }} /></div><small>{detail}</small></div>
}

export function VerifyCertificatePage() {
  const { code } = useParams()
  const [certificate, setCertificate] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    async function verify() {
      if (!supabase || !code) { setLoading(false); return }
      const { data, error: verificationError } = await supabase.rpc('verify_certificate', { p_code: code })
      if (!active) return
      if (verificationError) setError(verificationError.message)
      else setCertificate(Array.isArray(data) ? data[0] ?? null : data)
      setLoading(false)
    }
    void verify()
    return () => { active = false }
  }, [code])
  if (loading) return <section className="page-wrap"><LoadingState label="Vérification côté serveur…" /></section>
  return <section className="page-wrap verify-page"><div className="certificate-verify-card"><div className="verify-seal"><Award size={33} /></div><div className="eyebrow">FOCUS ACADEMY · VÉRIFICATION</div>{!backendConfigured ? <><h1>Vérification non configurée</h1><p>Le service Supabase de vérification n’est pas connecté. Ce code n’est ni confirmé ni invalidé par cette page.</p><span className="verify-status verify-pending"><span className="status-dot" /> En attente de configuration</span></> : error ? <><h1>Vérification indisponible</h1><p>{error}</p><span className="verify-status verify-pending"><span className="status-dot" /> Service indisponible</span></> : certificate?.status === 'issued' ? <><h1>Certificat vérifié</h1><p>Cette référence correspond à un certificat délivré par FOCUS Academy.</p><div className="verified-details"><span>TITULAIRE<strong>{certificate.student_name}</strong></span><span>FORMATION<strong>{certificate.course_title}</strong></span><span>DÉLIVRÉ LE<strong>{new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(certificate.issued_at))}</strong></span></div><span className="verify-status verify-valid"><BadgeCheck size={17} /> Certificat délivré</span></> : certificate?.status === 'revoked' ? <><h1>Certificat révoqué</h1><p>Cette référence est enregistrée mais son certificat a été révoqué.</p><span className="verify-status verify-revoked"><XCircle size={16} /> Révoqué</span></> : <><h1>Référence introuvable</h1><p>Aucun certificat actif ne correspond à cette référence.</p><span className="verify-status verify-pending"><CircleHelp size={16} /> Non vérifié</span></>}<Link to="/" className="text-link">Retour à FOCUS Academy <ArrowUpRight size={15} /></Link></div></section>
}

export function NotFoundPage() {
  return <section className="page-wrap not-found"><span>404</span><div className="eyebrow">HORS CADRE</div><h1>Cette page n’est<br /><em>pas dans le viseur.</em></h1><p>Le lien est peut-être incorrect ou cette page n’existe plus.</p><Link to="/" className="button button-dark">Retour à l’accueil <ArrowRight size={15} /></Link></section>
}
