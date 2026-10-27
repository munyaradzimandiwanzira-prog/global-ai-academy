import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Search, Menu, X, Moon, Sun, ChevronDown, LayoutDashboard, LogOut, Settings, GraduationCap, Shield, Award, BookOpenCheck, FolderCode, Rocket } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Avatar, TrackMark } from '@/components/ui';
import { SearchDialog } from './SearchDialog';
import { useAuth } from '@/lib/auth';
import { catalog, tracksByCategory, lessonPath } from '@/lib/catalog';
import { CATEGORY_LABELS } from '@shared/content';
import { ROLE_HOME } from '@shared/rbac';
import { PLANS } from '@shared/config';
import { cn } from '@/lib/utils';
import { useTheme } from '@/lib/theme';

const PRACTICE_LINKS: [string, string][] = [
  ['/start', 'Where to start'],
  ['/reference', 'References'],
  ['/exercises', 'Exercises'],
  ['/quiz', 'Quizzes'],
  ['/challenges', 'Code challenges'],
  ['/compiler/python', 'Online editors'],
  ['/projects', 'My projects'],
  ['/certificates', 'Get certified'],
];

const TAB_IDS = ['html', 'css', 'javascript', 'python', 'sql', 'ai-fundamentals', 'machine-learning', 'rag', 'ai-agents', 'java', 'kotlin', 'php', 'typescript', 'cpp', 'git', 'vscode', 'data-science', 'langchain', 'android', 'ios-swift'];

