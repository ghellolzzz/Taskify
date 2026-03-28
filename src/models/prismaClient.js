const path = require('path');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');

if (!process.env.DATABASE_URL) {
  const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env.development';
  dotenv.config({ path: path.resolve(__dirname, '..', '..', envFile) });
}

const prisma = new PrismaClient();

module.exports = prisma;
