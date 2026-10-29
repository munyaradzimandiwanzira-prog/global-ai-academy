import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { decompressFromEncodedURIComponent } from 'lz-string';
import { toast } from 'sonner';
import { Save } from '@/components/icons';
import type { RunLanguage } from '@shared/content';
import type { Project } from '@shared/api-types';
import { Playground } from '@/features/editor/Playground';
import { LANGUAGE_LABELS } from '@/features/runners';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button, Dialog, Field, Input } from '@/components/ui';

export const STARTERS: Partial<Record<RunLanguage, string>> = {
  python: `# Python playground: runs in your browser\nimport math\n\nradius = 3.5\nprint(f"Area of a {radius} m borehole cover: {math.pi * radius**2:.2f} m²")\n\nname = input("What is your name? ")\nprint(f"Mhoro {name}!")`,
  javascript: `// JavaScript playground\nconst rates = { USD: 1, ZiG: 26.8, ZAR: 17.9 };\nconst convert = (usd, to) => (usd * rates[to]).toFixed(2);\n\nfor (const cur of Object.keys(rates)) {\n  console.log(\`$50 = \${convert(50, cur)} \${cur}\`);\n}`,
  typescript: `type Learner = { name: string; city: string; xp: number };\n\nconst learners: Learner[] = [\n  { name: "Tariro", city: "Harare", xp: 420 },\n  { name: "Sipho", city: "Bulawayo", xp: 610 },\n];\n\nconst top = learners.reduce((a, b) => (a.xp > b.xp ? a : b));\nconsole.log(\`Top learner: \${top.name} from \${top.city}\`);`,
  html: `<!DOCTYPE html>\n<html>\n<head>\n<style>\n  body { font-family: system-ui; background: #F3F2EE; color: #142B52; padding: 2rem; }\n  h1 { color: #23807F; }\n  .card { background: white; border-radius: 16px; padding: 1rem 1.25rem; }\n</style>\n</head>\n<body>\n  <h1>Mhoro, World!</h1>\n  <div class="card">\n    <p>Edit the code on the left and press <b>Run</b>.</p>\n    <button onclick="this.textContent = 'Clicked!'">Click me</button>\n  </div>\n</body>\n</html>`,
  css: `body { font-family: system-ui; padding: 2rem; }\nh1 { color: #142B52; letter-spacing: -0.02em; }\n.box { background: #23807F; color: white; padding: 1rem; border-radius: 8px; width: 160px; }\nli:nth-child(odd) { color: #B88A2E; }`,
  sql: `-- The sample database has: Customers, Products, Categories, Orders, OrderDetails, Employees\nSELECT CustomerName, City, Province\nFROM Customers\nWHERE Province = 'Harare'\nORDER BY CustomerName;`,
  cypher: `// dataset: skuru\n// Graph playground: runs on an in-browser practice graph. Other datasets: supply, fraud, transit, kg, memory, empty\nMATCH (s:Student)-[e:ENROLLED_IN]->(c:Course)\nWHERE e.progress = 100\nRETURN s, e, c`,
  java: `public class Main {\n  public static void main(String[] args) {\n    System.out.println("Mhoro from Java!");\n  }\n}`,
  kotlin: `fun main() {\n    val cities = listOf("Harare", "Bulawayo", "Mutare")\n    cities.forEach { println("Hello, $it!") }\n}`,
  php: `<?php\n$name = "Rudo";\necho "Hello, $name!\\n";\n?>`,
  cpp: `#include <iostream>\nint main() {\n  std::cout << "Hello from C++!" << std::endl;\n  return 0;\n}`,
  c: `#include <stdio.h>\nint main(void) {\n  printf("Hello from C!\\n");\n  return 0;\n}`,
  swift: `let city = "Victoria Falls"\nprint("Welcome to \\(city)!")`,
  go: `package main\n\nimport "fmt"\n\nfunc main() {\n  fmt.Println("Hello from Go!")\n}`,
  bash: `echo "Hello from Bash"\nfor i in 1 2 3; do echo "Count $i"; done`,
};

export const PLAYGROUND_LANGS = Object.keys(STARTERS) as RunLanguage[];

/**
 * The full-screen editor. Serves three routes:
 *   /playground?lang=python[#code=…]      a scratchpad (code can travel in the URL hash)
 *   /compiler/:lang                       W3Schools-style "Python compiler" landing for each language
 *   /playground?project=<id>              a saved project, with Save writing back to it
 */
