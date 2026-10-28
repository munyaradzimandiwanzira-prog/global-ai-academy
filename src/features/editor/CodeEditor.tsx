import { useEffect, useMemo, useState } from 'react';
import CodeMirror, { EditorView, keymap, type Extension } from '@uiw/react-codemirror';
import { HighlightStyle, syntaxHighlighting, StreamLanguage, indentUnit } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import type { RunLanguage } from '@shared/content';

const nightTheme = EditorView.theme(
  {
    '&': { color: '#E8E1D2', backgroundColor: '#0E1A30' },
    '.cm-content': { caretColor: '#D4A64A', padding: '12px 0' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#D4A64A', borderLeftWidth: '2px' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': { backgroundColor: '#2A4470 !important' },
    '.cm-gutters': { backgroundColor: '#0E1A30', color: '#55688C', border: 'none', paddingLeft: '6px' },
    '.cm-activeLine': { backgroundColor: '#13233F' },
    '.cm-activeLineGutter': { backgroundColor: '#13233F', color: '#D4A64A' },
    '.cm-matchingBracket': { backgroundColor: '#23807F55', outline: 'none' },
    '.cm-tooltip': { backgroundColor: '#13233F', border: '1px solid #284A80', color: '#E8E1D2' },
    '.cm-tooltip-autocomplete ul li[aria-selected]': { backgroundColor: '#23807F', color: '#fff' },
  },
  { dark: true },
);

const nightHighlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.operatorKeyword, t.moduleKeyword], color: '#E6A157' },
  { tag: [t.string, t.special(t.string), t.regexp], color: '#9BD39B' },
  { tag: [t.number, t.bool, t.null, t.atom], color: '#F2C66D' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: '#6E81A6', fontStyle: 'italic' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#7CC7E8' },
  { tag: [t.definition(t.variableName), t.definition(t.function(t.variableName))], color: '#8FD3D1' },
  { tag: [t.className, t.typeName, t.namespace], color: '#F0D78C' },
  { tag: [t.propertyName, t.attributeName], color: '#C6B6F2' },
  { tag: [t.tagName, t.angleBracket], color: '#F28B82' },
  { tag: [t.operator, t.punctuation], color: '#B9C3D6' },
  { tag: t.heading, color: '#D4A64A', fontWeight: 'bold' },
  { tag: t.invalid, color: '#FF6B6B' },
]);

const sandTheme = EditorView.theme({
  '&': { color: '#142B52', backgroundColor: '#FBF8F2' },
  '.cm-content': { caretColor: '#23807F', padding: '12px 0' },
  '.cm-gutters': { backgroundColor: '#FBF8F2', color: '#A8987A', border: 'none' },
  '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: '#F2EBDD' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': { backgroundColor: '#D4A64A44 !important' },
});

const sandHighlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword], color: '#9C4A12', fontWeight: '600' },
  { tag: [t.string, t.special(t.string)], color: '#2F7D32' },
  { tag: [t.number, t.bool, t.null], color: '#B4472A' },
  { tag: t.comment, color: '#8C8270', fontStyle: 'italic' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#1C6B6A' },
  { tag: [t.className, t.typeName], color: '#6B3A1E' },
  { tag: [t.tagName], color: '#B4472A' },
  { tag: [t.attributeName, t.propertyName], color: '#5B3FA0' },
]);

/** Grammars are loaded on demand so learners only download the language they are using. */
const languageCache = new Map<string, Promise<Extension[]>>();
function loadLanguage(lang: RunLanguage | string): Promise<Extension[]> {
  const cached = languageCache.get(lang);
  if (cached) return cached;
  const load = async (): Promise<Extension[]> => {
    switch (lang) {
      case 'python': return [(await import('@codemirror/lang-python')).python(), indentUnit.of('    ')];
      case 'javascript': return [(await import('@codemirror/lang-javascript')).javascript({ jsx: true })];
      case 'typescript': return [(await import('@codemirror/lang-javascript')).javascript({ typescript: true })];
      case 'html': return [(await import('@codemirror/lang-html')).html()];
      case 'css': return [(await import('@codemirror/lang-css')).css()];
      case 'sql': { const m = await import('@codemirror/lang-sql'); return [m.sql({ dialect: m.SQLite, upperCaseKeywords: true })]; }
      case 'java': return [(await import('@codemirror/lang-java')).java()];
      case 'c':
      case 'cpp': return [(await import('@codemirror/lang-cpp')).cpp()];
      case 'php': return [(await import('@codemirror/lang-php')).php()];
      case 'kotlin': return [StreamLanguage.define((await import('@codemirror/legacy-modes/mode/clike')).kotlin)];
      case 'swift': return [StreamLanguage.define((await import('@codemirror/legacy-modes/mode/swift')).swift)];
      case 'go': return [StreamLanguage.define((await import('@codemirror/legacy-modes/mode/go')).go)];
      case 'bash': return [StreamLanguage.define((await import('@codemirror/legacy-modes/mode/shell')).shell)];
      case 'cypher': return [StreamLanguage.define((await import('@codemirror/legacy-modes/mode/cypher')).cypher)];
      default: return [];
    }
  };
  const p = load().catch(() => []);
  languageCache.set(lang, p);
  return p;
}

export interface CodeEditorProps {
  value: string;
  onChange?: (v: string) => void;
  language: RunLanguage | string;
  readOnly?: boolean;
  onRun?: () => void;
  height?: string;
  minHeight?: string;
  light?: boolean;
  className?: string;
  ariaLabel?: string;
}

export default function CodeEditor({ value, onChange, language, readOnly, onRun, height, minHeight, light, className, ariaLabel }: CodeEditorProps) {
  const [langExt, setLangExt] = useState<Extension[]>([]);
  useEffect(() => {
    let alive = true;
    void loadLanguage(language).then((e) => alive && setLangExt(e));
    return () => { alive = false; };
  }, [language]);

  const extensions = useMemo(() => {
    const ext: Extension[] = [
      ...langExt,
      syntaxHighlighting(light ? sandHighlight : nightHighlight),
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({ 'aria-label': ariaLabel ?? `${language} code editor` }),
    ];
    if (onRun) {
      ext.push(keymap.of([{ key: 'Mod-Enter', preventDefault: true, run: () => (onRun(), true) }, { key: 'Shift-Enter', preventDefault: true, run: () => (onRun(), true) }]));
    }
    return ext;
  }, [langExt, language, onRun, light, ariaLabel]);

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      editable={!readOnly}
      theme={light ? sandTheme : nightTheme}
      extensions={extensions}
      height={height}
      minHeight={minHeight}
      className={className}
      basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: !readOnly, highlightActiveLineGutter: !readOnly, autocompletion: !readOnly, searchKeymap: true, tabSize: language === 'python' ? 4 : 2 }}
    />
  );
}
