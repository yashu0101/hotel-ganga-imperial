// Settings shared by playwright.config.ts and the tests. These credentials only exist on the e2e test server.
export const E2E_PORT = 3100;
export const E2E_ADMIN = { email: "e2e@example.com", password: "e2e-test-password-not-for-production-use" };
export const E2E_JWT_SECRET = "e2e-only-jwt-secret-0123456789-abcdefghijklmnop";
/** The JSON store the test server uses, relative to the project. Never data/db.json. */
export const E2E_DB_FILE = "e2e/.data/db.json";
