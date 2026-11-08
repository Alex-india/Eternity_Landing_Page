const crypto = require('crypto');
function verifyCalWebhook(req, res, next) {
  const secret = process.env.CAL_WEBHOOK_SECRET;
  if (!secret) return res.status(503).json({ message: 'Webhook is not configured.' });
  const signature = (req.get('x-cal-signature-256') || '').replace(/^sha256=/, '');
  if (!/^[a-f\d]{64}$/i.test(signature) || !req.rawBody) return res.status(401).json({ message: 'Invalid webhook signature.' });
  const expected = crypto.createHmac('sha256', secret).update(req.rawBody).digest();
  if (!crypto.timingSafeEqual(expected, Buffer.from(signature, 'hex'))) return res.status(401).json({ message: 'Invalid webhook signature.' });
  next();
}
module.exports = { verifyCalWebhook };
