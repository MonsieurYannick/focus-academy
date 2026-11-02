import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { ArrowRight, BadgeCheck, Check, CheckCircle2, ChevronDown, CircleHelp, Plus, Target, UploadCloud, XCircle } from 'lucide-react'
import { backendConfigured, supabase } from '../lib/supabase'
import { useAuth } from '../state/auth'
import type { LearningExercise } from '../types'
import { ErrorNotice, LoadingState, Notice, SubmissionForm } from './pages'

interface QuizQuestion {
  id: string
  prompt: string
  options: string[]
  position: number
}

interface LearningQuiz {
  id: string
  title: string
  course_id: string
  passing_score: number
  courses?: { title: string; slug: string } | null
  quiz_questions: QuizQuestion[]
}

export function QuizzesPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const manager = profile?.role === 'admin' || profile?.role === 'instructor'
  const [quizzes, setQuizzes] = useState<LearningQuiz[]>([])
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quizTitle, setQuizTitle] = useState('')
  const [courseId, setCourseId] = useState('')
  const [passingScore, setPassingScore] = useState('70')
  const [questionQuizId, setQuestionQuizId] = useState('')
  const [prompt, setPrompt] = useState('')
  const [optionsText, setOptionsText] = useState('')
  const [correctOption, setCorrectOption] = useState('')
  const [explanation, setExplanation] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!supabase || !user || !profile) { setLoading(false); return }
    setLoading(true); setError('')
    const [{ data, error: quizError }, { data: courseData, error: courseError }] = await Promise.all([
      supabase.from('quizzes').select('id,title,course_id,passing_score,courses(title,slug),quiz_questions(id,prompt,options,position)').order('created_at', { ascending: false }),
      manager ? supabase.from('courses').select('id,title').order('title') : Promise.resolve({ data: [], error: null }),
    ])
    if (quizError || courseError) setError((quizError || courseError)?.message ?? '')
    else {
      setQuizzes((data ?? []) as unknown as LearningQuiz[])
      setCourses((courseData ?? []) as typeof courses)
      if (!courseId && courseData?.[0]) setCourseId(courseData[0].id)
      if (!questionQuizId && data?.[0]) setQuestionQuizId(data[0].id)
    }
    setLoading(false)
  }, [user, profile, manager, courseId, questionQuizId])
  useEffect(() => { void load() }, [load])

  async function createQuiz(event: FormEvent) {
    event.preventDefault()
    const threshold = Number(passingScore)
    if (!supabase || !courseId || !quizTitle.trim() || threshold < 0 || threshold > 100) return
    setSaving(true); setMessage('')
    const { data, error: createError } = await supabase.from('quizzes').insert({ course_id: courseId, title: quizTitle.trim(), passing_score: threshold }).select('id').single()
    if (createError) setMessage(createError.message)
    else { setQuizTitle(''); setQuestionQuizId(data.id); setMessage('Quiz créé. Ajoutez maintenant les questions et leurs corrections.'); await load() }
    setSaving(false)
  }

  async function createQuestion(event: FormEvent) {
    event.preventDefault()
    if (!supabase || !questionQuizId || !prompt.trim()) return
    const options = optionsText.split('\n').map((value) => value.trim()).filter(Boolean)
    if (options.length < 2 || options.length > 8 || !options.includes(correctOption)) {
      setMessage('Ajoutez 2 à 8 choix (un par ligne) et sélectionnez la bonne réponse parmi eux.')
      return
    }
    const quiz = quizzes.find((item) => item.id === questionQuizId)
    if (!quiz) return
    setSaving(true); setMessage('')
    const { data: question, error: questionError } = await supabase.from('quiz_questions').insert({ quiz_id: quiz.id, prompt: prompt.trim(), options, position: quiz.quiz_questions.length + 1 }).select('id').single()
    if (questionError) setMessage(questionError.message)
    else {
      const { error: keyError } = await supabase.from('quiz_answer_keys').insert({ question_id: question.id, correct_option: correctOption, explanation: explanation.trim() })
      if (keyError) {
        await supabase.from('quiz_questions').delete().eq('id', question.id)
        setMessage(keyError.message)
      } else { setPrompt(''); setOptionsText(''); setCorrectOption(''); setExplanation(''); setMessage('Question et correction enregistrées.'); await load() }
    }
    setSaving(false)
  }

  if (authLoading) return <section className="page-wrap"><LoadingState /></section>
  if (!backendConfigured) return <section className="page-wrap"><div className="eyebrow">Évaluations</div><h1>Quiz de formation</h1><Notice tone="warning">Les quiz utilisent des questions et corrections stockées côté serveur. Configurez Supabase pour charger ou enregistrer des tentatives.</Notice></section>
  if (!user) return <Navigate to="/connexion" replace />
  if (profile?.role === 'guardian') return <section className="page-wrap"><Notice>Les quiz sont réservés aux étudiants inscrits et à l’équipe pédagogique. Le suivi du parent apparaît dans son espace.</Notice></section>

  return <section className="page-wrap quiz-page"><div className="page-heading-row"><div><div className="eyebrow"><CircleHelp size={15} /> Vérifier ses acquis</div><h1>Quiz & évaluations</h1><p className="lead">Les réponses sont corrigées par une fonction PostgreSQL ; les bonnes réponses ne sont pas exposées avant l’envoi.</p></div><div className="certificate-heading-mark"><Target size={31} /></div></div>{error && <ErrorNotice message={error} retry={() => void load()} />}{manager && <details className="manager-panel quiz-manager"><summary><span><Plus size={17} /> Gérer les quiz et questions</span><ChevronDown size={16} /></summary><div className="quiz-manager-grid"><form onSubmit={(event) => void createQuiz(event)}><h2>Créer un quiz</h2><label className="field-label">Formation<select required value={courseId} onChange={(event) => setCourseId(event.target.value)}><option value="">Choisir une formation gérée</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label><label className="field-label">Titre<input required maxLength={160} value={quizTitle} onChange={(event) => setQuizTitle(event.target.value)} /></label><label className="field-label">Seuil de réussite (%)<input type="number" min="0" max="100" value={passingScore} onChange={(event) => setPassingScore(event.target.value)} /></label><button className="button button-dark button-small" disabled={saving || !courses.length}>Créer le quiz <Plus size={14} /></button></form><form onSubmit={(event) => void createQuestion(event)}><h2>Ajouter une question</h2><label className="field-label">Quiz<select required value={questionQuizId} onChange={(event) => setQuestionQuizId(event.target.value)}><option value="">Choisir un quiz</option>{quizzes.map((quiz) => <option key={quiz.id} value={quiz.id}>{quiz.title}</option>)}</select></label><label className="field-label">Question<textarea required rows={2} maxLength={2000} value={prompt} onChange={(event) => setPrompt(event.target.value)} /></label><label className="field-label">Choix de réponse (un par ligne)<textarea required rows={4} value={optionsText} onChange={(event) => setOptionsText(event.target.value)} /></label><label className="field-label">Bonne réponse<select required value={correctOption} onChange={(event) => setCorrectOption(event.target.value)}><option value="">Choisir le bon choix</option>{optionsText.split('\n').map((value) => value.trim()).filter(Boolean).map((value, index) => <option key={`${index}-${value}`} value={value}>{value}</option>)}</select></label><label className="field-label">Explication après correction<textarea rows={2} maxLength={2000} value={explanation} onChange={(event) => setExplanation(event.target.value)} /></label><button className="button button-dark button-small" disabled={saving || !questionQuizId}>Enregistrer la question <Check size={14} /></button></form></div>{message && <Notice tone={message.includes('créé') || message.includes('enregistrées') ? 'success' : 'error'}>{message}</Notice>}</details>}
    {loading ? <LoadingState label="Chargement des quiz…" /> : quizzes.length ? <div className="quiz-list">{quizzes.map((quiz) => <QuizAttemptCard quiz={quiz} key={quiz.id} />)}</div> : <div className="empty-state"><CircleHelp /><h2>Aucun quiz disponible</h2><p>Les quiz seront affichés après leur création et l’inscription à une formation.</p></div>}
  </section>
}

