require('dotenv').config();

const app = require('./src/app');
const { connectDB } = require('./src/config/db');
const { env, validateEnv } = require('./src/config/env');
const log = require('./src/utils/logger');

async function bootstrap() {
  // Hard-fail on missing required env, log warnings for optional features.
  // Defensive: if validateEnv was somehow stripped from the env module
  // (older build cached by the host, accidental duplicate export, etc.)
  // we skip validation rather than dying in a boot loop.
  if (typeof validateEnv === 'function') {
    const { errors, warnings } = validateEnv();
    warnings.forEach((w) => log.warn(w));
    if (errors.length) {
      errors.forEach((e) => log.error(e));
      throw new Error('Env validation failed — see errors above');
    }
  } else {
    log.warn('validateEnv not available — skipping env preflight');
  }

  await connectDB();
  app.listen(env.PORT, () => {
    log.info(`Rebelle API listening on :${env.PORT} (${env.NODE_ENV})`);
  });
}

bootstrap().catch((err) => {
  log.error('Fatal bootstrap error', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled promise rejection', reason);
});

process.on('uncaughtException', (err) => {
  log.error('Uncaught exception', err);
  process.exit(1);
});
