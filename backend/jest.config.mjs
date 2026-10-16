export default {
    testEnvironment: 'node',
    // Source is native ESM; no transform needed when run with
    // NODE_OPTIONS=--experimental-vm-modules (see the "test" script).
    transform: {},
    setupFiles: ['<rootDir>/__tests__/setup.js'],
    testMatch: ['**/__tests__/**/*.test.js'],
    verbose: true,
};
