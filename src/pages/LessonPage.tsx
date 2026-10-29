import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, Menu, X, MessageCircle, Clock, Check, Lock } from '@/components/icons';
import type { Block } from '@shared/content';
import { describeSketch } from '@shared/sketch';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Markdown } from '@/components/Markdown';
import { UpgradeCard } from '@/components/UpgradeCard';
import { loadTrack, getCatalogTrack, lessonPath } from '@/lib/catalog';
import { useProgress } from '@/lib/progress';
import { BlockRenderer } from '@/features/lesson/blocks';
import { TutorPanel } from '@/features/lesson/TutorPanel';
import { PageLoader, ProgressBar, TrackMark } from '@/components/ui';
import { cn } from '@/lib/utils';
import NotFound from './NotFound';

export default function LessonPage() {
  const { trackId = '', lessonSlug = '' } = useParams();
  const meta = getCatalogTrack(trackId);
  const navigate = useNavigate();
  const { data: track, isLoading, error } = useQuery({ queryKey: ['track', trackId], queryFn: () => loadTrack(trackId), enabled: !!meta, staleTime: Infinity });
  const { completed, markLesson, trackProgress } = useProgress();
  const [sidebar, setSidebar] = useState(false);
  const [tutor, setTutor] = useState(false);
  const { can } = useAuth();
  const pro = can('content.pro');

  const index = track?.lessons.findIndex((l) => l.slug === lessonSlug) ?? -1;
  const lesson = index >= 0 ? track!.lessons[index] : undefined;
  const prev = index > 0 ? track!.lessons[index - 1] : undefined;
  const next = track && index >= 0 && index < track.lessons.length - 1 ? track.lessons[index + 1] : undefined;
  const isDone = completed.has(`${trackId}/${lessonSlug}`);
  // Paywalled lessons arrive from the API for entitled learners; everyone else sees the teaser.
  const locked = !!lesson?.locked;
  const proBlocks = useQuery({
    queryKey: ['pro-lesson', trackId, lessonSlug],
    queryFn: () => api.get<{ blocks: Block[] }>(`/api/content/${trackId}/${lessonSlug}`),
    enabled: locked && pro,
    staleTime: Infinity,
    retry: false,
  });
  const blocks: Block[] | null = !lesson ? null : !locked ? lesson.blocks : proBlocks.data?.blocks ?? null;
  const paywalled = locked && (!pro || proBlocks.isError);

  useEffect(() => {
    if (lesson) {
      markLesson(trackId, lesson.slug, 'started');
      document.title = `${lesson.title} — ${meta?.title} | Global AI Academy`;
    }
    setSidebar(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId, lesson?.slug]);
  useEffect(() => () => { document.title = 'Global AI Academy'; }, []);
  // Deep links such as /learn/python/lists#challenge land on the coding challenge once the lesson renders.
  useEffect(() => {
    if (!lesson || location.hash !== '#challenge') return;
    const t = window.setTimeout(() => document.querySelector('[data-challenge]')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
    return () => window.clearTimeout(t);
  }, [lesson?.slug]);

  const excerpt = useMemo(
    () => (blocks ?? []).map((b) => (b.type === 'md' ? b.md : b.type === 'run' || b.type === 'code' ? b.code : b.type === 'sketch' ? `[Diagram] ${describeSketch(b.sketch)}` : '')).join('\n\n'),
    [blocks],
  );

  if (!meta) return <NotFound />;
  if (isLoading) return <PageLoader />;
  if (error || !track) return <div className="container py-16 text-center">This track could not load. Check your connection and reload.</div>;
  if (!lesson) return <NotFound />;

  const progress = trackProgress(trackId, track.lessons.length);

  const goNext = () => {
    if (!paywalled) markLesson(trackId, lesson.slug, 'completed');
    navigate(next ? lessonPath(trackId, next.slug) : lessonPath(trackId));
  };

  const NavButtons = ({ bottom }: { bottom?: boolean }) => (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', bottom ? 'mt-12 border-t border-border pt-6' : 'mb-6')}>
      {prev ? (
        <Link to={lessonPath(trackId, prev.slug)} className="btn-primary btn-sm"><ChevronLeft className="h-4 w-4" /> Previous</Link>
      ) : <span />}
      {bottom && !isDone && !paywalled && <button onClick={() => markLesson(trackId, lesson.slug, 'completed')} className="btn-outline btn-sm"><Check className="h-4 w-4" /> Mark complete</button>}
      <button onClick={goNext} className="btn-primary btn-sm">{next ? 'Next' : 'Finish track'} <ChevronRight className="h-4 w-4" /></button>
    </div>
  );

  return (
    <div className="lg:grid lg:grid-cols-[280px_1fr]">
      {/* Lesson sidebar */}
      <aside className={cn('fixed inset-y-0 left-0 z-50 w-72 border-r border-border bg-card transition-transform lg:sticky lg:top-[105px] lg:z-0 lg:h-[calc(100vh-105px)] lg:w-auto lg:translate-x-0', sidebar ? 'translate-x-0 shadow-2xl' : '-translate-x-full')} aria-label={`${meta.title} lessons`}>
        <div className="flex h-full flex-col">
          <div className="border-b border-border p-4">
            <div className="flex items-center justify-between">
              <Link to={lessonPath(trackId)} className="flex items-center gap-2 font-display text-lg font-bold hover:text-teal-600"><TrackMark short={meta.short} color={meta.color} size={28} />{meta.title} tutorial</Link>
              <button onClick={() => setSidebar(false)} className="grid min-h-11 min-w-11 place-items-center rounded-full hover:bg-muted lg:hidden" aria-label="Close lessons"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-fg"><ProgressBar value={progress.percent} className="h-1.5" /> <span className="shrink-0">{progress.done}/{progress.total}</span></div>
          </div>
          <nav className="flex-1 overflow-y-auto py-2">
            {track.lessons.map((l) => {
              const active = l.slug === lesson.slug;
              const done = completed.has(`${trackId}/${l.slug}`);
              const lockedHere = !!l.locked && !pro;
              return (
                <Link key={l.slug} to={lessonPath(trackId, l.slug)} aria-current={active ? 'page' : undefined} className={cn('flex items-center gap-2.5 border-l-4 px-4 py-2 text-sm', active ? 'border-gold bg-gold-100/60 font-semibold dark:bg-night-700' : 'border-transparent hover:bg-muted')}>
                  {done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-teal" /> : lockedHere ? <Lock className="h-4 w-4 shrink-0 text-muted-fg" aria-label="Plus" /> : <Circle className="h-4 w-4 shrink-0 text-border" />}
                  <span className="truncate">{l.title}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
      {sidebar && <div className="fixed inset-0 z-40 bg-ink-900/40 lg:hidden" onClick={() => setSidebar(false)} />}

      {/* Lesson content */}
      <article className="min-w-0 px-4 py-6 md:px-10 lg:py-8">
        <div className="mx-auto max-w-[820px]">
          <button onClick={() => setSidebar(true)} className="btn-outline btn-sm mb-4 lg:hidden"><Menu className="h-4 w-4" /> {meta.title} lessons</button>
          <NavButtons />
          <header className="mb-6">
            <p className="text-sm font-medium text-teal-600">{meta.title} · Lesson {index + 1} of {track.lessons.length}</p>
            <h1 className="mt-1 text-[2.1rem] font-bold leading-tight md:text-[2.6rem]">{lesson.title}</h1>
            <p className="mt-2 flex items-center gap-3 text-sm text-muted-fg">
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {lesson.minutes} min</span>
              {isDone && <span className="chip bg-teal-100 text-teal-600"><CheckCircle2 className="h-3.5 w-3.5" /> Completed</span>}
            </p>
          </header>
          {paywalled ? (
            <>
              {lesson.teaser && <Markdown>{lesson.teaser}</Markdown>}
              <UpgradeCard
                className="mt-6"
                title={`Unlock the rest of ${meta.title}`}
                done={`You've finished the free preview: ${meta.preview ?? 3} lessons. The next ${track.lessons.length - (meta.preview ?? 3)} lessons go deeper, with hands-on labs, diagrams, exercises and a capstone challenge.`}
                unlocks={[
                  `${track.lessons.length - (meta.preview ?? 3)} more lessons in ${meta.title}, and every other professional track`,
                  'All Graph Lab work placements (Neo4j, GraphRAG, agent memory)',
                  'Professor Zuva, your AI tutor, on every lesson',
                  'Certificates you can share with employers',
                ]}
              />
              <NavButtons bottom />
            </>
          ) : !blocks ? (
            <PageLoader />
          ) : (
            <>
              <BlockRenderer blocks={blocks} trackId={trackId} lessonTitle={lesson.title} />
              <NavButtons bottom />
            </>
          )}
        </div>
      </article>

      <button onClick={() => setTutor(true)} className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full bg-ink px-4 py-3 text-sm font-semibold text-white shadow-2xl transition-transform hover:scale-105 dark:bg-gold dark:text-ink" aria-label="Ask the AI tutor">
        <MessageCircle className="h-5 w-5" /> <span className="hidden sm:inline">Ask Professor Zuva</span>
      </button>
      <TutorPanel open={tutor} onClose={() => setTutor(false)} trackId={trackId} lessonTitle={lesson.title} excerpt={excerpt} />
    </div>
  );
}
