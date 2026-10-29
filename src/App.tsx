import { lazy, Suspense, useEffect } from 'react';
import { Link, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { RequireAuth, RequireRole } from '@/components/layout/guards';
import { PageLoader } from '@/components/ui';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAuth } from '@/lib/auth';

const Home = lazy(() => import('@/pages/Home'));
const Tutorials = lazy(() => import('@/pages/Tutorials'));
const TrackPage = lazy(() => import('@/pages/TrackPage'));
const LessonPage = lazy(() => import('@/pages/LessonPage'));
const PlaygroundPage = lazy(() => import('@/pages/PlaygroundPage'));
const Exercises = lazy(() => import('@/pages/Exercises'));
const Careers = lazy(() => import('@/pages/Careers'));
const CareerDetail = lazy(() => import('@/pages/CareerDetail'));
const Pricing = lazy(() => import('@/pages/Pricing'));
const BillingReturn = lazy(() => import('@/pages/BillingReturn'));
const Login = lazy(() => import('@/pages/auth/Login'));
const Signup = lazy(() => import('@/pages/auth/Signup'));
const Forgot = lazy(() => import('@/pages/auth/Forgot'));
const Reset = lazy(() => import('@/pages/auth/Reset'));
const VerifyEmail = lazy(() => import('@/pages/auth/VerifyEmail'));
const Dashboard = lazy(() => import('@/pages/student/Dashboard'));
const Settings = lazy(() => import('@/pages/student/Settings'));
const Certificates = lazy(() => import('@/pages/student/Certificates'));
const Exam = lazy(() => import('@/pages/student/Exam'));
const Leaderboard = lazy(() => import('@/pages/Leaderboard'));
const Verify = lazy(() => import('@/pages/Verify'));
const Classes = lazy(() => import('@/pages/classroom/Classes'));
const ClassroomPage = lazy(() => import('@/pages/classroom/ClassroomPage'));
const AssignmentPage = lazy(() => import('@/pages/classroom/AssignmentPage'));
const TeachHome = lazy(() => import('@/pages/teacher/TeachHome'));
const AdminHome = lazy(() => import('@/pages/admin/AdminHome'));
const KidsHome = lazy(() => import('@/features/kids/KidsHome'));
const KidsGame = lazy(() => import('@/features/kids/KidsGame'));
const Contact = lazy(() => import('@/pages/Contact'));
const About = lazy(() => import('@/pages/About'));
const Legal = lazy(() => import('@/pages/Legal'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const StartPage = lazy(() => import('@/pages/practice/StartPage'));
const ReferenceIndex = lazy(() => import('@/pages/practice/ReferencePage').then((m) => ({ default: m.ReferenceIndex })));
const ReferencePage = lazy(() => import('@/pages/practice/ReferencePage'));
const QuizIndex = lazy(() => import('@/pages/practice/QuizPage').then((m) => ({ default: m.QuizIndex })));
const QuizPage = lazy(() => import('@/pages/practice/QuizPage'));
const ChallengesPage = lazy(() => import('@/pages/practice/ChallengesPage'));
const ProjectsPage = lazy(() => import('@/pages/ProjectsPage'));
const SharedProjectPage = lazy(() => import('@/pages/ProjectsPage').then((m) => ({ default: m.SharedProjectPage })));
const CapstonePage = lazy(() => import('@/pages/student/CapstonePage'));
const GraphLabIndex = lazy(() => import('@/pages/lab/GraphLab').then((m) => ({ default: m.GraphLabIndex })));
const GraphLabScenario = lazy(() => import('@/pages/lab/GraphLab'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

/** Admins without two-step login act as learners until they enrol; tell them why the admin tools are missing. */
function AdminMfaBanner() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  if (!user?.mfaSetupRequired || pathname === '/settings') return null;
  return (
    <div role="status" className="border-b border-gold/40 bg-gold-100 text-night dark:bg-gold/15 dark:text-sand">
      <div className="container flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2.5 text-sm">
        <p><strong className="font-semibold">Your admin tools are paused.</strong> Admin accounts need two-step login. It takes about two minutes.</p>
        <Link to="/settings#security" className="btn-primary btn-sm">Set up two-step login</Link>
      </div>
    </div>
  );
}

function SiteLayout({ footer = true }: { footer?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <AdminMfaBanner />
      <main id="main" className="flex-1">
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      {footer && <SiteFooter />}
    </div>
  );
}

function BareLayout() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<Home />} />
          <Route path="tutorials" element={<Tutorials />} />
          <Route path="learn/:trackId" element={<TrackPage />} />
          <Route path="exercises" element={<Exercises />} />
          <Route path="start" element={<StartPage />} />
          <Route path="reference" element={<ReferenceIndex />} />
          <Route path="reference/:refId" element={<ReferencePage />} />
          <Route path="quiz" element={<QuizIndex />} />
          <Route path="quiz/:trackId" element={<QuizPage />} />
          <Route path="challenges" element={<ChallengesPage />} />
          <Route path="lab" element={<GraphLabIndex />} />
          <Route path="p/:slug" element={<SharedProjectPage />} />
          <Route path="careers" element={<Careers />} />
          <Route path="careers/:careerId" element={<CareerDetail />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="verify" element={<Verify />} />
          <Route path="verify/:id" element={<Verify />} />
          <Route path="contact" element={<Contact />} />
          <Route path="about" element={<About />} />
          <Route path="privacy" element={<Legal kind="privacy" />} />
          <Route path="terms" element={<Legal kind="terms" />} />
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />
          <Route path="forgot-password" element={<Forgot />} />
          <Route path="reset-password" element={<Reset />} />
          <Route path="verify-email" element={<VerifyEmail />} />

          <Route element={<RequireAuth />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="settings" element={<Settings />} />
            <Route path="certificates" element={<Certificates />} />
            <Route path="exam/:trackId" element={<Exam />} />
            <Route path="classes" element={<Classes />} />
            <Route path="classes/:id" element={<ClassroomPage />} />
            <Route path="assignments/:id" element={<AssignmentPage />} />
            <Route path="billing/return" element={<BillingReturn />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="capstone" element={<CapstonePage />} />
          </Route>
          <Route element={<RequireRole roles={['teacher', 'admin']} />}>
            <Route path="teach" element={<TeachHome />} />
          </Route>
          <Route element={<RequireRole roles={['admin']} />}>
            <Route path="admin/*" element={<AdminHome />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route element={<SiteLayout footer={false} />}>
          <Route path="learn/:trackId/:lessonSlug" element={<LessonPage />} />
          <Route path="playground" element={<PlaygroundPage />} />
          <Route path="compiler/:lang" element={<PlaygroundPage />} />
          <Route path="lab/:scenarioId" element={<GraphLabScenario />} />
        </Route>

        <Route element={<BareLayout />}>
          <Route path="kids" element={<KidsHome />} />
          <Route path="kids/:game" element={<KidsGame />} />
        </Route>
      </Routes>
    </>
  );
}
