declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Connexion via l'API (plus rapide que l'UI) : le serveur pose le cookie de session HttpOnly. */
      loginAs(email: string, password: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('loginAs', (email: string, password: string) => {
  // cy.request enregistre le cookie de session dans le navigateur ; le frontend ne garde que le profil
  cy.request('POST', '/api/auth/login', { email, password }).then(({ body }) => {
    window.localStorage.setItem('taskflow.user', JSON.stringify(body.user));
    window.localStorage.setItem('taskflow.expiresAt', String(Date.now() + body.expiresIn));
  });
});

export {};
