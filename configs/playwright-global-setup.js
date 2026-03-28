const { execSync } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');

module.exports = async () => {
  dotenv.config({ path: path.resolve(__dirname, '..', '.env.test') });

  console.log('Setting environment to test');

  // Run Prisma migration for the test database
  console.log('Running migrations for test environment...');
  execSync('npx prisma migrate reset --force', { stdio: 'inherit', env: process.env });
};
