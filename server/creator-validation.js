const { NICHES } = require('./creator-config');
function normalizeHandle(value) {
  let handle = typeof value === 'string' ? value.trim() : '';
  if (/^(https?:\/\/)?(www\.)?instagram\.com\//i.test(handle)) {
    try { const url = new URL(/^https?:\/\//i.test(handle) ? handle : 'https://' + handle); handle = url.pathname.replace(/^\/+|\/+$/g, ''); } catch { return ''; }
  }
  return handle.replace(/^@/, '').toLowerCase();
}
function validateCreator(body, { manual = false, admin = manual, requireConsent = true } = {}) {
  const errors = {};
  const data = {};
  const text = (key, max, label) => {
    const value = typeof body[key] === 'string' ? body[key].trim() : '';
    if (!value || value.length > max || /[\u0000-\u001f\u007f<>]/.test(value)) errors[key] = `${label} is required and must be under ${max + 1} characters, without markup.`;
    return value;
  };
  data.fullName = text('fullName', 120, 'Full name');
  data.instagramHandle = normalizeHandle(body.instagramHandle);
  if (!/^[a-z0-9_](?:[a-z0-9_.]{0,28}[a-z0-9_])?$/.test(data.instagramHandle) || data.instagramHandle.includes('..')) errors.instagramHandle = 'Enter a valid Instagram handle, such as @yourname.';
  data.niche = typeof body.niche === 'string' ? body.niche : '';
  if (!NICHES.includes(data.niche)) errors.niche = 'Choose your main niche.';
  for (const key of ['followerCount', 'averageReelViews']) {
    const value = typeof body[key] === 'number' ? String(body[key]) : body[key];
    if (manual && (value === undefined || value === null || value === '')) { data[key] = null; continue; }
    if (typeof value !== 'string' || !/^\d{1,10}$/.test(value) || Number(value) > 2000000000) errors[key] = 'Enter a whole number from 0 to 2,000,000,000.';
    data[key] = Number(value);
  }
  data.country = text('country', 80, 'Country');
  const rate = typeof body.ratePerReel === 'number' ? String(body.ratePerReel) : body.ratePerReel;
  if (manual && (rate === undefined || rate === null || rate === '')) data.ratePerReel = null;
  else {
    if (typeof rate !== 'string' || !/^\d{1,9}(\.\d{1,2})?$/.test(rate)) errors.ratePerReel = 'Enter your rate in INR, with up to two decimal places.';
    data.ratePerReel = rate;
  }
  const phone = typeof body.whatsapp === 'string' ? body.whatsapp.trim() : '';
  data.whatsapp = phone.replace(/[ +()\-]/g, '');
  if (manual && (body.whatsapp === undefined || body.whatsapp === null || body.whatsapp === '')) data.whatsapp = null;
  else if (!/^[+\d ()\-]+$/.test(phone) || !/^[1-9]\d{7,14}$/.test(data.whatsapp)) errors.whatsapp = 'Include your country code, for example +91 followed by your number.';
  if (manual && (body.email === undefined || body.email === null || body.email === '')) data.email = null;
  else {
    data.email = text('email', 254, 'Email').toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Enter a valid email address.';
  }
  if (requireConsent && !['on', 'true', true].includes(body.consent)) errors.consent = 'Please agree before joining the network.';
  data.source = typeof body.source === 'string' ? body.source.trim().slice(0, 100) : '';
  if (data.source && !/^[a-zA-Z0-9_.\-]{1,100}$/.test(data.source)) data.source = '';
  if (admin) {
    if (body.source !== undefined && (typeof body.source !== 'string' || body.source.trim().length > 100 || (body.source.trim() && !/^[a-zA-Z0-9_.\-]+$/.test(body.source.trim())))) errors.source = 'Use up to 100 letters, numbers, dots, underscores or hyphens.';
    if (manual) data.source ||= 'dm-manual';
    data.internalNotes = typeof body.internalNotes === 'string' ? body.internalNotes.trim() : '';
    if ((body.internalNotes !== undefined && typeof body.internalNotes !== 'string') || data.internalNotes.length > 5000 || /\u0000/.test(data.internalNotes)) errors.internalNotes = 'Use up to 5000 characters for internal notes.';
    if (errors.consent) errors.consent = 'Confirm the creator agreed in DM to storing their details and sharing their profile with brands.';
  }
  return { data, errors };
}
module.exports = { normalizeHandle, validateCreator };
