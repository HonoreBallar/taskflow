/** Profil de l'utilisateur connecté (données non sensibles). Le JWT, lui, vit dans un cookie HttpOnly. */
export const USER_KEY = 'taskflow.user';
/** Date d'expiration de la session (ms depuis l'epoch), pour ne pas afficher une session déjà échue. */
export const EXPIRES_KEY = 'taskflow.expiresAt';
export const PROJECT_VIEW_KEY = 'taskflow.projectView';
