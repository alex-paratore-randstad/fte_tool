/**
 * Opens a URL in a new browser tab.
 *
 * Domo serves this app inside a sandboxed iframe without `allow-popups`, which
 * silently suppresses both target="_blank" and window.open(). Domo's escape
 * hatch is domo.navigate(url, isNewWindow), which is just a postMessage to the
 * host frame — so we send that message directly rather than loading the 39KB
 * SDK at public/assets/domo.js (it also installs a document-wide
 * MutationObserver we don't want in a React SPA).
 */
export function openExternalLink(url: string) {
  // Static export evaluates modules at build time, where there is no window.
  if (typeof window === 'undefined' || !url) return;

  // Not framed (e.g. `npm run dev` on localhost:9002) — a normal popup works.
  // Comparing window references is safe even when the parent is cross-origin,
  // and unlike document.referrer it is not blanked out by the sandbox.
  if (window.parent === window) {
    window.open(url, '_blank', 'noopener,noreferrer');
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
  }
}
