import { Link } from 'react-router-dom';
import { ArrowLeft } from '@/components/icons';
import { KID_GAMES } from '@shared/kids-games';
import { KID_LEVELS, STAGES, STRANDS, STRAND_ORDER, SUBJECTS, levelHref, levelsAt, type KidLevel, type StrandId } from '@shared/kids-curriculum';
import { useEffect } from 'react';

const title = (game: string) => KID_GAMES.find((g) => g.id === game)?.title ?? game;
const at = (strand: StrandId, stage: number) => KID_LEVELS.filter((l) => l.stage === stage && l.strands.includes(strand));

function LevelChip({ l }: { l: KidLevel }) {
  return (
    <Link to={levelHref(l)} title={l.goal} className="block rounded-lg bg-[#EEF4F3] px-2 py-1 text-[13px] leading-snug hover:bg-[#D6EBE8]">
      <span className="font-bold">{title(l.game)}</span> <span className="text-ink/70">{l.name}</span>
    </Link>
  );
}

/**
 * For parents and teachers: how the Kids Zone lines up with Cambridge Primary stages and strands.
 * Our own mapping, stated as such; the goals are our words.
 */
export default function KidsCurriculum() {
  useEffect(() => { document.title = 'Kids Zone curriculum map | Global AI Academy'; return () => { document.title = 'Global AI Academy'; }; }, []);
  const cols = STAGES.map((s) => s.id);
  return (
    <div className="min-h-screen bg-[#EEF4F3] font-kids text-ink">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4">
        <Link to="/kids" className="flex h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold"><ArrowLeft className="h-4 w-4" /> Kids Zone</Link>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-20">
        <p className="text-sm font-bold uppercase tracking-wide text-[#1C6B6A]">For parents and teachers</p>
        <h1 className="mt-1 text-4xl font-extrabold leading-tight sm:text-5xl">Kids Zone curriculum map</h1>
        <p className="mt-4 max-w-3xl text-lg text-ink/80">
          Each of the {KID_LEVELS.length} levels across {KID_GAMES.length} games is placed on a Cambridge Primary stage and tagged with the curriculum strands it practises in Computing, Science and Maths. Children pick their stage in the Kids Zone and get the levels made for them; every level here links straight to it.
        </p>

        <section aria-labelledby="stages" className="mt-10">
          <h2 id="stages" className="text-2xl font-bold sm:text-3xl">The stages</h2>
          <div className="mt-4 overflow-hidden rounded-3xl border-4 border-ink bg-white">
            <table className="w-full text-left text-[15px]">
              <caption className="sr-only">Stages, ages, Zimbabwe classes and number of Kids Zone levels</caption>
              <thead className="bg-ink text-white">
                <tr><th scope="col" className="px-4 py-3">Stage</th><th scope="col" className="px-4 py-3">Ages</th><th scope="col" className="hidden px-4 py-3 sm:table-cell">Zimbabwe class</th><th scope="col" className="hidden px-4 py-3 md:table-cell">Ready for</th><th scope="col" className="px-4 py-3 text-right">Levels</th></tr>
              </thead>
              <tbody className="divide-y-2 divide-ink/5">
                {STAGES.map((s) => (
                  <tr key={s.id}>
                    <th scope="row" className="px-4 py-3 font-bold">{s.name}<span className="block text-[12px] font-semibold text-ink/75">{s.programme}</span></th>
                    <td className="px-4 py-3 tabular">{s.ages}</td>
                    <td className="hidden px-4 py-3 sm:table-cell">{s.grade}</td>
                    <td className="hidden px-4 py-3 text-ink/75 md:table-cell">{s.blurb}</td>
                    <td className="px-4 py-3 text-right font-bold tabular">{levelsAt(s.id).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 max-w-3xl text-[15px] text-ink/70">Ages and classes are a guide: schools start stages at different ages, and children often work above or below their year in one subject. Choose by what the child can do.</p>
        </section>

        {SUBJECTS.map((subject) => {
          const strands = STRAND_ORDER.filter((s) => STRANDS[s].subject === subject.id && KID_LEVELS.some((l) => l.strands.includes(s)));
          return (
            <section key={subject.id} aria-labelledby={`sub-${subject.id}`} className="mt-12">
              <h2 id={`sub-${subject.id}`} className="text-2xl font-bold sm:text-3xl">{subject.name}</h2>
              <p className="mt-1 text-[15px] text-ink/70">Strands from {subject.framework}.</p>

              {/* Wide screens: strands down, stages across. */}
              <div className="mt-4 hidden overflow-hidden rounded-3xl border-4 border-ink bg-white lg:block">
                <table className="w-full table-fixed text-left align-top">
                  <caption className="sr-only">{subject.name} strands by stage, with the Kids Zone levels for each</caption>
                  <thead className="bg-ink text-white">
                    <tr>
                      <th scope="col" className="w-44 px-3 py-2.5 text-[14px]">Strand</th>
                      {cols.map((c) => <th key={c} scope="col" className="px-2 py-2.5 text-[14px]">Stage {c}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-ink/5">
                    {strands.map((st) => (
                      <tr key={st}>
                        <th scope="row" className="px-3 py-3 align-top text-[15px] font-bold">{STRANDS[st].name}</th>
                        {cols.map((c) => (
                          <td key={c} className="px-1.5 py-2 align-top">
                            <div className="space-y-1">{at(st, c).map((l) => <LevelChip key={l.key} l={l} />)}</div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Phones and tablets: one card per strand, its levels by stage. */}
              <div className="mt-4 space-y-3 lg:hidden">
                {strands.map((st) => (
                  <details key={st} className="rounded-3xl border-4 border-ink bg-white">
                    <summary className="flex min-h-12 cursor-pointer items-center justify-between px-4 py-2.5 text-[17px] font-bold">
                      {STRANDS[st].name}
                      <span className="text-sm font-semibold text-ink/75">{KID_LEVELS.filter((l) => l.strands.includes(st)).length} levels</span>
                    </summary>
                    <div className="space-y-3 border-t-2 border-ink/10 px-4 pb-4 pt-3">
                      {cols.filter((c) => at(st, c).length).map((c) => (
                        <div key={c}>
                          <h3 className="text-[14px] font-bold text-[#23807F]">Stage {c}</h3>
                          <div className="mt-1 space-y-1">{at(st, c).map((l) => <LevelChip key={l.key} l={l} />)}</div>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          );
        })}

        <section aria-labelledby="about-map" className="mt-12 max-w-3xl rounded-3xl bg-white p-6">
          <h2 id="about-map" className="text-xl font-bold">About this map</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] text-ink/80">
            <li>We placed each level by what it asks of a child, using the strands of the Cambridge Primary Computing (0059), Science (0097) and Mathematics (0096) curriculum frameworks, with Stage 7 from Cambridge Lower Secondary.</li>
            <li>This is our own guidance. It is not produced or endorsed by Cambridge University Press &amp; Assessment, and the goals are written in our words, not quoted from the frameworks.</li>
            <li>The games add topics the frameworks treat lightly at primary level, such as artificial intelligence and the Linux command line, and place them where the underlying skills fit.</li>
            <li>Teachers: every level has its own link. Share it with a class to open the game on that level.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
