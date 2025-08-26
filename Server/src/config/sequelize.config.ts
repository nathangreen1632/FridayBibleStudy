import { Sequelize } from 'sequelize';
import { env } from './env.config.js';

export const sequelize = new Sequelize(env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false
});