function TutorialsMenu({ onClose }: { onClose: () => void }) {
  const groups = tracksByCategory();
  return (
    <div className="absolute inset-x-0 top-full z-40 border-b border-border bg-card shadow-float">
      <div className="container grid max-h-[70vh] gap-x-8 gap-y-6 overflow-y-auto py-8 sm:grid-cols-2 lg:grid-cols-4">
        {groups.map((g) => (
          <div key={g.category}>
            <h3 className="mb-2 font-display text-base font-semibold text-gold-600">{CATEGORY_LABELS[g.category]}</h3>
            <ul className="space-y-0.5">
              {g.tracks.map((t) => (
                <li key={t.id}>
                  <Link to={lessonPath(t.id)} onClick={onClose} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                    <TrackMark short={t.short} color={t.color} size={22} /> {t.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h3 className="mb-2 font-display text-base font-semibold text-gold-600">Practise and prove it</h3>
          <ul className="space-y-0.5 text-sm">
            {PRACTICE_LINKS.map(([to, label]) => (
              <li key={to}><Link to={to} onClick={onClose} className="block rounded-md px-2 py-1.5 hover:bg-muted">{label}</Link></li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  if (!user) return null;
  const item = 'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm hover:bg-muted';
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-full p-0.5 pr-2 hover:bg-muted" aria-expanded={open} aria-haspopup="menu">
        <Avatar name={user.name} color={user.avatarColor} size={32} />
        <ChevronDown className="h-4 w-4 text-muted-fg" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl bg-card p-2 shadow-float" onClick={() => setOpen(false)}>
          <div className="border-b border-border px-3 pb-2.5 pt-1">
            <div className="truncate font-semibold">{user.name}</div>
            <div className="truncate text-xs text-muted-fg">{user.email}</div>
            <div className="mt-1.5 flex gap-1.5">
              <span className="chip bg-gold-100 text-gold-600">{PLANS[user.plan].name}</span>
              <span className="chip bg-muted capitalize">{user.role}</span>
            </div>
          </div>
          <div className="pt-1.5">
            <Link to="/dashboard" className={item}><LayoutDashboard className="h-4 w-4" /> My learning</Link>
            {user.role !== 'student' && <Link to="/teach" className={item}><GraduationCap className="h-4 w-4" /> Teaching</Link>}
            {user.role === 'admin' && <Link to="/admin" className={item}><Shield className="h-4 w-4" /> Administration</Link>}
            <Link to="/classes" className={item}><BookOpenCheck className="h-4 w-4" /> Classes</Link>
            <Link to="/projects" className={item}><FolderCode className="h-4 w-4" /> My projects</Link>
            <Link to="/capstone" className={item}><Rocket className="h-4 w-4" /> Capstone</Link>
            <Link to="/certificates" className={item}><Award className="h-4 w-4" /> Certificates</Link>
            <Link to="/settings" className={item}><Settings className="h-4 w-4" /> Settings</Link>
            <button onClick={async () => { await logout(); navigate('/'); }} className={cn(item, 'w-full text-left text-red-700 dark:text-red-300')}><LogOut className="h-4 w-4" /> Sign out</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SiteHeader() {
  const { user } = useAuth();
  const [menu, setMenu] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const tabs = TAB_IDS.map((id) => catalog.find((t) => t.id === id)).filter((t): t is NonNullable<typeof t> => !!t);
  const activeTrack = location.pathname.split('/')[2];

  useEffect(() => { setMenu(false); setMobile(false); }, [location.pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen(true); }
      if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).isContentEditable)) { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const navLink = ({ isActive }: { isActive: boolean }) => cn('whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted', isActive && 'text-teal-600 dark:text-teal-400');

  return (
    <header className="sticky top-0 z-40">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-card focus:px-3 focus:py-2">Skip to content</a>
      <div className="relative border-b border-border bg-card">
        <div className="container flex h-16 items-center gap-3">
          <Link to="/" aria-label="Global AI Academy home" className="mr-2 shrink-0"><Logo className="hidden sm:flex" /><Logo compact className="sm:hidden" /></Link>
          <nav className="hidden items-center lg:flex" aria-label="Main">
            <button onClick={() => setMenu((m) => !m)} className={cn('flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted', menu && 'bg-muted')} aria-expanded={menu}>
              Tutorials <ChevronDown className={cn('h-4 w-4 transition-transform', menu && 'rotate-180')} />
            </button>
            <NavLink to="/reference" className={navLink}>References</NavLink>
            <NavLink to="/exercises" className={navLink}>Exercises</NavLink>
            <NavLink to="/playground" className={(a) => cn(navLink(a), "hidden xl:block")}>Playground</NavLink>
            <NavLink to="/careers" className={navLink}>Careers</NavLink>
            <NavLink to="/kids" className={navLink}>Kids Zone</NavLink>
            <NavLink to="/pricing" className={navLink}>Plans</NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={() => setSearchOpen(true)} className="flex h-10 items-center gap-2 rounded-full bg-granite-100 px-3 text-sm text-fg/70 transition-colors hover:bg-granite-200 dark:bg-night-700 2xl:w-52 2xl:px-4" aria-label="Search (Ctrl+K)">
              <Search className="h-4 w-4" /> <span className="hidden whitespace-nowrap 2xl:inline">Search lessons…</span>
              <kbd className="ml-auto hidden whitespace-nowrap font-sans text-xs text-fg/50 2xl:inline">Ctrl K</kbd>
            </button>
            <button onClick={toggle} className="btn-icon text-fg/70 hover:bg-fg/[.07] hover:text-fg" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            {user ? (
              <>
                <Link to={ROLE_HOME[user.role]} className="btn-outline btn-sm hidden sm:inline-flex">{user.role === 'student' ? 'My learning' : user.role === 'teacher' ? 'Teaching' : 'Admin'}</Link>
                <UserMenu />
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost btn-sm hidden sm:inline-flex">Sign in</Link>
                <Link to="/signup" className="btn-primary btn-sm">Join free</Link>
              </>
            )}
            <button onClick={() => setMobile((m) => !m)} className="rounded-lg p-2 hover:bg-muted lg:hidden" aria-label="Open menu" aria-expanded={mobile}>
              {mobile ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {menu && <TutorialsMenu onClose={() => setMenu(false)} />}
        {mobile && (
          <nav className="border-t border-border bg-card lg:hidden" aria-label="Mobile">
            <div className="container grid gap-1 py-3 text-sm">
              {[['/tutorials', 'All tutorials'], ['/reference', 'References'], ['/exercises', 'Exercises'], ['/quiz', 'Quizzes'], ['/challenges', 'Code challenges'], ['/playground', 'Playground'], ['/careers', 'Career paths'], ['/kids', 'Kids Zone'], ['/pricing', 'Plans'], ['/leaderboard', 'Leaderboard'], ['/contact', 'Contact']].map(([to, label]) => (
                <Link key={to} to={to!} className="rounded-md px-3 py-2.5 hover:bg-muted">{label}</Link>
              ))}
              {!user && <Link to="/login" className="rounded-md px-3 py-2.5 font-semibold hover:bg-muted">Sign in</Link>}
            </div>
          </nav>
        )}
      </div>
      {/* Language tab bar — the W3Schools-style quick switcher */}
      <nav className="bg-ink text-white dark:bg-night-800" aria-label="Tutorials quick bar">
        <div className="container flex items-center overflow-x-auto scrollbar-none">
          {tabs.map((t) => (
            <Link
              key={t.id}
              to={lessonPath(t.id)}
              className={cn(
                'shrink-0 border-b-2 px-3.5 py-2.5 text-[13px] font-semibold transition-colors hover:bg-white/10',
                activeTrack === t.id ? 'border-gold bg-white/10 text-gold' : 'border-transparent text-white/85',
              )}
            >
              {t.short}
            </Link>
          ))}
          <Link to="/tutorials" className="ml-auto shrink-0 px-3.5 py-2.5 text-[13px] text-white/75 hover:text-white">All {catalog.length} tracks</Link>
        </div>
      </nav>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}
