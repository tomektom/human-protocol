import * as Joi from 'joi';

export const ConfigNames = {
  NODE_ENV: 'NODE_ENV',
  HOST: 'HOST',
  PORT: 'PORT',
  FE_URL: 'FE_URL',
  SESSION_SECRET: 'SESSION_SECRET',
  PASSWORD_SECRET: 'PASSWORD_SECRET',
  JWT_SECRET: 'JWT_SECRET',
  JWT_ACCESS_TOKEN_EXPIRES_IN: 'JWT_ACCESS_TOKEN_EXPIRES_IN',
  JWT_REFRESH_TOKEN_EXPIRES_IN: 'JWT_REFRESH_TOKEN_EXPIRES_IN',
  POSTGRES_HOST: 'POSTGRES_HOST',
  POSTGRES_USER: 'POSTGRES_USER',
  POSTGRES_PASSWORD: 'POSTGRES_PASSWORD',
  POSTGRES_DB: 'POSTGRES_DB',
  POSTGRES_PORT: 'POSTGRES_PORT',
  POSTGRES_SYNC: 'POSTGRES_SYNC',
  WEB3_PRIVATE_KEY: 'WEB3_PRIVATE_KEY',
  JOB_LAUNCHER_FEE: 'JOB_LAUNCHER_FEE',
  RECORDING_ORACLE_FEE: 'RECORDING_ORACLE_FEE',
  REPUTATION_ORACLE_FEE: 'REPUTATION_ORACLE_FEE',
  EXCHANGE_ORACLE_ADDRESS: 'EXCHANGE_ORACLE_ADDRESS',
  EXCHANGE_ORACLE_WEBHOOK_URL: 'EXCHANGE_ORACLE_WEBHOOK_URL',
  RECORDING_ORACLE_ADDRESS: 'RECORDING_ORACLE_ADDRESS',
  REPUTATION_ORACLE_ADDRESS: 'REPUTATION_ORACLE_ADDRESS',
  S3_ENDPOINT: 'S3_ENDPOINT',
  S3_PORT: 'S3_PORT',
  S3_ACCESS_KEY: 'S3_ACCESS_KEY',
  S3_SECRET_KEY: 'S3_SECRET_KEY',
  S3_BUCKET: 'S3_BUCKET',
  S3_USE_SSL: 'S3_USE_SSL',
  STRIPE_SECRET_KEY: 'STRIPE_SECRET_KEY',
  STRIPE_API_VERSION: 'STRIPE_API_VERSION',
  STRIPE_APP_NAME: 'STRIPE_APP_NAME',
  STRIPE_APP_VERSION: 'STRIPE_APP_VERSION',
  STRIPE_APP_INFO_URL: 'STRIPE_APP_INFO_URL',
  SENDGRID_API_KEY: 'SENDGRID_API_KEY',
  SENDGRID_FROM_EMAIL: 'SENDGRID_FROM_EMAIL',
  SENDGRID_FROM_NAME: 'SENDGRID_FROM_NAME',
};

export const envValidator = Joi.object({
  // General
  NODE_ENV: Joi.string().default('development'),
  HOST: Joi.string().default('localhost'),
  PORT: Joi.string().default(5000),
  FE_URL: Joi.string().default('http://localhost:3005'),
  SESSION_SECRET: Joi.string().default('session_key'),
  PASSWORD_SECRET: Joi.string().default('$2b$10$EICgM2wYixoJisgqckU9gu'),
  // Auth
  JWT_SECRET: Joi.string().default('secrete'),
  JWT_ACCESS_TOKEN_EXPIRES_IN: Joi.string().default(1000000000),
  JWT_REFRESH_TOKEN_EXPIRES_IN: Joi.string().default(1000000000),
  // Database
  DB_TYPE: Joi.string().default('postgres'),
  POSTGRES_HOST: Joi.string().default('127.0.0.1'),
  POSTGRES_USER: Joi.string().default('operator'),
  POSTGRES_PASSWORD: Joi.string().default('qwerty'),
  POSTGRES_DB: Joi.string().default('job-launcher'),
  POSTGRES_PORT: Joi.string().default('5432'),
  POSTGRES_SYNC: Joi.string().default(false),
  // Web3
  WEB3_PRIVATE_KEY: Joi.string().required(),
  JOB_LAUNCHER_FEE: Joi.string().default(10),
  RECORDING_ORACLE_FEE: Joi.string().default(10),
  REPUTATION_ORACLE_FEE: Joi.string().default(10),
  EXCHANGE_ORACLE_ADDRESS: Joi.string().required(),
  EXCHANGE_ORACLE_WEBHOOK_URL: Joi.string().default('http://localhost:3005'),
  RECORDING_ORACLE_ADDRESS: Joi.string().required(),
  REPUTATION_ORACLE_ADDRESS: Joi.string().required(),
  // S3
  S3_ENDPOINT: Joi.string().default('127.0.0.1'),
  S3_PORT: Joi.string().default(9000),
  S3_ACCESS_KEY: Joi.string().required(),
  S3_SECRET_KEY: Joi.string().required(),
  S3_BUCKET: Joi.string().default('launcher'),
  S3_USE_SSL: Joi.string().default(false),
  // Stripe
  STRIPE_SECRET_KEY: Joi.string().default(
    'sk_test_51MO1RkABE7VUdqB3hviLNxMYafYQYhvtWd3Jaj9ZEH3SvkxM4frJLz00FmC5J8xYbNGhmzwobaLkN0GKUbuhQDvx00NeZwI93C',
  ),
  STRIPE_API_VERSION: Joi.string().default('2022-11-15'),
  STRIPE_APP_NAME: Joi.string().default('Fortune'),
  STRIPE_APP_VERSION: Joi.string().default('0.0.1'),
  STRIPE_APP_INFO_URL: Joi.string().default('https://hmt.ai'),
  // SendGrid
  SENDGRID_API_KEY: Joi.string().required(),
  SENDGRID_FROM_EMAIL: Joi.string().default('job-launcher@hmt.ai'),
  SENDGRID_FROM_NAME: Joi.string().default('Human Protocol Job Launcher'),
});
