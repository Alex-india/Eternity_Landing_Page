require('../config');
const { warnNotificationConfig } = require('../services/notification-config');
const { runScheduledNotifications } = require('../services/notifications');
const { pool } = require('../db/connection');
if (require.main === module) {
  warnNotificationConfig();
  runScheduledNotifications().then((result) => {
    console.log('[notifications job]', result.status, JSON.stringify(result.results || []));
    if (['misconfigured'].includes(result.status) || (result.results || []).some((row) => row.status === 'failed')) process.exitCode = 1;
  }).catch(() => { console.warn('[notifications job] Processing failed; check database/configuration.'); process.exitCode = 1; }).finally(() => pool.end());
}
