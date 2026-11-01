-- FOCUS Academy — initial schema. Apply to a local/test Supabase project first.
-- Client authorization is enforced here with grants, RLS and narrowly scoped RPCs.

create type public.app_role as enum ('admin', 'instructor', 'student', 'guardian');
create type public.course_level as enum ('beginner', 'intermediate', 'advanced');
create type public.course_status as enum ('draft', 'published', 'archived');
create type public.enrollment_status as enum ('active', 'completed', 'cancelled');
create type public.submission_status as enum ('submitted', 'reviewed', 'resubmission_requested');
create type public.certificate_status as enum ('issued', 'revoked');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  role public.app_role not null default 'student',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.course_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.course_categories(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(title) between 1 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '' check (char_length(description) <= 4000),
  level public.course_level not null default 'beginner',
  status public.course_status not null default 'draft',
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  certificate_passing_score numeric(5,2) not null default 70 check (certificate_passing_score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.course_instructors (
  course_id uuid not null references public.courses(id) on delete cascade,
  instructor_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (course_id, instructor_id)
);

create table public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '',
  position integer not null check (position > 0),
  created_at timestamptz not null default now(),
  unique (course_id, position)
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  content text not null default '',
  position integer not null check (position > 0),
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  is_required boolean not null default true,
  is_preview boolean not null default false,
  video_url text check (video_url is null or video_url ~ '^https?://'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, position)
);

create table public.learning_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  kind text not null check (kind in ('pdf', 'link', 'video', 'file')),
  external_url text check (external_url is null or external_url ~ '^https?://'),
  object_path text,
  is_preview boolean not null default false,
  created_at timestamptz not null default now(),
  check ((case when external_url is not null then 1 else 0 end) + (case when object_path is not null then 1 else 0 end) = 1)
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete restrict,
  status public.enrollment_status not null default 'active',
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (course_id, student_id),
  check ((status = 'completed') = (completed_at is not null))
);

create table public.guardian_student_links (
  guardian_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  linked_by uuid not null references public.profiles(id) on delete restrict,
  linked_at timestamptz not null default now(),
  primary key (guardian_id, student_id),
  check (guardian_id <> student_id)
);

create table public.learning_groups (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  created_at timestamptz not null default now()
);

create table public.group_memberships (
  group_id uuid not null references public.learning_groups(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  added_by uuid not null references public.profiles(id) on delete restrict,
  joined_at timestamptz not null default now(),
  primary key (group_id, student_id)
);

create table public.lesson_progress (
  student_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (student_id, lesson_id)
);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid references public.lessons(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  passing_score numeric(5,2) not null default 70 check (passing_score between 0 and 100),
  created_at timestamptz not null default now(),
  check (lesson_id is not null or course_id is not null)
);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  prompt text not null check (char_length(prompt) between 1 and 2000),
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 8),
  position integer not null check (position > 0),
  unique (quiz_id, position)
);

-- Answer keys are not selectable by client roles. They are only used by the grading RPC.
create table public.quiz_answer_keys (
  question_id uuid primary key references public.quiz_questions(id) on delete cascade,
  correct_option text not null,
  explanation text not null default ''
);

create function public.validate_quiz_options()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_option_count integer;
  v_unique_count integer;
begin
  if jsonb_typeof(new.options) <> 'array' then raise exception 'Les choix doivent être un tableau.' using errcode = '23514'; end if;
  if exists (select 1 from jsonb_array_elements(new.options) as items(value) where jsonb_typeof(items.value) <> 'string') then
    raise exception 'Les choix du quiz doivent être du texte.' using errcode = '23514';
  end if;
  select count(*), count(distinct value)
  into v_option_count, v_unique_count
  from jsonb_array_elements_text(new.options) as options(value);
  if v_option_count < 2 or v_option_count > 8 or v_option_count <> jsonb_array_length(new.options) or v_unique_count <> v_option_count then
    raise exception 'Un quiz doit avoir entre 2 et 8 choix textuels distincts.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger quiz_questions_validate_options
before insert or update of options on public.quiz_questions
for each row execute function public.validate_quiz_options();

create function public.validate_quiz_answer_key()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.quiz_questions q
    cross join lateral jsonb_array_elements_text(q.options) as options(value)
    where q.id = new.question_id and options.value = new.correct_option
  ) then
    raise exception 'La bonne réponse doit correspondre à un choix de la question.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger quiz_answer_keys_validate_answer
before insert or update of question_id, correct_option on public.quiz_answer_keys
for each row execute function public.validate_quiz_answer_key();

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete restrict,
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  score numeric(5,2) not null check (score between 0 and 100),
  submitted_at timestamptz not null default now()
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  instructions text not null default '',
  allowed_mime_types text[] not null default array['image/jpeg', 'image/png', 'image/webp'],
  max_file_size_bytes bigint not null default 26214400 check (max_file_size_bytes between 1 and 104857600),
  created_at timestamptz not null default now()
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete restrict,
  object_path text not null unique,
  file_name text not null check (char_length(file_name) between 1 and 255),
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes > 0 and file_size_bytes <= 104857600),
  status public.submission_status not null default 'submitted',
  grade numeric(5,2) check (grade is null or grade between 0 and 100),
  feedback text not null default '' check (char_length(feedback) <= 6000),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  submitted_at timestamptz not null default now(),
  check ((status = 'reviewed') = (reviewed_at is not null))
);

