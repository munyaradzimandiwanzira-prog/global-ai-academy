import { toast } from 'sonner';

/**
 * Copies text and says so. Some browsers (in-app browsers, http pages, denied permission) refuse
 * the clipboard; then we fall back to a hidden textarea, and if that fails too we say so honestly.
 */
export async function copyText(text: string, done = 'Copied') {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(done);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      if (ok) { toast.success(done); return true; }
    } catch { /* fall through */ }
    toast.error('Your browser blocked copying. Select the text and copy it yourself.');
    return false;
  }
}
