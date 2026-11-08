const { escape } = require('../views/creators');
const clean = (value, length = 150) => String(value ?? '').replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/g, ' ').replace(/\b(?:https?:\/\/|www\.)\S+/gi, '[link removed]').replace(/\s+/g, ' ').trim().slice(0, length);
const compact = (value) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value) || 0);
const number = (value) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(value) || 0);
function creatorSnapshot(creator) {
  // Explicit allowlist: contact details and internal notes never enter email or the outbox.
  return { handle: clean(creator.instagram_handle, 30).replace(/[^a-z0-9_.]/gi, ''), niche: clean(creator.niche),
    followers: Number(creator.follower_count) || 0, views: Number(creator.average_reel_views) || 0,
    country: clean(creator.country, 80), rate: Number(creator.rate_per_reel) || 0,
    source: clean(creator.source || 'Direct', 100), joinedAt: new Date(creator.created_at).toISOString() };
}
function mail(subject, lines, adminURL) {
  // All content is escaped; the only HTML link is the configured admin destination.
  const text = lines.map((line) => clean(line, 1000)).join('\n');
  return { subject: clean(subject, 240), textContent: text + '\n\nView creators: ' + adminURL,
    htmlContent: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6">${lines.map((line) => `<div>${escape(clean(line, 1000))}</div>`).join('')}<p><a href="${escape(adminURL)}">View creators in admin</a></p></div>` };
}
function joinedMail(creator, adminURL) {
  const joined = new Date(creator.joinedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
  return mail(`New creator: @${creator.handle} (${creator.niche}, ${compact(creator.followers)} followers)`, [
    `Handle: @${creator.handle}`, `Niche: ${creator.niche}`, `Followers: ${number(creator.followers)}`,
    `Average reel views: ${number(creator.views)}`, `Country: ${creator.country}`, `Rate per reel: INR ${number(creator.rate)}`,
    `Source: ${creator.source}`, `Joined: ${joined} IST`,
  ], adminURL);
}
function digestMail(title, creators, total, sources, adminURL, windowLabel) {
  const lines = [windowLabel, `${total} new creator${total === 1 ? '' : 's'}.`, ''];
  for (const creator of creators) lines.push(`@${creator.handle} | ${creator.niche} | ${compact(creator.followers)} followers | ${compact(creator.views)} average views`);
  if (total > creators.length) lines.push(`${total - creators.length} more profiles are available in admin.`);
  lines.push('', 'By source:');
  for (const [source, count] of sources) lines.push(`${clean(source)}: ${count}`);
  return mail(title, lines, adminURL);
}
// Most recent 8pm IST boundary, with a fixed 24-hour reporting window.
function digestWindow(now = new Date()) {
  const shifted = new Date(now.getTime() + 330 * 60000);
  const end = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate(), 14, 30));
  if (end > now) end.setUTCDate(end.getUTCDate() - 1);
  return { start: new Date(end.getTime() - 24 * 60 * 60 * 1000), end, key: end.toISOString().slice(0, 10) };
}
module.exports = { clean, compact, creatorSnapshot, mail, joinedMail, digestMail, digestWindow };