function QuizAttemptCard({ quiz }: { quiz: LearningQuiz }) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<{ score: number; passed: boolean; feedback: { question_id: string; correct: boolean; explanation: string }[] } | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const questions = [...quiz.quiz_questions].sort((a, b) => a.position - b.position)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    if (questions.some((question) => !answers[question.id])) { setError('Répondez à toutes les questions avant de valider.'); return }
    setBusy(true); setError('')
    const { data, error: submitError } = await supabase.rpc('submit_quiz_attempt', { p_quiz_id: quiz.id, p_answers: answers })
    if (submitError) setError(submitError.message)
    else {
      const row = Array.isArray(data) ? data[0] : data
      if (row) setResult({ score: Number(row.score), passed: Boolean(row.passed), feedback: Array.isArray(row.feedback) ? (row.feedback as { question_id: string; correct: boolean; explanation: string }[]) : [] })
      else setError('Le serveur n’a pas renvoyé le résultat de la tentative.')
    }
    setBusy(false)
  }
  return <article className="quiz-card"><div className="quiz-card-heading"><div><div className="eyebrow">{quiz.courses?.title || 'FOCUS Academy'} · SEUIL {quiz.passing_score}%</div><h2>{quiz.title}</h2></div><span className="quiz-question-count">{questions.length} questions</span></div>{!questions.length ? <p className="muted">Les questions ne sont pas encore disponibles.</p> : result ? <div className="quiz-result"><div className={`quiz-score ${result.passed ? 'quiz-passed' : 'quiz-failed'}`}><strong>{result.score}%</strong><span>{result.passed ? 'Seuil atteint' : 'À retravailler'}</span></div><div className="quiz-feedback-list">{result.feedback.map((item) => <div key={item.question_id} className="quiz-feedback-row"><span>{item.correct ? <CheckCircle2 size={16} /> : <XCircle size={16} />}</span><p>{item.explanation || (item.correct ? 'Réponse correcte.' : 'Reprenez cette notion et réessayez.')}</p></div>)}</div><button className="button button-outline button-small" onClick={() => { setAnswers({}); setResult(null); setError('') }}>Recommencer <BadgeCheck size={13} /></button></div> : <form className="quiz-form" onSubmit={(event) => void submit(event)}>{questions.map((question, index) => <fieldset className="quiz-question" key={question.id}><legend><span>{String(index + 1).padStart(2, '0')}</span>{question.prompt}</legend>{(Array.isArray(question.options) ? question.options : []).map((option) => <label className={`quiz-option ${answers[question.id] === option ? 'selected' : ''}`} key={option}><input type="radio" name={question.id} value={option} checked={answers[question.id] === option} onChange={() => setAnswers((current) => ({ ...current, [question.id]: option }))} /><span className="radio-mark" />{option}</label>)}</fieldset>)}{error && <Notice tone="error">{error}</Notice>}<button className="button button-dark button-small" disabled={busy}>{busy ? 'Correction côté serveur…' : 'Valider mes réponses'} <ArrowRight size={14} /></button></form>}</article>
}

