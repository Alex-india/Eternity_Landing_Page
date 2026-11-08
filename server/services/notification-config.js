function notificationConfig() {
  const enabled = process.env.NOTIFICATIONS_ENABLED === 'true';
  const missing = [];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((process.env.OWNER_EMAIL || '').trim())) missing.push('OWNER_EMAIL');
  if (!process.env.BREVO_API_KEY || process.env.BREVO_API_KEY.includes('your-brevo')) missing.push('BREVO_API_KEY');
  if (!process.env.BREVO_SENDER_EMAIL || process.env.BREVO_SENDER_EMAIL.includes('your-verified')) missing.push('BREVO_SENDER_EMAIL');
  let adminURL;
  try {
    const base = new URL(process.env.ADMIN_BASE_URL);
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash || base.pathname !== '/' || (process.env.NODE_ENV === 'production' && base.protocol !== 'https:') || base.hostname.includes('replace-')) throw new Error('Invalid base URL');
    adminURL = base.origin + '/admin/creators';
  } catch { missing.push('ADMIN_BASE_URL'); }
  const limit = Number(process.env.NOTIFY_HOURLY_LIMIT || 20);
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) missing.push('NOTIFY_HOURLY_LIMIT (1–200)');
  return { enabled, ready: enabled && !missing.length, missing, adminURL, hourlyLimit: limit, owner: (process.env.OWNER_EMAIL || '').trim().toLowerCase() };
}
function warnNotificationConfig() {
  const config = notificationConfig();
  if (config.enabled && config.missing.length) console.warn('[notifications] WARNING: owner emails are disabled until these settings are configured: ' + config.missing.join(', ') + '. No credentials are logged.');
}
module.exports = { notificationConfig, warnNotificationConfig };