create table public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete set null,
  instructor_id uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(title) between 1 and 180),
  description text not null default '' check (char_length(description) <= 3000),
  starts_at timestamptz not null,
  ends_at timestamptz,
  meeting_url text check (meeting_url is null or meeting_url ~ '^https?://'),
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create table public.simulator_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  exercise_key text not null check (exercise_key in ('freeze-action', 'shallow-depth', 'low-noise')),
  settings jsonb not null check (jsonb_typeof(settings) = 'object'),
  passed boolean not null,
  attempted_at timestamptz not null default now()
);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null unique references public.enrollments(id) on delete restrict,
  certificate_code text not null unique,
  status public.certificate_status not null default 'issued',
  score numeric(5,2) check (score is null or score between 0 and 100),
  issued_by uuid not null references public.profiles(id) on delete restrict,
  issued_at timestamptz not null default now(),
  revoked_by uuid references public.profiles(id) on delete set null,
  revoked_at timestamptz,
  revocation_reason text,
  check ((status = 'revoked') = (revoked_at is not null))
);

create index courses_status_created_idx on public.courses(status, created_at desc);
create index course_modules_course_position_idx on public.course_modules(course_id, position);
create index lessons_module_position_idx on public.lessons(module_id, position);
create index enrollments_student_status_idx on public.enrollments(student_id, status);
create index enrollments_course_idx on public.enrollments(course_id);
create index lesson_progress_student_idx on public.lesson_progress(student_id, completed_at desc);
create index quiz_attempts_student_quiz_idx on public.quiz_attempts(student_id, quiz_id, score desc);
create index submissions_student_submitted_idx on public.submissions(student_id, submitted_at desc);
create index submissions_exercise_idx on public.submissions(exercise_id, submitted_at desc);
create index live_sessions_start_idx on public.live_sessions(starts_at);
create index guardian_links_student_idx on public.guardian_student_links(student_id);
create index learning_groups_course_idx on public.learning_groups(course_id);
create index group_memberships_student_idx on public.group_memberships(student_id);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger courses_set_updated_at before update on public.courses
for each row execute function public.set_updated_at();
create trigger lessons_set_updated_at before update on public.lessons
for each row execute function public.set_updated_at();

create function public.require_course_content_before_publish()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and not exists (
    select 1 from public.course_modules m join public.lessons l on l.module_id = m.id
    where m.course_id = new.id
  ) then
    raise exception 'Ajoutez au moins un module et une leçon avant la publication.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger courses_require_content_before_publish
before insert or update of status on public.courses
for each row execute function public.require_course_content_before_publish();

create function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), 'student')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger auth_user_profile_created after insert on auth.users
for each row execute function public.create_profile_for_auth_user();

-- These SECURITY DEFINER helpers avoid policy recursion while exposing only boolean checks.
create function public.has_role(p_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = p_role
  );
$$;

create function public.is_guardian_of(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.guardian_student_links gsl
    where gsl.guardian_id = (select auth.uid()) and gsl.student_id = p_student_id
  );
$$;

create function public.is_course_staff(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.courses c
    where c.id = p_course_id
      and (c.created_by = (select auth.uid()) or exists (
        select 1 from public.course_instructors ci
        where ci.course_id = c.id and ci.instructor_id = (select auth.uid())
      ))
  );
$$;

create function public.is_enrolled_in(p_student_id uuid, p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.enrollments e
    where e.student_id = p_student_id and e.course_id = p_course_id and e.status in ('active', 'completed')
  );
$$;

create function public.is_group_staff(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.learning_groups g
    where g.id = p_group_id
      and (g.created_by = (select auth.uid()) or (g.course_id is not null and public.is_course_staff(g.course_id)))
  );
$$;

create function public.course_is_public(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.courses c where c.id = p_course_id and c.status = 'published');
$$;

create function public.can_access_submission_file(p_object_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.submissions s
    join public.exercises e on e.id = s.exercise_id
    where s.object_path = p_object_path
      and (
        s.student_id = (select auth.uid())
        or public.is_guardian_of(s.student_id)
        or public.has_role('admin')
        or public.is_course_staff(e.course_id)
      )
  );
$$;

create function public.submission_object_is_valid(
  p_object_path text,
  p_student_id uuid,
  p_exercise_id uuid,
  p_mime_type text,
  p_file_size_bytes bigint
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from storage.objects o
    where o.bucket_id = 'student-work'
      and o.name = p_object_path
      and (storage.foldername(o.name))[1] = p_student_id::text
      and (storage.foldername(o.name))[2] = p_exercise_id::text
      and o.metadata ->> 'mimetype' = p_mime_type
      and (o.metadata ->> 'size') ~ '^[0-9]+$'
      and (o.metadata ->> 'size')::bigint = p_file_size_bytes
  );
