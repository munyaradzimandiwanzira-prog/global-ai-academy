import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

/** Safe Markdown renderer (no raw HTML). Internal links use the client router. */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn('lesson-prose', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href = '', children: c }) =>
            href.startsWith('/') ? (
              <Link to={href}>{c}</Link>
            ) : (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {c}
              </a>
            ),
          table: ({ children: c }) => (
            <div className="not-prose my-5 overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm [&_td]:border-t [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_th]:bg-sand-200 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold dark:[&_th]:bg-night-700">{c}</table>
            </div>
          ),
          pre: ({ children: c }) => <pre className="not-prose overflow-x-auto rounded-lg bg-night p-4 font-mono text-[13px] leading-relaxed text-sand">{c}</pre>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
