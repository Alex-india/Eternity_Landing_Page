const { NICHES } = require('./creator-config');
const SORTS = { newest: 'created_at DESC', oldest: 'created_at ASC', views: 'average_reel_views DESC NULLS LAST', followers: 'follower_count DESC NULLS LAST', 'rate-low': 'rate_per_reel ASC NULLS LAST', 'rate-high': 'rate_per_reel DESC NULLS LAST', quality: 'quality_score DESC NULLS LAST' };
function creatorFilters(input) {
  const params = [], conditions = [];
  const add = (condition, value) => { params.push(value); conditions.push(condition.replaceAll('?', '$' + params.length)); };
  const read = (key) => {
    if (input[key] === undefined || input[key] === '') return '';
    if (typeof input[key] !== 'string') throw new Error('Invalid filter: ' + key);
    return input[key].trim();
  };
  const list = (key, maxLength, allowed) => {
    const raw = input[key];
    if (raw === undefined || raw === '') return [];
    const values = Array.isArray(raw) ? raw : [raw];
    if (values.length > 20 || values.some((value) => typeof value !== 'string')) throw new Error('Invalid filter: ' + key);
    const selected = [...new Set(values.flatMap((value) => value.split(',')).map((value) => value.trim()).filter(Boolean))];
    if (selected.length > 20 || selected.some((value) => value.length > maxLength || (allowed && !allowed.includes(value)))) throw new Error('Choose valid ' + key + ' filters (up to 20).');
    return selected;
  };
  const choices = (key, column, maxLength, allowed, insensitive = false) => {
    const values = list(key, maxLength, allowed);
    if (!values.length) return;
    const field = insensitive ? `LOWER(${column})` : column;
    const normalized = insensitive ? values.map((value) => value.toLowerCase()) : values;
    add(values.length === 1 ? `${field} = ?` : `${field} = ANY(?::text[])`, values.length === 1 ? normalized[0] : normalized);
  };
  const search = read('q').slice(0, 120);
  if (search) add('(full_name ILIKE ? OR instagram_handle ILIKE ? OR email ILIKE ?)', '%' + search.replace(/[\\%_]/g, '\\$&') + '%');
  choices('status', 'status', 20, ['pending', 'verified', 'active']);
  choices('niche', 'niche', 40, NICHES);
  choices('source', 'source', 100);
  choices('country', 'country', 80, null, true);
  const entryMethod = read('entryMethod');
  if (entryMethod && !['form', 'manual'].includes(entryMethod)) throw new Error('Choose a valid entry method.');
  if (entryMethod) add('entry_method = ?', entryMethod);
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
