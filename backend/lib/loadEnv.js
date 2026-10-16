// Load environment variables. This module is imported FIRST in server.js so
// that .env is populated before any other module (e.g. config.js, prisma.js)
// is evaluated — ES module imports are hoisted and run before top-level
// statements, so calling dotenv.config() inline in server.js would be too late.
import dotenv from 'dotenv';

dotenv.config({ quiet: true });
