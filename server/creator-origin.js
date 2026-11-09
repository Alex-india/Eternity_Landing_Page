// Public creator intake has no logged-in privileges. The signed form token is
// still required for every submission, including opaque/in-app browser origins.
function creatorOriginAllowed(req) {
  const origin = req.get('origin');
  // Native form POSTs under no-referrer can legitimately use Origin: null.
  // Accept already-open forms as well as browsers that omit this header.
  if (!origin || origin === 'null') return true;
  const allowed = new Set([`${req.protocol}://${req.get('host')}`]);
  // Compare trusted public configuration too: the proxy may use an internal Host.
  for (const value of [process.env.ADMIN_BASE_URL, process.env.RENDER_EXTERNAL_URL,
    process.env.NODE_ENV !== 'production' ? process.env.FRONTEND_URL : undefined]) {
    try {
      const url = new URL(value);
      if (['http:', 'https:'].includes(url.protocol)) allowed.add(url.origin);
    } catch { /* An absent public URL does not prevent same-origin submissions. */ }
  }
  return allowed.has(origin);
}
module.exports = { creatorOriginAllowed };
