// Test environment: dummy values only (no real credentials anywhere in the repo).
Object.assign(process.env, {
  NODE_ENV: 'test',
  ATTENDE_MONGODB_URI: 'mongodb://127.0.0.1:1/unused',
  FRONTEND_URL: 'http://app.test',
  AUTH_SECRET: 'test-auth-secret-0123456789',
  JSYNQ_API_URL: 'http://127.0.0.1:1',
  JSYNQ_PARTNER_API_KEY: 'pk_test_partner_key',
  JSYNQ_WEBHOOK_SECRET: 'jsynq-test-webhook-secret',
  JSYNQ_TIMEOUT_MS: '3000',
  STRIPE_SECRET_KEY: 'sk_test_dummy',
  STRIPE_WEBHOOK_SECRET: 'stripe-test-signing-secret',
  DATA_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
  MAIL_PROVIDER: 'log',
  LOG_LEVEL: 'error',
  CRON_SECRET: 'test-cron-secret-0123456789',
});
