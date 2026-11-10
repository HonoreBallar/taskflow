import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    // Application lancée par docker compose (Nginx) ; utiliser http://localhost:4200 avec `ng serve`
    baseUrl: process.env['CYPRESS_BASE_URL'] ?? 'http://localhost',
    viewportWidth: 1366,
    viewportHeight: 850,
    video: false,
    defaultCommandTimeout: 8000,
  },
});
