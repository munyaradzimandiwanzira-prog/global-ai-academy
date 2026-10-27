import { Link } from 'react-router-dom';
import { SITE } from '@shared/config';
import { lessonPath } from '@/lib/catalog';

const COLUMNS: { title: string; links: [string, string][] }[] = [
  {
    title: 'Learn',
    links: [
      [lessonPath('python'), 'Python'], [lessonPath('html'), 'HTML'], [lessonPath('javascript'), 'JavaScript'], [lessonPath('sql'), 'SQL'],
      [lessonPath('ai-fundamentals'), 'AI fundamentals'], [lessonPath('rag'), 'RAG'], [lessonPath('ai-agents'), 'AI agents'], ['/tutorials', 'All tutorials'],
    ],
  },
  {
    title: 'Practise',
    links: [['/start', 'Where to start'], ['/reference', 'References'], ['/exercises', 'Exercises'], ['/quiz', 'Quizzes'], ['/challenges', 'Code challenges'], ['/compiler/python', 'Online editors'], ['/kids', 'Kids Zone']],
  },
  {
    title: 'Academy',
    links: [['/careers', 'Career paths'], ['/pricing', 'Plans and pricing'], ['/classes', 'Classrooms'], ['/certificates', 'Get certified'], ['/verify', 'Verify a certificate'], ['/leaderboard', 'Leaderboard']],
  },
  {
    title: 'About',
    links: [['/about', 'About us'], ['/contact', 'Contact'], ['/privacy', 'Privacy'], ['/terms', 'Terms']],
  },
];

/** A designed close: contact you can act on, the sitemap, and the name returning at full width. */
export function SiteFooter() {
  const wa = `https://wa.me/${SITE.contact.whatsapp.replace(/\D/g, '')}`;
  return (
    <footer className="bg-ink text-white dark:bg-night-800">
      <div className="chevron-band" aria-hidden="true" />
      <div className="container grid gap-12 py-16 lg:grid-cols-[1.3fr_2fr]">
        <div>
          <h2 className="font-display text-3xl font-bold">Come and see us</h2>
          <address className="mt-5 space-y-2 text-[16px] not-italic text-white/85">
            <p><a href={SITE.contact.mapsUrl} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:text-white hover:underline">{SITE.contact.address}</a></p>
            <p><a href={`mailto:${SITE.contact.email}`} className="underline-offset-4 hover:text-white hover:underline">{SITE.contact.email}</a></p>
            <p><a href={`tel:${SITE.contact.phone.replace(/\s/g, '')}`} className="underline-offset-4 hover:text-white hover:underline">{SITE.contact.phone}</a> · {SITE.contact.hours}</p>
          </address>
          <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-gold btn-lg mt-6">Chat on WhatsApp</a>
        </div>
        <nav className="grid grid-cols-2 gap-8 sm:grid-cols-4" aria-label="Footer">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="font-display text-base font-semibold text-gold">{col.title}</h3>
              <ul className="mt-3 space-y-2 text-[15px] text-white/80">
                {col.links.map(([to, label]) => <li key={to}><Link to={to} className="hover:text-white">{label}</Link></li>)}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="container overflow-hidden pb-6">
        <p className="select-none font-display font-bold leading-[0.85] tracking-display text-white/[.12]" style={{ fontSize: 'clamp(2.4rem, 9.6vw, 9.5rem)', whiteSpace: 'nowrap' }} aria-hidden="true">Global AI Academy</p>
        <p className="mt-6 flex flex-wrap justify-between gap-3 text-sm text-white/65">
          <span>© {new Date().getFullYear()} {SITE.name}. Made in Harare for the world.</span>
          <span>Mhoroi · Salibonani · Welcome</span>
        </p>
      </div>
    </footer>
  );
}