export default function PlaygroundPage() {
  const { lang: langParam } = useParams();
  const [params] = useSearchParams();
  const { hash } = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const projectId = params.get('project');
  const requested = (langParam ?? params.get('lang')) as RunLanguage;
  const project = useQuery({ queryKey: ['project', projectId], queryFn: () => api.get<{ project: Project }>(`/api/projects/${projectId}`), enabled: !!projectId && !!user });
  const lang = (project.data?.project.language as RunLanguage) ?? (PLAYGROUND_LANGS.includes(requested) ? requested : 'python');
  const isCompiler = !!langParam;

  const initial = useMemo(() => {
    if (project.data) return project.data.project.code;
    const m = /code=([^&]+)/.exec(hash);
    const shared = m ? decompressFromEncodedURIComponent(m[1]!) : null;
    return shared ?? STARTERS[lang] ?? '';
  }, [hash, lang, project.data]);

  const code = useRef(initial);
  useEffect(() => { code.current = initial; }, [initial]);
  const [saving, setSaving] = useState(false);
  const [naming, setNaming] = useState(false);
  const [title, setTitle] = useState('');

  useEffect(() => {
    document.title = isCompiler ? `${LANGUAGE_LABELS[lang]} online editor | Global AI Academy` : 'Playground | Global AI Academy';
    return () => { document.title = 'Global AI Academy'; };
  }, [lang, isCompiler]);

  const save = async (newTitle?: string) => {
    if (!user) return navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
    if (!projectId && !newTitle) {
      setTitle(`${LANGUAGE_LABELS[lang]} project`);
      return setNaming(true);
    }
    setSaving(true);
    try {
      if (projectId && project.data) {
        await api.put(`/api/projects/${projectId}`, { title: project.data.project.title, language: lang, code: code.current });
        toast.success('Saved');
      } else {
        const r = await api.post<{ project: Project }>('/api/projects', { title: newTitle, language: lang, code: code.current });
        setNaming(false);
        toast.success('Saved to My projects');
        navigate(`/playground?project=${r.project.id}`, { replace: true });
      }
      qc.invalidateQueries({ queryKey: ['projects'] });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-[calc(100dvh-105px)] flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-2">
        <h1 className="font-display text-lg font-semibold">
          {project.data ? project.data.project.title : isCompiler ? `${LANGUAGE_LABELS[lang]} online editor` : 'Playground'}
        </h1>
        {!project.data && (
          <>
            <label className="sr-only" htmlFor="lang">Language</label>
            <select id="lang" value={lang} onChange={(e) => navigate(isCompiler ? `/compiler/${e.target.value}` : `/playground?lang=${e.target.value}`)} className="input h-9 w-auto py-0">
              {PLAYGROUND_LANGS.map((l) => <option key={l} value={l}>{LANGUAGE_LABELS[l]}</option>)}
            </select>
          </>
        )}
        <span className="hidden text-sm text-fg/65 lg:inline">Ctrl/⌘ + Enter runs your code.</span>
        <div className="ml-auto flex items-center gap-2">
          {user && <Link to="/projects" className="hidden text-sm font-medium text-fg/75 hover:text-fg sm:inline">My projects</Link>}
          <Button size="sm" variant="outlined" startIcon={<Save />} loading={saving && !naming} onClick={() => save()}>{projectId ? 'Save' : 'Save as project'}</Button>
        </div>
      </div>
      <Dialog open={naming} onOpenChange={setNaming} title="Save as a project" description="Projects live in My projects. Plus members can share them by link.">
        <form onSubmit={(e) => { e.preventDefault(); if (title.trim()) void save(title.trim()); }} className="space-y-4">
          <Field label="Project name" htmlFor="pname"><Input id="pname" autoFocus maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Button type="submit" fullWidth size="lg" loading={saving} disabled={!title.trim()}>Save project</Button>
        </form>
      </Dialog>
      <div className="min-h-0 flex-1">
        <Playground key={`${lang}:${projectId ?? ''}:${project.data?.project.updatedAt ?? ''}`} language={lang} initialCode={initial} fullscreen autoRun={lang === 'html' || lang === 'css'} onCodeChange={(c) => { code.current = c; }} />
      </div>
    </div>
  );
}
