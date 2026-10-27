import type { RunOptions, RunResult } from './types';

/**
 * HTML/CSS/JS documents render in a sandboxed iframe (scripts allowed, same-origin NOT
 * allowed, so the page cannot read cookies or call our API). A small bridge script forwards
 * console output and, for challenges, runs DOM tests after load.
 */
export function buildDocument(code: string, lang: 'html' | 'css', tests?: string): string {
  const body = lang === 'css'
    ? `<!doctype html><html><head><style>${code}</style></head><body><h1>Heading</h1><p class="intro">A paragraph with a <a href="#">link</a>.</p><div id="box" class="box">Box</div><ul><li>One</li><li>Two</li></ul><button>Button</button></body></html>`
    : code;
  const bridge = `<script>(function(){
    var send=function(kind,args){try{parent.postMessage({__gaa:true,type:'out',kind:kind,text:Array.prototype.map.call(args,function(a){try{return typeof a==='string'?a:JSON.stringify(a)}catch(e){return String(a)}}).join(' ')},'*')}catch(e){}};
    ['log','info'].forEach(function(k){var o=console[k];console[k]=function(){send('stdout',arguments);o&&o.apply(console,arguments)}});
    ['warn','error'].forEach(function(k){var o=console[k];console[k]=function(){send('stderr',arguments);o&&o.apply(console,arguments)}});
    window.addEventListener('error',function(e){send('stderr',[e.message+(e.lineno?' (line '+e.lineno+')':'')])});
    document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href]');if(a&&!a.getAttribute('href').startsWith('#')){e.preventDefault();send('info',['Links are disabled in the preview: '+a.getAttribute('href')])}},true);
    ${tests ? `window.addEventListener('load',function(){setTimeout(function(){var assert=function(c,m){if(!c)throw new Error(m||'Assertion failed')};try{${tests}\n;parent.postMessage({__gaa:true,type:'test',passed:true},'*')}catch(t){parent.postMessage({__gaa:true,type:'test',passed:false,message:t.message},'*')}},50)});` : ''}
  })();<\/script>`;
  if (/<head[^>]*>/i.test(body)) return body.replace(/<head[^>]*>/i, (m) => `${m}${bridge}`);
  return `${bridge}${body}`;
}

/** For HTML the "run" produces a document; the preview component mounts it and reports tests. */
export async function runHtml(code: string, opts: RunOptions & { lang: 'html' | 'css' }): Promise<RunResult> {
  return { ok: true, lines: [], html: buildDocument(code, opts.lang, opts.tests), durationMs: 0 };
}
