const crypto = require('crypto');
const { agencyName, NICHES, whatsappLink, whatsappNumber } = require('../creator-config');
const escape = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
function formToken() {
  const value = Date.now() + '.' + crypto.randomBytes(12).toString('hex');
  return value + '.' + crypto.createHmac('sha256', process.env.JWT_SECRET).update(value).digest('hex');
}
function validFormToken(token) {
  if (typeof token !== 'string' || !/^\d{13}\.[a-f0-9]{24}\.[a-f0-9]{64}$/.test(token)) return false;
  const [time, nonce, signature] = token.split('.');
  const age = Date.now() - Number(time);
  const expected = crypto.createHmac('sha256', process.env.JWT_SECRET).update(time + '.' + nonce).digest();
  return age >= 0 && age < 24 * 60 * 60 * 1000 && crypto.timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}
function shell(title, body, scripts = '') {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><meta name="theme-color" content="#0a0c0b"><title>${escape(title)} · ${escape(agencyName())}</title><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/assets/network.css"></head><body><main class="creator-shell"><div class="wordmark"><span class="agency-mark" aria-hidden="true">✳</span>${escape(agencyName())}</div>${body}</main>${scripts}</body></html>`;
}
function renderForm(values = {}, errors = {}, generalError = '') {
  const field = (key, label, attrs = '', help = '') => `<div class="field"><label for="${key}">${label}</label><input id="${key}" name="${key}" value="${escape(typeof values[key] === 'string' ? values[key] : '')}" ${attrs} required ${errors[key] ? `aria-invalid="true" aria-describedby="${key}-error"` : ''}>${help ? `<small>${help}</small>` : ''}${errors[key] ? `<span class="error" id="${key}-error">${escape(errors[key])}</span>` : ''}</div>`;
  const select = `<div class="field"><label for="niche">Main niche</label><select name="niche" id="niche" required ${errors.niche ? 'aria-invalid="true" aria-describedby="niche-error"' : ''}><option value="">Choose your niche</option>${NICHES.map((niche) => `<option ${values.niche === niche ? 'selected' : ''}>${escape(niche)}</option>`).join('')}</select>${errors.niche ? `<span class="error" id="niche-error">${escape(errors.niche)}</span>` : ''}</div>`;
  const disabled = !whatsappNumber();
  return shell('Join the creator network', `<header class="intro"><span class="eyebrow"><span class="signal"></span>OPEN TO INDEPENDENT CREATORS</span><h1>Your next brand collab<br>starts here.</h1><p>Get paid brand collabs: join our creator network.</p><div class="intro-meta"><span>About 2 minutes</span><span>Reviewed by a real person</span></div></header>
  ${generalError || disabled || Object.keys(errors).length ? `<div class="notice error-notice" role="alert" tabindex="-1" id="form-errors">${escape(generalError || (disabled ? 'Applications are temporarily paused while we set up confirmations. Please check back soon.' : 'Please check the highlighted fields. Your details are still below.'))}</div>` : ''}
  <form class="application" method="post" action="/creators" id="creator-form"><input type="hidden" name="formToken" value="${formToken()}"><input type="hidden" name="source" value="${escape(typeof values.source === 'string' ? values.source : '')}">
  <div class="bot-field" aria-hidden="true"><label for="companyWebsite">Leave this field empty</label><input type="text" id="companyWebsite" name="companyWebsite" tabindex="-1" autocomplete="off"></div>
  <section class="form-section"><div class="section-heading"><span>01</span><h2>You & your content</h2></div><div class="field-grid">
  ${field('fullName', 'Full name', 'autocomplete="name" maxlength="120" placeholder="Your full name"')}
  ${field('instagramHandle', 'Instagram handle', 'autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="120" placeholder="@yourname"')}
  ${select}${field('country', 'Country you live in', 'autocomplete="country-name" maxlength="80" placeholder="India"')}
  ${field('followerCount', 'Follower count (full number)', 'type="number" inputmode="numeric" min="0" max="2000000000" step="1" placeholder="e.g. 49000"', 'Enter the full number, not thousands: 49K = 49000; 50K = 50000. Do not enter 49 or 50 for these counts.')}
  ${field('averageReelViews', 'Average reel views (full number)', 'type="number" inputmode="numeric" min="0" max="2000000000" step="1" placeholder="e.g. 8500"', 'Use the average of your recent reels. Enter the full number: 8.5K = 8500.')}
  </div></section><section class="form-section"><div class="section-heading"><span>02</span><h2>Let’s talk collaborations</h2></div><div class="field-grid">
  ${field('ratePerReel', 'Your rate per reel · INR', 'type="number" inputmode="decimal" min="0" max="999999999" step="0.01" placeholder="e.g. 2500"', 'Your starting quote. We’ll confirm each brief and rate with you.')}
  ${field('whatsapp', 'WhatsApp number', 'type="tel" inputmode="tel" autocomplete="tel" maxlength="25" placeholder="+91 98765 43210"', 'Include your country code.')}
  <div class="full-width">${field('email', 'Email address', 'type="email" autocomplete="email" autocapitalize="none" maxlength="254" placeholder="you@example.com"')}</div>
  </div><div class="analytics-note"><span aria-hidden="true">↗</span><p><strong>Analytics can come later.</strong> No screenshots needed today. We’ll ask for audience countries and recent reel insights on WhatsApp when reviewing your profile.</p></div>
  <label class="consent"><input type="checkbox" name="consent" id="consent" required ${['on', true, 'true'].includes(values.consent) ? 'checked' : ''} ${errors.consent ? 'aria-invalid="true" aria-describedby="consent-error"' : ''}><span>I agree to ${escape(agencyName())} storing my details, contacting me about collaborations, and sharing my creator profile with relevant brands. My WhatsApp number and email stay private.</span></label>${errors.consent ? `<p class="error" id="consent-error">${escape(errors.consent)}</p>` : ''}
  <button class="button primary" type="submit" ${disabled ? 'disabled' : ''}>Join the creator network <span aria-hidden="true">↗</span></button><p class="submit-note" id="submit-note" aria-live="polite">Free to join. Every collaboration is your choice.</p></section></form>
  <p class="privacy-note">To correct or remove your details, message us${whatsappLink() ? ` <a href="${escape(whatsappLink())}">on WhatsApp</a>` : ''}.</p>`, '<script src="/assets/creators.js" defer></script>');
}
function renderThanks(handle = '') {
  const link = whatsappLink(handle);
  return shell('Application received', `<div class="thanks"><span class="success-mark" aria-hidden="true">✓</span><span class="eyebrow">APPLICATION RECEIVED</span><h1>You’re on our radar.</h1><p>Your submission has been received. Our team reviews profiles before inviting creators to campaigns.</p><div class="next-card"><span class="eyebrow">ONE QUICK NEXT STEP</span><h2>Say hello on WhatsApp.</h2><p>Send the prefilled message so we can match your application and follow up about your audience insights.</p>${link ? `<a class="button whatsapp" href="${escape(link)}">Confirm on WhatsApp <span aria-hidden="true">↗</span></a>` : '<p>WhatsApp confirmation is temporarily unavailable. Your submission is still saved.</p>'}<small>WhatsApp opens when you tap. You choose when to send.</small></div><div class="what-next"><h2>What happens next</h2><p><strong>01</strong> We review your content, niche, and audience fit.</p><p><strong>02</strong> We may ask for insights screenshots on WhatsApp.</p><p><strong>03</strong> When a brief fits, we confirm your rate and availability.</p></div><p class="muted">Already applied? We keep one profile per Instagram handle. Message us to update it.</p></div><aside class="soft-offer"><span class="eyebrow">SOMETHING FOR LATER</span><h2>A little home for your work.</h2><p>Want a creator portfolio or link-in-bio site? Eternity can help.</p><a href="/build#contact">Explore a creator website <span aria-hidden="true">↗</span></a></aside>`);
}
module.exports = { escape, formToken, validFormToken, renderForm, renderThanks };
