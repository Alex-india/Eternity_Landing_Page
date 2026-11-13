// Anonymous first-look export. Identities are available only in the owner's private reference.
const clean = (value, max = 120) => String(value ?? '').replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/g, ' ')
  .replace(/\b(?:https?:\/\/|www\.)\S+/gi, '[link removed]').replace(/[*_~`<>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
const number = (value) => value === null || value === undefined ? 'Not provided' : Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const compact = (value) => {
  if (value === null || value === undefined) return 'Not provided';
  const count = Number(value);
  if (count < 1000) return number(count);
  return '~' + new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(count);
};
function creatorLabel(index) {
  let label = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) label = String.fromCharCode(65 + ((n - 1) % 26)) + label;
  return 'Creator ' + label;
}
function creatorExport(creators, { brandName = 'Brand shortlist', campaignNiche = '' } = {}) {
  const niches = [...new Set(creators.map((creator) => clean(creator.niche)))];
  const headingNiche = clean(campaignNiche, 80) || (niches.length === 1 ? niches[0] : 'Mixed niches');
  const lines = ['*ETERNITY | Creator shortlist*', `${clean(brandName)} | ${headingNiche} | ${creators.length} creator${creators.length === 1 ? '' : 's'}`, ''];
  creators.forEach((creator, index) => {
    const rate = creator.rate_per_reel === null || creator.rate_per_reel === undefined ? 'To be confirmed + 10% Eternity fee' : `₹${number(creator.rate_per_reel)} + 10% Eternity fee`;
    const profile = ['verified', 'active'].includes(creator.status) ? 'Verified by Eternity' : 'Pending verification by Eternity';
    lines.push(`*${creatorLabel(index)}*`, `Niche: ${clean(creator.niche)}`, `Country: ${clean(creator.country, 80)}`,
      `Followers: ${compact(creator.follower_count)}`, `Average reel views: ${compact(creator.average_reel_views)}`,
      `Rate per reel: ${rate}`, `Profile: ${profile}`, '');
  });
  lines.push('Rates are indicative. Profiles are shared after you confirm the terms. Final price, availability and deliverables are confirmed by Eternity.');
  return lines.join('\n');
}
module.exports = { creatorExport, creatorLabel };