$$;

create function public.can_access_course_resource(p_object_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.learning_resources r
    join public.lessons l on l.id = r.lesson_id
    join public.course_modules m on m.id = l.module_id
    where r.object_path = p_object_path
      and (
        public.has_role('admin')
        or public.is_course_staff(m.course_id)
        or (public.course_is_public(m.course_id) and r.is_preview)
        or public.is_enrolled_in((select auth.uid()), m.course_id)
        or exists (
          select 1 from public.enrollments e
          where e.course_id = m.course_id and public.is_guardian_of(e.student_id)
        )
      )
  );
$$;

create function public.can_manage_course_resource(p_object_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.learning_resources r
    join public.lessons l on l.id = r.lesson_id
    join public.course_modules m on m.id = l.module_id
    where r.object_path = p_object_path
      and (public.has_role('admin') or public.is_course_staff(m.course_id))
  );
$$;

create function public.complete_lesson(p_lesson_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course_id uuid;
  v_passing_score numeric;
  v_student_id uuid := (select auth.uid());
  v_complete boolean;
begin
  if v_student_id is null or not public.has_role('student') then
    raise exception 'Un compte étudiant est requis.' using errcode = '42501';
  end if;

  select m.course_id into v_course_id
  from public.lessons l join public.course_modules m on m.id = l.module_id
  where l.id = p_lesson_id;
  if v_course_id is null or not public.is_enrolled_in(v_student_id, v_course_id) then
    raise exception 'Inscription active à cette formation requise.' using errcode = '42501';
  end if;

  insert into public.lesson_progress (student_id, lesson_id)
  values (v_student_id, p_lesson_id)
  on conflict (student_id, lesson_id) do nothing;

  select c.certificate_passing_score into v_passing_score
  from public.courses c where c.id = v_course_id;

  select
    not exists (
      select 1 from public.lessons l
      join public.course_modules m on m.id = l.module_id
      where m.course_id = v_course_id and l.is_required
        and not exists (select 1 from public.lesson_progress lp where lp.lesson_id = l.id and lp.student_id = v_student_id)
    )
    and not exists (
      select 1 from public.quizzes q
      where q.course_id = v_course_id
        and not exists (
          select 1 from public.quiz_attempts qa
          where qa.quiz_id = q.id and qa.student_id = v_student_id and qa.score >= greatest(q.passing_score, v_passing_score)
        )
    )
  into v_complete;

  if v_complete then
    update public.enrollments
    set status = 'completed', completed_at = coalesce(completed_at, now())
    where student_id = v_student_id and course_id = v_course_id and status = 'active';
  end if;
  return coalesce(v_complete, false);
end;
$$;

create function public.submit_quiz_attempt(p_quiz_id uuid, p_answers jsonb)
returns table(attempt_id uuid, score numeric, passed boolean, feedback jsonb)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_id uuid := (select auth.uid());
  v_course_id uuid;
  v_passing_score numeric;
  v_total integer;
  v_correct integer;
  v_feedback jsonb;
  v_attempt_id uuid;
  v_score numeric;
begin
  if v_student_id is null or not public.has_role('student') then
    raise exception 'Un compte étudiant est requis.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_answers) <> 'object' then
    raise exception 'Les réponses doivent être un objet JSON.' using errcode = '22023';
  end if;

  select q.course_id, greatest(q.passing_score, c.certificate_passing_score) into v_course_id, v_passing_score
  from public.quizzes q join public.courses c on c.id = q.course_id where q.id = p_quiz_id;
  if v_course_id is null or not public.is_enrolled_in(v_student_id, v_course_id) then
    raise exception 'Inscription active à cette formation requise.' using errcode = '42501';
  end if;

  select count(*), count(*) filter (where (p_answers -> qq.id::text) #>> '{}' = ak.correct_option),
    coalesce(jsonb_agg(jsonb_build_object('question_id', qq.id, 'correct', (p_answers -> qq.id::text) #>> '{}' = ak.correct_option, 'explanation', ak.explanation) order by qq.position), '[]'::jsonb)
  into v_total, v_correct, v_feedback
  from public.quiz_questions qq join public.quiz_answer_keys ak on ak.question_id = qq.id
  where qq.quiz_id = p_quiz_id;

  if v_total = 0 then raise exception 'Ce quiz ne contient aucune question corrigible.' using errcode = '22023'; end if;
  v_score := round((v_correct::numeric / v_total::numeric) * 100, 2);
  insert into public.quiz_attempts (quiz_id, student_id, answers, score)
  values (p_quiz_id, v_student_id, p_answers, v_score)
  returning id into v_attempt_id;

  return query select v_attempt_id, v_score, v_score >= v_passing_score, v_feedback;
end;
$$;

create function public.record_simulator_attempt(
  p_exercise_key text,
  p_aperture numeric,
  p_shutter_seconds numeric,
  p_iso integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_id uuid := (select auth.uid());
  v_passed boolean;
  v_valid_shutter boolean;
begin
  if v_student_id is null or not public.has_role('student') then
    raise exception 'Un compte étudiant est requis.' using errcode = '42501';
  end if;
  if p_exercise_key not in ('freeze-action', 'shallow-depth', 'low-noise')
    or p_aperture not in (1.4, 2, 2.8, 4, 5.6, 8, 11, 16)
    or p_iso not in (100, 200, 400, 800, 1600, 3200, 6400, 12800) then
    raise exception 'Réglages de simulateur non autorisés.' using errcode = '22023';
  end if;
  select exists (
    select 1 from unnest(array[1::numeric/1000, 1::numeric/500, 1::numeric/250, 1::numeric/125, 1::numeric/60, 1::numeric/30, 1::numeric/15]) allowed(value)
    where abs(allowed.value - p_shutter_seconds) < 0.00000001
  ) into v_valid_shutter;
  if not v_valid_shutter then raise exception 'Vitesse non autorisée.' using errcode = '22023'; end if;

  v_passed := case p_exercise_key
    when 'freeze-action' then p_shutter_seconds <= 1::numeric/500
    when 'shallow-depth' then p_aperture <= 2.8
    when 'low-noise' then p_iso <= 800
  end;
  insert into public.simulator_attempts (student_id, exercise_key, settings, passed)
  values (v_student_id, p_exercise_key, jsonb_build_object('aperture', p_aperture, 'shutterSeconds', p_shutter_seconds, 'iso', p_iso), v_passed);
  return v_passed;
end;
$$;

create function public.issue_certificate(p_enrollment_id uuid)
returns table(certificate_id uuid, certificate_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_enrollment public.enrollments%rowtype;
  v_score numeric;
  v_passing_score numeric;
  v_code text;
  v_certificate_id uuid;
begin
  if not (public.has_role('admin') or public.has_role('instructor')) then
    raise exception 'Un rôle formateur ou administrateur est requis.' using errcode = '42501';
  end if;
  select * into v_enrollment from public.enrollments where id = p_enrollment_id for update;
  if not found or v_enrollment.status <> 'completed' then
    raise exception 'La formation doit être terminée avant la délivrance.' using errcode = '22023';
  end if;
  if not public.has_role('admin') and not public.is_course_staff(v_enrollment.course_id) then
    raise exception 'Vous ne gérez pas cette formation.' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.lessons l join public.course_modules m on m.id = l.module_id
    where m.course_id = v_enrollment.course_id and l.is_required
      and not exists (select 1 from public.lesson_progress lp where lp.lesson_id = l.id and lp.student_id = v_enrollment.student_id)
  ) then raise exception 'Des leçons obligatoires restent à terminer.' using errcode = '22023'; end if;

  select c.certificate_passing_score into v_passing_score from public.courses c where c.id = v_enrollment.course_id;
  if exists (
    select 1 from public.quizzes q where q.course_id = v_enrollment.course_id
      and not exists (select 1 from public.quiz_attempts qa where qa.quiz_id = q.id and qa.student_id = v_enrollment.student_id and qa.score >= greatest(q.passing_score, v_passing_score))
  ) then raise exception 'Le seuil configuré pour tous les quiz n’est pas atteint.' using errcode = '22023'; end if;

  select round(avg(best.score), 2) into v_score
  from (
    select max(qa.score) as score from public.quiz_attempts qa
    join public.quizzes q on q.id = qa.quiz_id
    where q.course_id = v_enrollment.course_id and qa.student_id = v_enrollment.student_id
    group by q.id
  ) best;
  v_code := upper(replace(gen_random_uuid()::text, '-', ''));
  insert into public.certificates (enrollment_id, certificate_code, score, issued_by)
  values (p_enrollment_id, v_code, v_score, (select auth.uid()))
  returning id into v_certificate_id;
  return query select v_certificate_id, v_code;
end;
$$;

create function public.revoke_certificate(p_certificate_id uuid, p_reason text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role('admin') then raise exception 'Rôle administrateur requis.' using errcode = '42501'; end if;
  if char_length(trim(coalesce(p_reason, ''))) < 8 then raise exception 'Un motif de révocation détaillé est requis.' using errcode = '22023'; end if;
  update public.certificates
  set status = 'revoked', revoked_by = (select auth.uid()), revoked_at = now(), revocation_reason = left(trim(p_reason), 1000)
  where id = p_certificate_id and status = 'issued';
  return found;
end;
$$;

create function public.verify_certificate(p_code text)
returns table(status text, student_name text, course_title text, issued_at timestamptz, score numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select c.status::text, p.full_name, co.title, c.issued_at, c.score
  from public.certificates c
  join public.enrollments e on e.id = c.enrollment_id
  join public.profiles p on p.id = e.student_id
  join public.courses co on co.id = e.course_id
  where c.certificate_code = upper(trim(p_code))
  limit 1;
$$;

-- Lock down grants explicitly; RLS policies below decide which rows are visible.
revoke all on table
  public.profiles, public.course_categories, public.courses, public.course_instructors,
  public.course_modules, public.lessons, public.learning_resources, public.enrollments,
  public.guardian_student_links, public.lesson_progress, public.quizzes, public.quiz_questions,
  public.quiz_answer_keys, public.quiz_attempts, public.exercises, public.submissions,
  public.live_sessions, public.simulator_attempts, public.certificates,
  public.learning_groups, public.group_memberships
from anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.require_course_content_before_publish() from public, anon, authenticated;
revoke all on function public.create_profile_for_auth_user() from public, anon, authenticated;
revoke all on function public.validate_quiz_options() from public, anon, authenticated;
revoke all on function public.validate_quiz_answer_key() from public, anon, authenticated;
revoke all on function public.has_role(public.app_role) from public, anon, authenticated;
revoke all on function public.is_guardian_of(uuid) from public, anon, authenticated;
revoke all on function public.is_course_staff(uuid) from public, anon, authenticated;
revoke all on function public.is_enrolled_in(uuid, uuid) from public, anon, authenticated;
revoke all on function public.is_group_staff(uuid) from public, anon, authenticated;
revoke all on function public.course_is_public(uuid) from public, anon, authenticated;
revoke all on function public.can_access_submission_file(text) from public, anon, authenticated;
revoke all on function public.submission_object_is_valid(text, uuid, uuid, text, bigint) from public, anon, authenticated;
revoke all on function public.can_access_course_resource(text) from public, anon, authenticated;
revoke all on function public.can_manage_course_resource(text) from public, anon, authenticated;
revoke all on function public.complete_lesson(uuid) from public, anon, authenticated;
revoke all on function public.submit_quiz_attempt(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.issue_certificate(uuid) from public, anon, authenticated;
revoke all on function public.revoke_certificate(uuid, text) from public, anon, authenticated;
revoke all on function public.verify_certificate(text) from public, anon, authenticated;
revoke all on function public.record_simulator_attempt(text, numeric, numeric, integer) from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.course_categories to anon, authenticated;
grant insert, update on public.course_categories to authenticated;
grant select on public.courses to anon, authenticated;
grant insert on public.courses to authenticated;
grant update (category_id, title, slug, description, level, status, duration_minutes, certificate_passing_score) on public.courses to authenticated;
grant select on public.course_instructors, public.course_modules, public.lessons, public.learning_resources to anon, authenticated;
grant insert, update on public.course_modules, public.lessons to authenticated;
grant insert, update, delete on public.learning_resources to authenticated;
grant select on public.enrollments to authenticated;
grant insert (course_id, student_id) on public.enrollments to authenticated;
grant select on public.guardian_student_links, public.lesson_progress to authenticated;
grant select, insert, update, delete on public.guardian_student_links to authenticated;
grant select, insert, update, delete on public.learning_groups, public.group_memberships to authenticated;
grant select on public.quizzes, public.quiz_questions to authenticated;
grant insert, update, delete on public.quizzes, public.quiz_questions to authenticated;
grant insert, update, delete on public.quiz_answer_keys to authenticated;
grant select on public.quiz_attempts to authenticated;
grant select on public.exercises to authenticated;
grant insert, update on public.exercises to authenticated;
grant select on public.submissions to authenticated;
grant insert (exercise_id, student_id, object_path, file_name, mime_type, file_size_bytes) on public.submissions to authenticated;
grant update (status, grade, feedback, reviewed_by, reviewed_at) on public.submissions to authenticated;
grant select on public.live_sessions to authenticated;
grant insert, update on public.live_sessions to authenticated;
grant select on public.simulator_attempts to authenticated;
grant select on public.certificates to authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;
grant execute on function public.has_role(public.app_role) to authenticated;
grant execute on function public.is_guardian_of(uuid) to authenticated;
grant execute on function public.is_course_staff(uuid) to authenticated;
grant execute on function public.is_enrolled_in(uuid, uuid) to authenticated;
grant execute on function public.is_group_staff(uuid) to authenticated;
grant execute on function public.course_is_public(uuid) to anon, authenticated;
grant execute on function public.can_access_submission_file(text) to authenticated;
grant execute on function public.submission_object_is_valid(text, uuid, uuid, text, bigint) to authenticated;
grant execute on function public.can_access_course_resource(text) to authenticated;
grant execute on function public.can_manage_course_resource(text) to authenticated;
grant execute on function public.complete_lesson(uuid) to authenticated;
grant execute on function public.submit_quiz_attempt(uuid, jsonb) to authenticated;
grant execute on function public.issue_certificate(uuid) to authenticated;
grant execute on function public.revoke_certificate(uuid, text) to authenticated;
grant execute on function public.verify_certificate(text) to anon, authenticated;
grant execute on function public.record_simulator_attempt(text, numeric, numeric, integer) to authenticated;

alter table public.profiles enable row level security;
alter table public.course_categories enable row level security;
alter table public.courses enable row level security;
alter table public.course_instructors enable row level security;
alter table public.course_modules enable row level security;
alter table public.lessons enable row level security;
alter table public.learning_resources enable row level security;
alter table public.enrollments enable row level security;
alter table public.guardian_student_links enable row level security;
alter table public.learning_groups enable row level security;
alter table public.group_memberships enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_answer_keys enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.exercises enable row level security;
alter table public.submissions enable row level security;
alter table public.live_sessions enable row level security;
alter table public.simulator_attempts enable row level security;
alter table public.certificates enable row level security;

create policy categories_read on public.course_categories for select to anon, authenticated using (true);
create policy categories_admin_manage on public.course_categories for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));
create policy courses_read_published on public.courses for select to anon, authenticated using (status = 'published');
create policy courses_read_staff on public.courses for select to authenticated using (public.has_role('admin') or public.is_course_staff(id));
create policy courses_create_staff on public.courses for insert to authenticated with check (
  created_by = (select auth.uid()) and (public.has_role('admin') or public.has_role('instructor'))
);
create policy courses_update_staff on public.courses for update to authenticated using (
  public.has_role('admin') or public.is_course_staff(id)
) with check (public.has_role('admin') or public.is_course_staff(id));

create policy profiles_read_self_admin_guardian on public.profiles for select to authenticated using (
  id = (select auth.uid()) or public.has_role('admin') or public.is_guardian_of(id)
  or exists (select 1 from public.enrollments e where e.student_id = id and public.is_course_staff(e.course_id))
);
create policy profiles_update_self on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy course_instructors_read_assigned on public.course_instructors for select to authenticated using (
  instructor_id = (select auth.uid()) or public.has_role('admin') or public.is_course_staff(course_id)
);
create policy course_instructors_admin_manage on public.course_instructors for all to authenticated
using (public.has_role('admin'))
with check (public.has_role('admin') and exists (
  select 1 from public.profiles p where p.id = instructor_id and p.role = 'instructor'
));

create policy modules_read_public on public.course_modules for select to anon using (public.course_is_public(course_id));
create policy modules_read_authenticated on public.course_modules for select to authenticated using (
  public.course_is_public(course_id) or public.has_role('admin') or public.is_course_staff(course_id) or public.is_enrolled_in((select auth.uid()), course_id)
  or exists (select 1 from public.enrollments e where e.course_id = course_id and public.is_guardian_of(e.student_id))
);
create policy modules_staff_manage on public.course_modules for all to authenticated using (
  public.has_role('admin') or public.is_course_staff(course_id)
) with check (public.has_role('admin') or public.is_course_staff(course_id));

create policy lessons_read_preview_public on public.lessons for select to anon using (
  is_preview and exists (select 1 from public.course_modules m where m.id = module_id and public.course_is_public(m.course_id))
);
create policy lessons_read_authenticated on public.lessons for select to authenticated using (
  exists (
    select 1 from public.course_modules m where m.id = module_id
      and (public.has_role('admin') or public.is_course_staff(m.course_id) or public.is_enrolled_in((select auth.uid()), m.course_id)
        or exists (select 1 from public.enrollments e where e.course_id = m.course_id and public.is_guardian_of(e.student_id))
        or (is_preview and public.course_is_public(m.course_id)))
  )
);
create policy lessons_staff_manage on public.lessons for all to authenticated using (
  public.has_role('admin') or exists (select 1 from public.course_modules m where m.id = module_id and public.is_course_staff(m.course_id))
) with check (
  public.has_role('admin') or exists (select 1 from public.course_modules m where m.id = module_id and public.is_course_staff(m.course_id))
);

create policy resources_read_preview_public on public.learning_resources for select to anon using (
  is_preview and exists (
    select 1 from public.lessons l join public.course_modules m on m.id = l.module_id
    where l.id = lesson_id and l.is_preview and public.course_is_public(m.course_id)
  )
);
create policy resources_read_authenticated on public.learning_resources for select to authenticated using (
  exists (
    select 1 from public.lessons l join public.course_modules m on m.id = l.module_id
    where l.id = lesson_id and (public.has_role('admin') or public.is_course_staff(m.course_id)
      or public.is_enrolled_in((select auth.uid()), m.course_id)
      or (is_preview and l.is_preview and public.course_is_public(m.course_id)))
  )
);
create policy resources_staff_manage on public.learning_resources for all to authenticated using (
  public.has_role('admin') or exists (select 1 from public.lessons l join public.course_modules m on m.id = l.module_id where l.id = lesson_id and public.is_course_staff(m.course_id))
) with check (
  public.has_role('admin') or exists (select 1 from public.lessons l join public.course_modules m on m.id = l.module_id where l.id = lesson_id and public.is_course_staff(m.course_id))
);

create policy enrollments_read_authorized on public.enrollments for select to authenticated using (
  student_id = (select auth.uid()) or public.is_guardian_of(student_id) or public.has_role('admin') or public.is_course_staff(course_id)
);
create policy enrollments_self_insert on public.enrollments for insert to authenticated with check (
  student_id = (select auth.uid()) and public.has_role('student') and public.course_is_public(course_id)
);

create policy guardian_links_read_associated on public.guardian_student_links for select to authenticated using (
  guardian_id = (select auth.uid()) or student_id = (select auth.uid()) or public.has_role('admin')
);
create policy guardian_links_admin_manage on public.guardian_student_links for all to authenticated using (public.has_role('admin')) with check (
  public.has_role('admin') and exists (select 1 from public.profiles g where g.id = guardian_id and g.role = 'guardian')
    and exists (select 1 from public.profiles s where s.id = student_id and s.role = 'student')
);

create policy groups_read_associated on public.learning_groups for select to authenticated using (
  public.has_role('admin') or public.is_group_staff(id)
  or exists (select 1 from public.group_memberships gm where gm.group_id = id and (
    gm.student_id = (select auth.uid()) or public.is_guardian_of(gm.student_id)
  ))
);
create policy groups_staff_manage on public.learning_groups for all to authenticated using (
  public.has_role('admin') or public.is_group_staff(id)
) with check (
  created_by = (select auth.uid()) and (public.has_role('admin') or (public.has_role('instructor')
    and course_id is not null and public.is_course_staff(course_id)))
);
create policy group_memberships_read_associated on public.group_memberships for select to authenticated using (
  student_id = (select auth.uid()) or public.is_guardian_of(student_id)
  or public.has_role('admin') or public.is_group_staff(group_id)
);
create policy group_memberships_staff_manage on public.group_memberships for all to authenticated using (
  public.has_role('admin') or public.is_group_staff(group_id)
) with check (
  (public.has_role('admin') or public.is_group_staff(group_id))
  and (public.has_role('admin') or added_by = (select auth.uid()))
  and exists (select 1 from public.profiles p where p.id = student_id and p.role = 'student')
  and exists (select 1 from public.learning_groups g where g.id = group_id
    and (g.course_id is null or public.is_enrolled_in(student_id, g.course_id)))
);

create policy progress_read_authorized on public.lesson_progress for select to authenticated using (
  student_id = (select auth.uid()) or public.is_guardian_of(student_id) or public.has_role('admin')
  or exists (select 1 from public.lessons l join public.course_modules m on m.id = l.module_id where l.id = lesson_id and public.is_course_staff(m.course_id))
);

create policy quizzes_read_enrolled on public.quizzes for select to authenticated using (
  public.has_role('admin') or public.is_course_staff(course_id) or public.is_enrolled_in((select auth.uid()), course_id)
);
create policy quizzes_staff_manage on public.quizzes for all to authenticated using (public.has_role('admin') or public.is_course_staff(course_id)) with check (public.has_role('admin') or public.is_course_staff(course_id));
create policy questions_read_enrolled on public.quiz_questions for select to authenticated using (
  exists (select 1 from public.quizzes q where q.id = quiz_id and (public.has_role('admin') or public.is_course_staff(q.course_id) or public.is_enrolled_in((select auth.uid()), q.course_id)))
);
create policy questions_staff_manage on public.quiz_questions for all to authenticated using (
  exists (select 1 from public.quizzes q where q.id = quiz_id and (public.has_role('admin') or public.is_course_staff(q.course_id)))
) with check (
  exists (select 1 from public.quizzes q where q.id = quiz_id and (public.has_role('admin') or public.is_course_staff(q.course_id)))
);
create policy answer_keys_staff_read on public.quiz_answer_keys for select to authenticated using (
  exists (select 1 from public.quiz_questions qq join public.quizzes q on q.id = qq.quiz_id where qq.id = question_id and (public.has_role('admin') or public.is_course_staff(q.course_id)))
);
create policy answer_keys_staff_manage on public.quiz_answer_keys for all to authenticated using (
  exists (select 1 from public.quiz_questions qq join public.quizzes q on q.id = qq.quiz_id where qq.id = question_id and (public.has_role('admin') or public.is_course_staff(q.course_id)))
) with check (
  exists (select 1 from public.quiz_questions qq join public.quizzes q on q.id = qq.quiz_id where qq.id = question_id and (public.has_role('admin') or public.is_course_staff(q.course_id)))
);
create policy attempts_read_authorized on public.quiz_attempts for select to authenticated using (
  student_id = (select auth.uid()) or public.is_guardian_of(student_id) or public.has_role('admin')
  or exists (select 1 from public.quizzes q where q.id = quiz_id and public.is_course_staff(q.course_id))
);

create policy exercises_read_enrolled on public.exercises for select to authenticated using (
  public.has_role('admin') or public.is_course_staff(course_id) or public.is_enrolled_in((select auth.uid()), course_id)
);
create policy exercises_staff_manage on public.exercises for all to authenticated using (public.has_role('admin') or public.is_course_staff(course_id)) with check (public.has_role('admin') or public.is_course_staff(course_id));

create policy submissions_read_authorized on public.submissions for select to authenticated using (
  student_id = (select auth.uid()) or public.is_guardian_of(student_id) or public.has_role('admin')
  or exists (select 1 from public.exercises e where e.id = exercise_id and public.is_course_staff(e.course_id))
);
create policy submissions_student_insert on public.submissions for insert to authenticated with check (
  student_id = (select auth.uid()) and public.has_role('student')
  and exists (select 1 from public.exercises e where e.id = exercise_id and public.is_enrolled_in(student_id, e.course_id)
    and file_size_bytes <= e.max_file_size_bytes and mime_type = any(e.allowed_mime_types))
  and public.submission_object_is_valid(object_path, student_id, exercise_id, mime_type, file_size_bytes)
);
create policy submissions_staff_review on public.submissions for update to authenticated using (
  public.has_role('admin') or exists (select 1 from public.exercises e where e.id = exercise_id and public.is_course_staff(e.course_id))
) with check (
  (public.has_role('admin') or exists (select 1 from public.exercises e where e.id = exercise_id and public.is_course_staff(e.course_id)))
  and (status <> 'reviewed' or (reviewed_by = (select auth.uid()) and reviewed_at is not null))
);

create policy sessions_read_enrolled on public.live_sessions for select to authenticated using (
  public.has_role('admin') or instructor_id = (select auth.uid()) or (course_id is not null and public.is_course_staff(course_id))
  or (course_id is not null and public.is_enrolled_in((select auth.uid()), course_id))
  or (course_id is not null and exists (select 1 from public.enrollments e where e.course_id = live_sessions.course_id and public.is_guardian_of(e.student_id)))
);
create policy sessions_staff_insert on public.live_sessions for insert to authenticated with check (
  instructor_id = (select auth.uid()) and (public.has_role('admin') or public.has_role('instructor'))
  and (course_id is null or public.is_course_staff(course_id))
);
create policy sessions_staff_update on public.live_sessions for update to authenticated using (
  public.has_role('admin') or instructor_id = (select auth.uid()) or (course_id is not null and public.is_course_staff(course_id))
) with check (
  public.has_role('admin') or (instructor_id = (select auth.uid()) and public.has_role('instructor')) or (course_id is not null and public.is_course_staff(course_id))
);

create policy simulator_attempts_read_authorized on public.simulator_attempts for select to authenticated using (
  student_id = (select auth.uid()) or public.is_guardian_of(student_id) or public.has_role('admin')
);
create policy certificates_read_authorized on public.certificates for select to authenticated using (
  exists (select 1 from public.enrollments e where e.id = enrollment_id and (
    e.student_id = (select auth.uid()) or public.is_guardian_of(e.student_id) or public.has_role('admin') or public.is_course_staff(e.course_id)
  ))
);

-- Private buckets: policies scope student work to its owner and explicitly authorized course staff/guardians.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('student-work', 'student-work', false, 104857600, array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','application/pdf','application/zip','application/x-zip-compressed']),
  ('course-resources', 'course-resources', false, 104857600, array['application/pdf','image/jpeg','image/png','image/webp','video/mp4','video/quicktime'])
on conflict (id) do update set
  public = false,
  file_size_limit = least(storage.buckets.file_size_limit, excluded.file_size_limit),
  allowed_mime_types = excluded.allowed_mime_types;

create policy student_work_insert_own on storage.objects for insert to authenticated with check (
  bucket_id = 'student-work'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.has_role('student')
  and exists (
    select 1 from public.exercises e
    where e.id::text = (storage.foldername(name))[2]
      and public.is_enrolled_in((select auth.uid()), e.course_id)
      and metadata ->> 'mimetype' = any(e.allowed_mime_types)
      and (metadata ->> 'size') ~ '^[0-9]+$'
      and (metadata ->> 'size')::bigint <= e.max_file_size_bytes
  )
);
create policy student_work_read_authorized on storage.objects for select to authenticated using (
  bucket_id = 'student-work' and public.can_access_submission_file(name)
);
create policy student_work_delete_unlinked_own on storage.objects for delete to authenticated using (
  bucket_id = 'student-work'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and not exists (select 1 from public.submissions s where s.object_path = name)
);
create policy course_resources_read_authorized on storage.objects for select to authenticated using (
  bucket_id = 'course-resources' and public.can_access_course_resource(name)
);
create policy course_resources_staff_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'course-resources' and public.can_manage_course_resource(name)
);
create policy course_resources_staff_update on storage.objects for update to authenticated using (
  bucket_id = 'course-resources' and public.can_manage_course_resource(name)
) with check (
  bucket_id = 'course-resources' and public.can_manage_course_resource(name)
);
create policy course_resources_staff_delete on storage.objects for delete to authenticated using (
  bucket_id = 'course-resources' and public.can_manage_course_resource(name)
);
