// Configuration de production. En Docker, Nginx sert le frontend et redirige /api et /ws vers le backend.
// Pour un déploiement séparé (Vercel/Netlify + Render), remplacer par l'URL absolue du backend.
export const environment = {
  production: true,
  apiUrl: '/api',
  wsUrl: '/ws',
};
