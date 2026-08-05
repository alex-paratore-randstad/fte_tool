/**
 * Opens a URL in a new browser tab.
 *
 * Domo serves this app inside a sandboxed iframe without `allow-popups`, which
 * silently suppresses both target="_blank" and window.open(). Domo's escape
 * hatch is domo.navigate(url, isNewWindow), which is just a postMessage to the
 * host frame — so we send that message directly rather than loading the 39KB
 * SDK at public/assets/domo.js (it also installs a document-wide
 * MutationObserver we don't want in a React SPA).
 *
 * Domo's host then applies its own allowlist of navigable domains and refuses
 * anything outside it, so a delivered message is not the same as an opened tab.
 * `onBlocked` reports that case — see the comment on the timer below.
 */
export function openExternalLink(url: string, onBlocked?: () => void) {
  // Static export evaluates modules at build time, where there is no window.
  if (typeof window === 'undefined' || !url) return;

  // Not framed (e.g. `npm run dev` on localhost:9002) — a normal popup works.
  // Comparing window references is safe even when the parent is cross-origin,
  // and unlike document.referrer it is not blanked out by the sandbox.
  if (window.parent === window) {
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) onBlocked?.();
    return;
  }

  try {
    // Same message shape and targetOrigin as the Domo SDK. Domo's host listener
    // does JSON.parse(e.data), so the payload must be a string, not an object.
    window.parent.postMessage(
      JSON.stringify({ event: 'navigate', url, isNewWindow: true }),
      '*'
    );
    // Inside Domo you cannot spy on a cross-origin postMessage, so this line is
    // the only practical way to confirm the click reached us. Keep it.
    console.debug('[external-link] asked Domo host to open', url);
  } catch (error) {
    console.warn('[external-link] postMessage to Domo host failed', error);
    onBlocked?.();
    return;
  }

  // Domo answers a *rejected* navigate with nothing but a console warning in
  // its own frame ("tried to navigate to a currently unsupported domain") —
  // there is no reply message to listen for. So infer the outcome: a tab that
  // actually opened takes the foreground, which makes this document hidden
  // (visibility is inherited from the top-level page, so it works in an
  // iframe). Still visible a beat later means nothing happened.
  //
  // Deliberately not also checking document.hasFocus(): that is false whenever
  // the browser window itself is unfocused, which would silently suppress the
  // fallback in exactly the situation it exists for. A tab opened in the
  // background is a false positive here, costing only a redundant notice.
  if (onBlocked) {
    window.setTimeout(() => {
      if (document.visibilityState === 'visible') onBlocked();
    }, 700);
  }
}

/**
 * Copies text, preferring the async Clipboard API and falling back to the
 * legacy selection trick. The fallback matters here: the async API needs
 * allow="clipboard-write" on the iframe, which Domo does not set, so inside
 * Domo the first branch is expected to fail.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permissions policy blocked it — fall through to execCommand.
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
