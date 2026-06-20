// Opens a platform post URL in a new tab in a way that fully severs the
// opener relationship and suppresses the Referer header. This avoids
// ERR_BLOCKED_BY_RESPONSE on platforms (Threads, Instagram, X) that send
// strict Cross-Origin-Opener-Policy / Cross-Origin-Resource-Policy headers
// and refuse navigations that look like they came from a third-party opener.
//
// Why not just `window.open(url, "_blank", "noopener,noreferrer")`?
// In Chromium, passing "noopener" makes window.open() return `null`, so we
// can't perform follow-up steps on the new window. And `rel="noopener
// noreferrer"` on an <a> tag is not always enough on its own — the new tab
// can still inherit an opener context that conflicts with the destination's
// COOP response.
//
// The robust pattern used here:
//   1. Open `about:blank` WITHOUT the noopener feature so we get a handle.
//   2. Inject a `<meta name="referrer" content="no-referrer">` into the
//      blank document so the subsequent navigation sends no Referer header.
//   3. Null out `win.opener` to fully detach the opener relationship.
//   4. `location.replace()` to the real URL so the about:blank entry is not
//      kept in the tab's history.
// This produces a fully detached, referrer-less navigation — equivalent to
// the user copy-pasting the URL into a brand-new tab.
export function openExternalPostUrl(url: string | null | undefined): void {
  if (!url) return;

  try {
    // NOTE: do NOT pass "noopener" in the features string — Chromium would
    // return null and we'd lose the ability to scrub the new window.
    const win = window.open("about:blank", "_blank");
    if (win) {
      try {
        // Inject a no-referrer meta so the next navigation strips Referer.
        const doc = win.document;
        if (doc && doc.head) {
          const meta = doc.createElement("meta");
          meta.name = "referrer";
          meta.content = "no-referrer";
          doc.head.appendChild(meta);
        }
      } catch {
        // Cross-origin / sandboxed document — safe to ignore.
      }

      try {
        // Drop the opener handle so the destination cannot reach back into
        // us and Chromium treats this as an opener-less top-level navigation.
        (win as Window & { opener: unknown }).opener = null;
      } catch {
        // Some browsers throw on cross-origin opener access — safe to ignore.
      }

      try {
        // Use replace() so the temporary about:blank entry is not left in
        // the tab's history (otherwise back/refresh would land on about:blank).
        win.location.replace(url);
      } catch {
        // Last-ditch fallback within the new tab.
        try {
          win.location.href = url;
        } catch {
          /* give up — fall through to anchor fallback below */
        }
      }
      return;
    }
  } catch {
    // Fall through to the anchor-click fallback below.
  }

  // Popup blocked or window.open returned null. Use a transient anchor with
  // rel="noopener noreferrer" + referrerPolicy="no-referrer" to open a new
  // tab WITHOUT navigating the current tab away. (Falling back to
  // `window.location.href = url` would replace the current page, which is
  // worse UX than a blocked popup.)
  try {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.referrerPolicy = "no-referrer";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch {
    // Absolute last resort — only navigate the current tab if even an
    // anchor click cannot be synthesized.
    window.location.href = url;
  }
}