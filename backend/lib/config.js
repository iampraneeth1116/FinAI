// Centralized configuration and secret handling. Fails fast on misconfiguration
// in production instead of silently falling back to insecure defaults.

const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

function requireSecret(name, devFallback) {
    const value = process.env[name];
    if (value) return value;
    if (isProd) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    // In dev/test we allow a fallback so the app can boot, but warn loudly.
    if (!isTest) {
        console.warn(`⚠️  ${name} is not set — using an insecure development fallback. Do NOT use in production.`);
    }
    return devFallback;
}

export const JWT_SECRET = requireSecret('JWT_SECRET', 'dev_only_insecure_secret_change_me');
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
export const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
export const PORT = process.env.PORT || 4000;
export const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
