// Test environment setup — runs before each test file.
// Set a deterministic secret so issued JWTs verify consistently in tests.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key';
process.env.BCRYPT_ROUNDS = '4'; // fast hashing for tests
