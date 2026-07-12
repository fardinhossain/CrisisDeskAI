// Test environment setup before suites run
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
process.env.MOCK_AI = "true";
process.env.MOCK_EXTERNAL = "true";
process.env.JWT_SECRET = "test-jwt-secret-key-1234567890";
process.env.JWT_EXPIRES_IN = "1h";
process.env.ADMIN_EMAIL = "admin@crisisdesk.ai";
process.env.ADMIN_PASSWORD_HASH = ""; // triggers local dev/test fallback password: admin123
process.env.RATE_LIMIT_WINDOW_MS = "60000";
process.env.RATE_LIMIT_MAX = "1000";
process.env.CORS_ORIGINS = "*";
