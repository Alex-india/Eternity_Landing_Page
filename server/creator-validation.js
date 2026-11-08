const { NICHES } = require('./creator-config');
function normalizeHandle(value) {
  let handle = typeof value === 'string' ? value.trim() : '';
  if (/^(https?:\/\/)?(www\.)?instagram\.com\//i.test(handle)) {
    try { const url = new URL(/^https?:\/\//i.test(handle) ? handle : 'https://' + handle); handle = url.pathname.replace(/^\/+|\/+$/g, ''); } catch { return ''; }
  }
  return handle.replace(/^@/, '').toLowerCase();
}
function validateCreator(body) {
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
    if (typeof value !== 'string' || !/^\d{1,10}$/.test(value) || Number(value) > 2000000000) errors[key] = 'Enter a whole number from 0 to 2,000,000,000.';
    data[key] = Number(value);
  }
  data.country = text('country', 80, 'Country');
  const rate = typeof body.ratePerReel === 'number' ? String(body.ratePerReel) : body.ratePerReel;
  if (typeof rate !== 'string' || !/^\d{1,9}(\.\d{1,2})?$/.test(rate)) errors.ratePerReel = 'Enter your rate in INR, with up to two decimal places.';
  data.ratePerReel = rate;
  const phone = typeof body.whatsapp === 'string' ? body.whatsapp.trim() : '';
  data.whatsapp = phone.replace(/[ +()\-]/g, '');
  if (!/^[+\d ()\-]+$/.test(phone) || !/^[1-9]\d{7,14}$/.test(data.whatsapp)) errors.whatsapp = 'Include your country code, for example +91 followed by your number.';
  data.email = text('email', 254, 'Email').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Enter a valid email address.';
  if (!['on', 'true', true].includes(body.consent)) errors.consent = 'Please agree before joining the network.';
  data.source = typeof body.source === 'string' ? body.source.trim().slice(0, 100) : '';
  if (data.source && !/^[a-zA-Z0-9_.\-]{1,100}$/.test(data.source)) data.source = '';
  return { data, errors };
}
module.exports = { normalizeHandle, validateCreator };
