const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });
const ownerEmail = () => (process.env.OWNER_EMAIL || '').trim().toLowerCase();
function validateEnv() {
  require('./services/notification-config').warnNotificationConfig();
  if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) throw new Error('DATABASE_URL and JWT_SECRET are required. See server/.env.example.');
  if (process.env.NODE_ENV === 'production') {
    if (!/^[1-9]\d{7,14}$/.test(process.env.CREATOR_WHATSAPP_NUMBER || '')) throw new Error('Set CREATOR_WHATSAPP_NUMBER to digits only, including country code.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail()) || ownerEmail() === 'demo@eternity.dev') throw new Error('Set OWNER_EMAIL to your private owner account email.');
    if (process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.startsWith('change-this')) throw new Error('Set a random JWT_SECRET of at least 32 characters.');
  }
}
module.exports = { ownerEmail, validateEnv };
