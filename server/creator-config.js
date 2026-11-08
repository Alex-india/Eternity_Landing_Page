const NICHES = ['Beauty & skincare', 'Fashion', 'Fitness & wellness', 'Food', 'Travel', 'Technology', 'Gaming', 'Lifestyle', 'Education', 'Parenting', 'Comedy & entertainment', 'Other'];
const CONSENT_VERSION = 'creator-sharing-v1';
function agencyName() { return process.env.CREATOR_AGENCY_NAME || 'Eternity Creator Network'; }
function whatsappNumber() { const number = process.env.CREATOR_WHATSAPP_NUMBER || ''; return /^[1-9]\d{7,14}$/.test(number) ? number : ''; }
function whatsappLink(handle = '') {
  const number = whatsappNumber();
  if (!number) return '';
  const message = 'Hi, I just joined the creator network' + (handle ? ' as @' + handle : '') + '. I would like to confirm my profile.';
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
module.exports = { NICHES, CONSENT_VERSION, agencyName, whatsappNumber, whatsappLink };
