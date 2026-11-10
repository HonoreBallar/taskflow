// En développement, `ng serve` redirige /api et /ws vers http://localhost:8080 (voir proxy.conf.json).
export const environment = {
  production: false,
  apiUrl: '/api',
  wsUrl: '/ws',
};
