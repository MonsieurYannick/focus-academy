import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { ArrowRight, Plus, Users } from 'lucide-react'
import { useAuth } from '../state/auth'
import { backendConfigured, supabase } from '../lib/supabase'
import { ErrorNotice, LoadingState, Notice } from './pages'

interface LearningGroup {
  id: string
  course_id: string | null
  name: string
  description: string
  courses?: { title: string } | null
}

export function GroupsPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const manager = profile?.role === 'admin' || profile?.role === 'instructor'
  const [groups, setGroups] = useState<LearningGroup[]>([])
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([])
  const [students, setStudents] = useState<{ id: string; full_name: string }[]>([])
  const [members, setMembers] = useState<{ student_id: string; full_name: string }[]>([])
  const [groupId, setGroupId] = useState('')
  const [courseId, setCourseId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    if (!supabase || !user || !profile) { setLoading(false); return }
    setLoading(true); setError('')
    const [{ data, error: groupError }, { data: courseData, error: courseError }] = await Promise.all([
      supabase.from('learning_groups').select('id,course_id,name,description,courses(title)').order('created_at', { ascending: false }),
      manager ? supabase.from('courses').select('id,title').order('title') : Promise.resolve({ data: [], error: null }),
    ])
    if (groupError || courseError) setError((groupError || courseError)?.message ?? '')
    else {
      setGroups((data ?? []) as unknown as LearningGroup[])
      setCourses((courseData ?? []) as typeof courses)
      if (!groupId && data?.[0]) setGroupId(data[0].id)
      if (!courseId && courseData?.[0]) setCourseId(courseData[0].id)
    }
    setLoading(false)
  }, [user, profile, manager, groupId, courseId])

  const loadMembers = useCallback(async () => {
    if (!supabase || !groupId) { setMembers([]); setStudents([]); return }
    const [{ data: memberData, error: memberError }, { data: groupData }] = await Promise.all([
      supabase.from('group_memberships').select('student_id,profiles!group_memberships_student_id_fkey(full_name)').eq('group_id', groupId),
      supabase.from('learning_groups').select('course_id').eq('id', groupId).maybeSingle(),
    ])
    if (memberError) { setError(memberError.message); return }
    setMembers((memberData ?? []).map((item: any) => ({ student_id: item.student_id, full_name: item.profiles?.full_name || 'Étudiant' })))
    if (manager && groupData?.course_id) {
      const { data: enrollmentData, error: enrollmentError } = await supabase.from('enrollments').select('student_id,profiles!enrollments_student_id_fkey(id,full_name)').eq('course_id', groupData.course_id).in('status', ['active', 'completed'])
      if (enrollmentError) setError(enrollmentError.message)
      else setStudents((enrollmentData ?? []).map((item: any) => item.profiles).filter(Boolean))
    } else setStudents([])
  }, [groupId, manager])

  useEffect(() => { void load() }, [load])
  useEffect(() => { void loadMembers() }, [loadMembers])

  async function createGroup(event: FormEvent) {
    event.preventDefault()
    if (!supabase || !user || !name.trim()) return
    if (profile?.role === 'instructor' && !courseId) { setMessage('Un formateur doit rattacher son groupe à une formation gérée.'); return }
    setSaving(true); setMessage(''); setError('')
    const { data, error: createError } = await supabase.from('learning_groups').insert({ name: name.trim(), description: description.trim(), course_id: courseId || null, created_by: user.id }).select('id').single()
    if (createError) setMessage(createError.message)
    else { setName(''); setDescription(''); setGroupId(data.id); setMessage('Groupe créé.'); await load() }
    setSaving(false)
  }

  async function addMember(event: FormEvent) {
    event.preventDefault()
    if (!supabase || !user || !groupId || !studentId) return
    setSaving(true); setMessage(''); setError('')
    const { error: addError } = await supabase.from('group_memberships').insert({ group_id: groupId, student_id: studentId, added_by: user.id })
    if (addError) setMessage(addError.message)
    else { setStudentId(''); setMessage('Étudiant ajouté au groupe.'); await loadMembers() }
    setSaving(false)
  }

  async function removeMember(memberId: string) {
    if (!supabase || !groupId) return
    const { error: removeError } = await supabase.from('group_memberships').delete().eq('group_id', groupId).eq('student_id', memberId)
    if (removeError) setError(removeError.message)
    else await loadMembers()
  }

  if (authLoading) return <section className="page-wrap"><LoadingState /></section>
  if (!backendConfigured) return <section className="page-wrap"><h1>Groupes pédagogiques</h1><Notice tone="warning">La gestion des groupes et leurs membres est stockée dans Supabase ; elle n’est pas simulée localement.</Notice></section>
  if (!user) return <Navigate to="/connexion" replace />
  if (!profile || (!manager && profile.role !== 'student' && profile.role !== 'guardian')) return <section className="page-wrap"><Notice tone="error">Accès non autorisé aux groupes.</Notice></section>

  return <section className="page-wrap groups-page"><div className="page-heading-row"><div><div className="eyebrow"><Users size={15} /> Apprendre ensemble</div><h1>Groupes pédagogiques</h1><p className="lead">Les groupes et leurs membres sont limités par les règles de visibilité de vos formations et associations.</p></div><div className="certificate-heading-mark"><Users size={31} /></div></div>{error && <ErrorNotice message={error} retry={() => void load()} />}{manager && <details className="manager-panel group-manager" open><summary><span><Plus size={17} /> Créer un groupe</span></summary><form onSubmit={(event) => void createGroup(event)}><label className="field-label">Nom du groupe<input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></label><label className="field-label">Formation associée<select value={courseId} onChange={(event) => setCourseId(event.target.value)}><option value="">{profile.role === 'admin' ? 'Groupe sans formation' : 'Choisir une formation'}</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label><label className="field-label">Description<textarea rows={2} maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} /></label><button className="button button-dark button-small" disabled={saving}>{saving ? 'Enregistrement…' : 'Créer le groupe'} <Plus size={14} /></button>{message && <Notice tone={message.includes('créé') ? 'success' : 'error'}>{message}</Notice>}</form></details>}
    {loading ? <LoadingState label="Chargement des groupes…" /> : !groups.length ? <div className="empty-state"><Users /><h2>Aucun groupe visible</h2><p>Les groupes sont créés par un administrateur ou le formateur d’une formation.</p></div> : <div className="groups-workspace"><div className="group-list">{groups.map((group) => <button key={group.id} className={`group-choice ${group.id === groupId ? 'selected' : ''}`} onClick={() => setGroupId(group.id)}><span className="group-choice-icon"><Users size={16} /></span><span><strong>{group.name}</strong><small>{group.courses?.title || 'Groupe général'}</small></span><ArrowRight size={15} /></button>)}</div><section className="panel group-members-panel"><div className="eyebrow">{groups.find((group) => group.id === groupId)?.courses?.title || 'FOCUS Academy'}</div><h2>{groups.find((group) => group.id === groupId)?.name}</h2><p>{groups.find((group) => group.id === groupId)?.description || 'Groupe de suivi pédagogique.'}</p>{manager && students.length > 0 && <form className="add-member-form" onSubmit={(event) => void addMember(event)}><label className="field-label">Ajouter un étudiant inscrit<select required value={studentId} onChange={(event) => setStudentId(event.target.value)}><option value="">Choisir un étudiant</option>{students.filter((student) => !members.some((member) => member.student_id === student.id)).map((student) => <option key={student.id} value={student.id}>{student.full_name}</option>)}</select></label><button className="button button-dark button-small" disabled={saving || !studentId}>Ajouter <Plus size={14} /></button></form>}{message && !manager && <Notice tone="success">{message}</Notice>}<div className="group-member-list">{members.length ? members.map((member) => <div className="group-member-row" key={member.student_id}><span className="avatar">{member.full_name.slice(0, 1).toUpperCase()}</span><strong>{member.full_name}</strong>{manager && <button className="text-button" onClick={() => void removeMember(member.student_id)}>Retirer</button>}</div>) : <div className="empty-inline"><Users /><div><strong>Aucun membre visible</strong><p>Les membres du groupe s’affichent selon vos autorisations.</p></div></div>}</div></section></div>}
  </section>
}
