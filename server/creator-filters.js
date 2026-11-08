const { NICHES } = require('./creator-config');
const SORTS = { newest: 'created_at DESC', oldest: 'created_at ASC', views: 'average_reel_views DESC', followers: 'follower_count DESC', 'rate-low': 'rate_per_reel ASC', 'rate-high': 'rate_per_reel DESC', quality: 'quality_score DESC NULLS LAST' };
function creatorFilters(input) {
  const params = [], conditions = [];
  const add = (condition, value) => { params.push(value); conditions.push(condition.replaceAll('?', '$' + params.length)); };
  const read = (key) => {
    if (input[key] === undefined || input[key] === '') return '';
    if (typeof input[key] !== 'string') throw new Error('Invalid filter: ' + key);
    return input[key].trim();
  };
  const search = read('q').slice(0, 120);
  if (search) add('(full_name ILIKE ? OR instagram_handle ILIKE ? OR email ILIKE ?)', '%' + search.replace(/[\\%_]/g, '\\$&') + '%');
  const status = read('status'); if (status && !['pending', 'verified', 'active'].includes(status)) throw new Error('Choose a valid status.');
  if (status) add('status = ?', status);
  const niche = read('niche'); if (niche && !NICHES.includes(niche)) throw new Error('Choose a valid niche.');
  if (niche) add('niche = ?', niche);
  const source = read('source'); if (source.length > 100) throw new Error('Source must be at most 100 characters.');
  if (source) add('source = ?', source);
  const country = read('country'); if (country.length > 80) throw new Error('Country must be at most 80 characters.');
  if (country) add('LOWER(country) = LOWER(?)', country);
  for (const [prefix, column, maximum, decimal] of [['views', 'average_reel_views', 2000000000, false], ['followers', 'follower_count', 2000000000, false], ['rate', 'rate_per_reel', 999999999.99, true], ['quality', 'quality_score', 100, false]]) {
    const low = read(prefix + 'Min'), high = read(prefix + 'Max');
    for (const [value, comparison] of [[low, '>='], [high, '<=']]) {
      if (!value) continue;
      if (!(decimal ? /^\d{1,9}(\.\d{1,2})?$/ : /^\d{1,10}$/).test(value) || Number(value) > maximum) throw new Error('Enter a valid ' + prefix + ' range.');
      add(`${column} ${comparison} ?`, value);
    }
    if (low && high && Number(low) > Number(high)) throw new Error('Minimum ' + prefix + ' must not exceed maximum.');
  }
  const scoreStatus = read('scoreStatus');
  if (scoreStatus && !['scored', 'unscored'].includes(scoreStatus)) throw new Error('Choose a valid score filter.');
  if (scoreStatus) conditions.push('quality_score IS ' + (scoreStatus === 'scored' ? 'NOT ' : '') + 'NULL');
  const date = (key) => { const value = read(key); if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) throw new Error('Choose a valid date.'); return value; };
  const from = date('joinedFrom'), to = date('joinedTo');
  if (from && to && from > to) throw new Error('Joined-from date must not follow joined-to date.');
  if (from) add('created_at >= ?', new Date(from + 'T00:00:00+05:30').toISOString());
  if (to) add('created_at < ?', new Date(Date.parse(to + 'T00:00:00+05:30') + 24 * 60 * 60 * 1000).toISOString());
  const sort = read('sort') || 'newest'; if (!SORTS[sort]) throw new Error('Choose a valid sort order.');
  return { params, where: conditions.length ? 'WHERE ' + conditions.join(' AND ') : '', order: SORTS[sort] + ', id' };
}
module.exports = { creatorFilters };
