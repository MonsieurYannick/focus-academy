import { useState } from 'react'
import { Link, NavLink, Outlet, Route, Routes } from 'react-router-dom'
import { Aperture, ArrowUpRight, BookOpen, CalendarDays, Camera, CircleHelp, Compass, LayoutDashboard, Menu, X } from 'lucide-react'
import { useAuth } from '../state/auth'
import { backendConfigurationError, backendConfigured } from '../lib/supabase'
import { AuthPage, CatalogPage, CertificatesPage, CoursePage, DashboardPage, HomePage, LessonPage, NotFoundPage, ReportsPage, SessionsPage, SimulatorPage, VerifyCertificatePage } from './pages'
import { StudioPage } from './studio'
import { ExercisesPage, QuizzesPage } from './activities'
import { ResourcesPage } from './resources'
import { GroupsPage } from './groups'

const publicLinks = [
  { to: '/formations', label: 'Formations', icon: BookOpen },
  { to: '/simulateur', label: 'Simulateur', icon: Camera },
  { to: '/sessions', label: 'Sessions live', icon: CalendarDays },
]

function AppShell() {
  const { user, profile, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleSignOut() {
    try {
      await signOut()
      setMenuOpen(false)
    } catch {
      // Le toast détaillé appartient au prochain écran de connexion; la session reste visible ici.
    }
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Passer au contenu</a>
      {!backendConfigured && <div className="config-ribbon"><span className="status-dot" /> {backendConfigurationError || 'Mode configuration — connectez Supabase pour activer les comptes et les données partagées.'}</div>}
      <header className="topbar">
        <Link to="/" className="brand" aria-label="FOCUS Academy, accueil" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark"><Aperture size={20} strokeWidth={2.4} /></span>
          <span className="brand-name">FOCUS<span>ACADEMY</span></span>
        </Link>
        <nav className={`main-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Navigation principale">
          {publicLinks.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setMenuOpen(false)} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}><Icon size={16} />{label}</NavLink>)}
          {user && <NavLink to="/tableau-de-bord" onClick={() => setMenuOpen(false)} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}><LayoutDashboard size={16} />Mon espace</NavLink>}
        </nav>
        <div className="topbar-actions">
          {user ? <>
            <Link to="/tableau-de-bord" className="avatar-link" title={profile?.full_name || user.email || 'Mon espace'}><span className="avatar">{(profile?.full_name || user.email || 'F').slice(0, 1).toUpperCase()}</span><span className="desktop-only">{profile?.full_name?.split(' ')[0] || 'Mon espace'}</span></Link>
            <button className="button button-quiet desktop-only" onClick={() => void handleSignOut()}>Déconnexion</button>
          </> : <>
            <Link to="/connexion" className="button button-quiet desktop-only">Connexion</Link>
            <Link to="/inscription" className="button button-dark desktop-only">Commencer <ArrowUpRight size={15} /></Link>
          </>}
          <button className="menu-toggle" aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </header>
      <main id="main-content"><Outlet /></main>
      <footer className="footer">
        <Link to="/" className="brand footer-brand"><span className="brand-mark"><Aperture size={18} /></span><span className="brand-name">FOCUS<span>ACADEMY</span></span></Link>
        <p>Apprendre à voir. Maîtriser l’image.</p>
        <div className="footer-links"><Link to="/formations">Formations</Link><Link to="/simulateur">Simulateur</Link><Link to="/studio">Studio 3D</Link><Link to="/sessions">Sessions</Link><Link to="/aide">Aide</Link></div>
        <span className="footer-copy">© {new Date().getFullYear()} FOCUS Academy</span>
      </footer>
    </div>
  )
}

export function App() {
  return <Routes><Route element={<AppShell />}>
    <Route index element={<HomePage />} />
    <Route path="formations" element={<CatalogPage />} />
    <Route path="cours/:slug" element={<CoursePage />} />
    <Route path="lecon/:lessonId" element={<LessonPage />} />
    <Route path="simulateur" element={<SimulatorPage />} />
    <Route path="studio" element={<StudioPage />} />
    <Route path="sessions" element={<SessionsPage />} />
    <Route path="quiz" element={<QuizzesPage />} />
    <Route path="exercices" element={<ExercisesPage />} />
    <Route path="gestion-medias" element={<ResourcesPage />} />
    <Route path="groupes" element={<GroupsPage />} />
    <Route path="tableau-de-bord" element={<DashboardPage />} />
    <Route path="rapports" element={<ReportsPage />} />
    <Route path="certificats" element={<CertificatesPage />} />
    <Route path="connexion" element={<AuthPage mode="signin" />} />
    <Route path="inscription" element={<AuthPage mode="signup" />} />
    <Route path="verifier/:code" element={<VerifyCertificatePage />} />
    <Route path="aide" element={<HelpPage />} />
    <Route path="*" element={<NotFoundPage />} />
  </Route></Routes>
}

function HelpPage() {
  return <section className="page-wrap narrow-page"><div className="eyebrow"><CircleHelp size={15} /> Centre d’aide</div><h1>Besoin d’un coup de main ?</h1><p className="lead">Cette première version est conçue pour accueillir vos supports et vos apprenants. Les services de compte et de stockage s’activent après configuration de Supabase.</p><div className="panel"><h2>Pour les administrateurs</h2><p>Configurez les variables publiques Supabase décrites dans le README, appliquez la migration, puis créez le premier utilisateur depuis le flux d’inscription. Son rôle est étudiant par défaut : attribuez les rôles administratifs depuis un environnement de confiance.</p><Link className="text-link" to="/inscription">Créer un compte <ArrowUpRight size={15} /></Link></div><div className="panel"><h2>Un souci avec vos cours ?</h2><p>Les cours et ressources ne sont affichés que lorsqu’ils sont publiés dans la base de données. Aucun support de formation n’a été préchargé ou présenté comme un document existant.</p></div><div className="domain-chips"><span>Photographie</span><span>Vidéo</span><span>Post-production</span><span>Portfolio</span></div><div className="help-compass"><Compass size={18} /> Explorez le <Link to="/simulateur">simulateur photo</Link> sans créer de compte.</div></section>
}
