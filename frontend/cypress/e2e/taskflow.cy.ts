/**
 * Scénarios E2E : connexion, création de projet, création de tâche, affectation.
 * Prérequis : `docker compose up` (données de démonstration créées au premier démarrage).
 */
const MANAGER = { email: 'manager@taskflow.com', password: 'Manager123!' };
const suffix = Date.now().toString().slice(-6);

describe('Connexion', () => {
  it('refuse un mot de passe incorrect', () => {
    cy.visit('/auth/login');
    cy.get('[data-cy=email]').type(MANAGER.email);
    cy.get('[data-cy=password]').type('mauvais-mdp');
    cy.get('[data-cy=login-submit]').click();
    cy.contains('Email ou mot de passe incorrect').should('be.visible');
    cy.url().should('include', '/auth/login');
  });

  it('connecte le manager et affiche le dashboard', () => {
    cy.visit('/auth/login');
    cy.get('[data-cy=email]').type(MANAGER.email);
    cy.get('[data-cy=password]').type(MANAGER.password);
    cy.get('[data-cy=login-submit]').click();
    cy.url().should('include', '/dashboard');
    cy.contains('Bonjour, Marie').should('exist');
    cy.contains('Tâches terminées').should('be.visible');
  });
});

describe('Projet, tâche et affectation', () => {
  beforeEach(() => cy.loginAs(MANAGER.email, MANAGER.password));

  it('crée un projet puis une tâche affectée à un collaborateur', () => {
    const projectName = `Projet E2E ${suffix}`;
    const taskTitle = `Tâche E2E ${suffix}`;

    // Création du projet
    cy.visit('/projects');
    cy.get('[data-cy=new-project]').click();
    cy.get('[data-cy=project-name]').type(projectName);
    cy.get('[data-cy=project-description]').type('Créé par Cypress');
    cy.get('[data-cy=project-workspace]').click();
    cy.get('mat-option').contains('ENS').click();
    cy.get('[data-cy=project-save]').click();
    cy.url().should('match', /\/projects\/\d+\/board/);
    cy.contains('h1', projectName).should('be.visible');

    // Ajout du collaborateur au projet
    cy.contains('a', 'Membres').click();
    cy.get('mat-select').first().click();
    cy.get('mat-option').contains('Honore').click();
    // Le projet est rechargé après l'ajout : on attend ce rechargement avant d'ouvrir le formulaire de tâche,
    // qui prend la liste des membres au moment de son ouverture
    cy.intercept('GET', '/api/projects/*').as('projectReload');
    cy.contains('button', 'Ajouter').click();
    cy.wait('@projectReload');
    cy.contains('honore@taskflow.com').should('be.visible');

    // Création de la tâche avec affectation
    cy.contains('a', 'Kanban').click();
    cy.get('[data-cy=new-task]').click();
    cy.get('[data-cy=task-title]').type(taskTitle);
    cy.get('[data-cy=task-priority]').click();
    cy.get('mat-option').contains('Haute').click();
    cy.get('[data-cy=task-assignee]').click();
    cy.get('mat-option').contains('Honore Amounan').click();
    cy.get('[data-cy=task-save]').click();

    cy.get('[data-cy=column-TODO]').contains('[data-cy=task-card]', taskTitle).should('be.visible');

    // Le détail confirme l'affectation
    cy.contains('[data-cy=task-card]', taskTitle).click();
    cy.get('mat-dialog-container').within(() => {
      cy.contains('Honore Amounan').should('be.visible');
      cy.contains('Haute').should('be.visible');
    });
  });

  it('ajoute un commentaire avec mention sur une tâche', () => {
    const text = `Peux-tu vérifier @honore ? ${suffix}`;
    cy.visit('/projects/1/board');
    cy.contains('[data-cy=task-card]', 'Export comptable').click();
    cy.get('mat-dialog-container').should('be.visible');
    cy.get('[data-cy=comment-input]').type(text);
    cy.get('[data-cy=comment-submit]').click();
    cy.get('mat-dialog-container')
      .should('be.visible')
      .find('.mention')
      .should('contain', '@honore');
    cy.get('mat-dialog-container').contains(suffix).should('be.visible');
  });
});