export function ExercisesPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const manager = profile?.role === 'admin' || profile?.role === 'instructor'
  const [exercises, setExercises] = useState<(LearningExercise & { courses?: { title: string; slug: string } | null; lessons?: { title: string } | null })[]>([])
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [instructions, setInstructions] = useState('')
  const [courseId, setCourseId] = useState('')
  const [formats, setFormats] = useState(['image/jpeg', 'image/png', 'image/webp'])
  const [maxSize, setMaxSize] = useState('25')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const load = useCallback(async () => {
    if (!supabase || !user || !profile) { setLoading(false); return }
    setLoading(true); setError('')
    const [{ data, error: exerciseError }, { data: courseData, error: courseError }] = await Promise.all([
      supabase.from('exercises').select('id,lesson_id,course_id,title,instructions,allowed_mime_types,max_file_size_bytes,courses(title,slug),lessons(title)').order('created_at', { ascending: false }),
      manager ? supabase.from('courses').select('id,title').order('title') : Promise.resolve({ data: [], error: null }),
    ])
    if (exerciseError || courseError) setError((exerciseError || courseError)?.message ?? '')
    else {
      setExercises((data ?? []) as unknown as typeof exercises)
      setCourses((courseData ?? []) as typeof courses)
      if (!courseId && courseData?.[0]) setCourseId(courseData[0].id)
    }
    setLoading(false)
  }, [user, profile, manager, courseId])
  useEffect(() => { void load() }, [load])
  async function createExercise(event: FormEvent) {
    event.preventDefault()
    if (!supabase || !courseId || !title.trim() || !formats.length) return
    setSaving(true); setMessage('')
    const { error: createError } = await supabase.from('exercises').insert({ course_id: courseId, title: title.trim(), instructions: instructions.trim(), allowed_mime_types: formats, max_file_size_bytes: Number(maxSize) * 1024 * 1024 })
    if (createError) setMessage(createError.message)
    else { setTitle(''); setInstructions(''); setMessage('Exercice ajouté. Il est visible aux étudiants inscrits.'); await load() }
    setSaving(false)
  }
  function toggleFormat(format: string) {
    setFormats((current) => current.includes(format) ? current.filter((item) => item !== format) : [...current, format])
  }
  if (authLoading) return <section className="page-wrap"><LoadingState /></section>
  if (!backendConfigured) return <section className="page-wrap"><div className="eyebrow">Pratique guidée</div><h1>Exercices & remises</h1><Notice tone="warning">Les travaux exigent une inscription, un compte étudiant et un bucket privé configuré. Aucun fichier n’est stocké localement comme substitut.</Notice></section>
  if (!user) return <Navigate to="/connexion" replace />
  if (profile?.role === 'guardian') return <section className="page-wrap"><Notice>Les remises des étudiants associés sont consultables depuis leur suivi et selon les accès définis dans la base.</Notice></section>
  return <section className="page-wrap exercises-page"><div className="page-heading-row"><div><div className="eyebrow"><Target size={15} /> Apprendre en faisant</div><h1>Exercices & remises</h1><p className="lead">Déposez vos travaux dans un espace privé, puis retrouvez les retours de votre formateur.</p></div><div className="certificate-heading-mark"><UploadCloud size={31} /></div></div>{error && <ErrorNotice message={error} retry={() => void load()} />}{manager && <details className="manager-panel exercise-manager"><summary><span><Plus size={17} /> Créer un exercice de remise</span><ChevronDown size={16} /></summary><form className="exercise-manager-form" onSubmit={(event) => void createExercise(event)}><label className="field-label">Formation<select required value={courseId} onChange={(event) => setCourseId(event.target.value)}><option value="">Choisir une formation gérée</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label><label className="field-label">Titre<input required maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} /></label><label className="field-label">Consignes<textarea rows={3} maxLength={4000} value={instructions} onChange={(event) => setInstructions(event.target.value)} /></label><fieldset className="format-picker"><legend>Formats acceptés</legend>{[['image/jpeg', 'JPEG'], ['image/png', 'PNG'], ['image/webp', 'WebP'], ['video/mp4', 'MP4'], ['video/quicktime', 'MOV'], ['application/pdf', 'PDF'], ['application/zip', 'ZIP projet']].map(([mime, label]) => <label key={mime}><input type="checkbox" checked={formats.includes(mime)} onChange={() => toggleFormat(mime)} /> {label}</label>)}</fieldset><label className="field-label">Taille maximale<select value={maxSize} onChange={(event) => setMaxSize(event.target.value)}><option value="10">10 Mo</option><option value="25">25 Mo</option><option value="50">50 Mo</option><option value="100">100 Mo</option></select></label><button className="button button-dark button-small" disabled={saving || !courses.length || !formats.length}>{saving ? 'Enregistrement…' : 'Créer l’exercice'} <Plus size={14} /></button>{message && <Notice tone={message.includes('ajouté') ? 'success' : 'error'}>{message}</Notice>}</form></details>}
    {loading ? <LoadingState label="Chargement des exercices…" /> : exercises.length ? <div className="exercise-list">{exercises.map((exercise) => <article className="exercise-list-card" key={exercise.id}><div className="exercise-list-heading"><div><div className="eyebrow">{exercise.courses?.title || 'Formation FOCUS'}{exercise.lessons?.title ? ` · ${exercise.lessons.title}` : ''}</div><h2>{exercise.title}</h2></div><span className="exercise-size">MAX {Math.round(exercise.max_file_size_bytes / 1024 / 1024)} MO</span></div><p>{exercise.instructions || 'Consignes à venir.'}</p>{profile?.role === 'student' ? <SubmissionForm exercise={exercise} /> : <div className="allowed-formats">{exercise.allowed_mime_types.map((mime) => <span key={mime}>{mime.split('/').pop()?.toUpperCase()}</span>)}</div>}</article>)}</div> : <div className="empty-state"><Target /><h2>Aucun exercice disponible</h2><p>Les exercices seront visibles après leur création et votre inscription à une formation.</p></div>}
  </section>
}
