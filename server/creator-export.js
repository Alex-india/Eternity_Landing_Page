// Brand-facing allowlist. Never render contacts, source, consent or internal review notes.
const clean = (value, max = 120) => String(value ?? '').replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/g, ' ')
  .replace(/\b(?:https?:\/\/|www\.)\S+/gi, '[link removed]').replace(/[*_~`<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
const number = (value) => value === null || value === undefined ? 'Not provided' : Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const status = { pending: 'Pending review', verified: 'Verified', active: 'Active' };
function creatorExport(creators) {
  const lines = ['*ETERNITY | Creator shortlist*', `${creators.length} creator${creators.length === 1 ? '' : 's'}`, ''];
  creators.forEach((creator, index) => {
    const handle = String(creator.instagram_handle).replace(/[^a-z0-9_.]/gi, '');
    lines.push(`*${index + 1}. ${clean(creator.full_name)}*`, `Instagram: @${handle}`, `https://www.instagram.com/${handle}/`,
      `Niche: ${clean(creator.niche)}`, `Country: ${clean(creator.country, 80)}`, `Followers: ${number(creator.follower_count)}`,
      `Average reel views: ${number(creator.average_reel_views)}`,
      `Indicative rate / reel (INR): ${number(creator.rate_per_reel)}`, `Profile status: ${status[creator.status] || 'Pending review'}`, '');
  });
  lines.push('Rates are indicative. Final pricing, availability and deliverables will be confirmed by Eternity.');
  return lines.join('\n');
}
module.exports = { creatorExport };
