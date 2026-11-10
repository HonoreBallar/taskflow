# TaskFlow

[![CI](https://github.com/HonoreBallar/taskflow/actions/workflows/ci.yml/badge.svg)](https://github.com/HonoreBallar/taskflow/actions/workflows/ci.yml)
[![Sécurité](https://github.com/HonoreBallar/taskflow/actions/workflows/security.yml/badge.svg)](https://github.com/HonoreBallar/taskflow/actions/workflows/security.yml)
[![CodeQL](https://github.com/HonoreBallar/taskflow/actions/workflows/codeql.yml/badge.svg)](https://github.com/HonoreBallar/taskflow/actions/workflows/codeql.yml)

Application SaaS de gestion de projets (inspirée de ClickUp, Jira et Trello) : espaces de travail, projets, tâches en Kanban, commentaires avec mentions, pièces jointes, notifications temps réel, recherche globale et administration.

| Couche | Technologies |
|---|---|
| `frontend/` | Angular 20 (standalone, Signals, OnPush), Angular Material + CDK Drag & Drop, NgRx (store, effects, selectors), RxJS, Chart.js, STOMP/SockJS |
| `backend/` | Spring Boot 3.5 (Java 17), Spring Security + JWT, Spring Data JPA, WebSocket STOMP, Swagger (springdoc) |
| Base de données | PostgreSQL 16 |
| Exécution | Docker Compose (Nginx sert le frontend et redirige `/api` et `/ws` vers le backend) |

## Démarrage rapide (Docker)

```bash
cp .env.example .env        # puis renseigner POSTGRES_PASSWORD, JWT_SECRET et ADMIN_PASSWORD (obligatoires)
docker compose up -d --build
```

`docker compose` refuse de démarrer tant que ces trois secrets sont vides. Pour en générer : `openssl rand -base64 64 | tr -d '\n'`.

| Service | URL |
|---|---|
| Application | http://localhost |
| Swagger UI | http://localhost/swagger-ui/index.html (seulement si `SWAGGER_ENABLED=true`) |
| API (accès direct) | http://localhost:8080 (variable `BACKEND_PORT`, écoute sur 127.0.0.1 uniquement) |
| PostgreSQL | localhost:5432 (variable `DB_PORT`, écoute sur 127.0.0.1 uniquement ; à changer si un PostgreSQL local occupe déjà ce port) |

Si un port est déjà utilisé sur votre machine, changez `FRONTEND_PORT`, `BACKEND_PORT` ou `DB_PORT` dans `.env`.

### Comptes

Au premier démarrage (base vide), seul le compte administrateur est créé, avec `ADMIN_EMAIL` et `ADMIN_PASSWORD`.

Avec `SEED_DEMO=true` (développement et tests E2E uniquement), un jeu de démonstration est ajouté : un workspace « ENS », les projets « ERP » et « Site vitrine », quelques tâches et deux comptes aux mots de passe publics :

| Rôle | Email | Mot de passe |
|---|---|---|
| Manager | manager@taskflow.com | Manager123! |
| Collaborateur | honore@taskflow.com | User1234! |

### Emails (confirmation d'adresse, mot de passe oublié)

Un compte créé par inscription doit confirmer son adresse email avant de pouvoir se connecter, et un changement d'adresse n'est appliqué qu'après confirmation de la nouvelle (`EMAIL_VERIFICATION=true` par défaut).

- **Production** : renseigner `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD` et `MAIL_FROM` dans `.env`.
- **Développement** : `LOG_RESET_LINKS=true` écrit les liens dans les logs au lieu de les envoyer : `docker compose logs backend | grep "\[email\]"`.

Sans SMTP ni `LOG_RESET_LINKS`, aucun lien n'est délivré : les nouveaux inscrits ne peuvent pas activer leur compte (un administrateur peut toujours créer des comptes).

### HTTPS (production)

```bash
# .env : DOMAIN=taskflow.exemple.com (le domaine doit pointer vers le serveur, ports 80 et 443 ouverts)
docker compose -f docker-compose.yml -f docker-compose.https.yml up -d --build
```

Caddy obtient et renouvelle le certificat, redirige HTTP vers HTTPS, envoie HSTS, et le cookie de session passe en `Secure`. Derrière votre propre proxy TLS à la place, mettez `COOKIE_SECURE=true`.

### Commandes utiles

```bash
docker compose logs -f backend      # logs de l'API
docker compose up -d --build frontend   # reconstruire après une modification du frontend
docker compose down                 # arrêter (les données sont conservées)
docker compose down -v              # arrêter ET supprimer la base et les fichiers envoyés
```

## Développement sans Docker pour le code

```bash
docker compose up -d db                       # seulement PostgreSQL

cd backend && DB_PASSWORD=<POSTGRES_PASSWORD du .env> SEED_DEMO=true SWAGGER_ENABLED=true LOG_RESET_LINKS=true mvn spring-boot:run   # API sur :8080
cd frontend && npm install && npm start       # Angular sur :4200 (proxy /api et /ws vers :8080)
```

Sans `JWT_SECRET`, le backend génère un secret aléatoire à chaque démarrage (les sessions sont alors perdues au redémarrage). Sans `ADMIN_PASSWORD`, le mot de passe administrateur est généré et écrit une fois dans les logs.

## Sécurité

- **Secrets** : aucun secret par défaut dans le code ni dans `docker-compose.yml`. Le backend refuse de démarrer avec le secret JWT d'exemple ou un secret de moins de 64 octets.
- **Sessions** : le JWT est posé par le serveur dans un cookie `HttpOnly`, `SameSite=Strict` ; le JavaScript n'y a jamais accès et rien de sensible n'est stocké dans le `localStorage`. Les clients d'API peuvent utiliser le header `Authorization: Bearer` ; le token n'est jamais accepté dans l'URL. Changer de mot de passe ou d'email, ou réinitialiser le mot de passe, révoque toutes les sessions. Le blocage d'un compte et les changements de rôle prennent effet immédiatement.
- **CSRF** : cookie `SameSite=Strict`, origine de chaque requête validée (liste `CORS_ORIGINS`), et refus des requêtes de modification authentifiées par cookie qui n'annoncent aucune origine.
- **Adresses email** : confirmation par lien à l'inscription et au changement d'adresse ; changer d'adresse exige le mot de passe actuel ; l'inscription ne révèle pas si une adresse a déjà un compte.
- **Force brute** : 20 appels par minute et par IP sur chaque endpoint `/api/auth/*` (`AUTH_RATE_LIMIT_PER_MINUTE`), et 5 échecs de connexion par couple email/IP sur 15 minutes. Les compteurs sont en base : ils sont partagés entre instances et survivent à un redémarrage. Nginx transmet l'adresse IP réelle du client et ignore un `X-Forwarded-For` falsifié.
- **Cloisonnement** : toutes les données sont filtrées par appartenance au workspace (`AccessService`), y compris la recherche d'utilisateurs. Une session WebSocket ne peut s'abonner qu'à sa propre file de notifications.
- **Fichiers** : extensions en liste blanche, contenu vérifié (signature du fichier), nom d'origine nettoyé, stockage sous un nom aléatoire, suppression du disque avec la pièce jointe.
- **Fichiers et avatars** : tous servis uniquement à un utilisateur authentifié.
- **Navigateur** : Nginx envoie une Content-Security-Policy stricte (aucun script inline ni tiers), `X-Frame-Options`, `nosniff` et `Referrer-Policy` (`frontend/security-headers.conf`).
- **Conteneurs** : Nginx et le backend tournent sous un utilisateur non root ; la base et l'API ne sont publiées que sur `127.0.0.1`.
- **Avant une mise en production** : utiliser `docker-compose.https.yml`, configurer le SMTP, et laisser `SEED_DEMO`, `SWAGGER_ENABLED` et `LOG_RESET_LINKS` à `false`.

## Rôles et droits

| Action | ADMIN | MANAGER | USER |
|---|:-:|:-:|:-:|
| Gérer les utilisateurs, les rôles et le blocage ; consulter les logs et les statistiques globales | ✅ | | |
| Créer des workspaces et des projets, inviter des membres | ✅ | ✅ | |
| Créer, affecter et supprimer des tâches | ✅ | ✅ | |
| Consulter les projets de ses workspaces | ✅ | ✅ | ✅ |
| Modifier ou déplacer **ses** tâches | ✅ | ✅ | ✅ |
| Commenter, répondre, mentionner, joindre des fichiers | ✅ | ✅ | ✅ |

Ces règles sont appliquées côté serveur (`AccessService`). Côté interface, le guard `roleGuard` et la directive `*appHasRole` masquent seulement les actions non autorisées.

## Architecture

### Frontend (`frontend/src/app`)

```
core/        services (API, auth à base de Signals, notifications STOMP), guards, interceptors (JWT, erreurs), models, constants
shared/      components (avatar, chart, stat-card, confirm-dialog…), directives (hasRole, dropZone, autofocus), pipes (mention, timeAgo, fileSize…), utils (validators)
features/    auth, dashboard, workspace, projects, tasks, comments, files, notifications, search, profile, admin (tous en lazy loading)
layout/      shell responsive (sidenav + toolbar)
store/       NgRx : tasks (Kanban avec déplacement optimiste) et projects (actions, reducers, effects, selectors mémoïsés)
```

Concepts Angular mis en œuvre :

- **Formulaires et validation** : Reactive Forms, validateurs personnalisés (`matchFields`, `dateRange`).
- **Sécurité** : intercepteurs JWT et erreurs (401 → déconnexion), guards `authGuard`, `guestGuard` et `roleGuard` (avec `canMatch`).
- **Routing** : routes enfants (projet → kanban, aperçu, documents, membres), `projectResolver`, `withComponentInputBinding`, lazy loading et `PreloadAllModules`.
- **État** : Signals (`signal`, `computed`, `effect`, `toSignal`, `input`, `output`) et NgRx (`createActionGroup`, `createFeature`, effects, selectors mémoïsés et paramétrés).
- **RxJS** : `debounceTime`, `distinctUntilChanged` et `switchMap` pour la recherche ; `concatMap` pour les déplacements Kanban ordonnés ; `forkJoin`.
- **Upload** : `FormData` avec suivi de progression (`reportProgress` et `HttpEventType.UploadProgress`), prévisualisation des PDF et des images via un Blob.
- **Performance** : `ChangeDetectionStrategy.OnPush` partout, `track` dans `@for` et `trackBy` dans `mat-table`, composants standalone.

### Backend (`backend/src/main/java/com/taskflow`)

```
config/         WebSocket STOMP, Swagger, données de démonstration
security/       JWT, filtre, configuration Spring Security, règles d'accès
auth/  users/  admin/  workspace/  projects/  tasks/  comments/  notifications/  files/  dashboard/  search/
```

Principaux endpoints (la liste complète est dans Swagger) :

- `POST /api/auth/login`, `/register`, `/forgot-password`, `/reset-password` : publics
- `/api/workspaces/**`, `/api/projects/**`, `/api/tasks/**`, `/api/comments/**`, `/api/files/**` : authentifiés
- `PATCH /api/tasks/{id}/move` : déplacement Kanban (statut et position)
- `/api/admin/**` : réservé à `ROLE_ADMIN`
- WebSocket : `/ws` (SockJS). Le navigateur est authentifié par son cookie de session dès la poignée de main (un client d'API peut envoyer `Authorization: Bearer <jwt>` au CONNECT), puis s'abonne à `/user/queue/notifications`, seul abonnement autorisé.

Le schéma (tables `users`, `workspace`, `projects`, `tasks`, `comments`, `notifications`, `attachments`, `activity_logs`…) est créé par Hibernate (`ddl-auto: update`).

## Tests

```bash
cd backend  && mvn test                      # tests d'intégration (MockMvc + H2)
cd frontend && npm run test:ci               # tests unitaires Jasmine/Karma : pipes, guards, services, reducer, composants
cd frontend && npm run e2e                   # Cypress (application lancée avec docker compose et SEED_DEMO=true sur une base vide)
```

Scénarios E2E couverts : connexion (refus puis succès), création d'un projet, création d'une tâche avec affectation, commentaire avec mention.

> Sous VS Code, si Cypress affiche `bad option: --smoke-test`, lancez-le depuis un terminal où la variable `ELECTRON_RUN_AS_NODE` n'est pas définie.

## Intégration continue (GitHub Actions)

Chaque push sur `main` et chaque pull request déclenche les workflows de `.github/workflows/`. La branche `main` n'accepte que des pull requests dont le job **CI OK** est vert.

| Workflow | Déclenchement | Ce qu'il vérifie |
|---|---|---|
| `ci.yml` | push, PR | Backend : tests sur H2 puis sur PostgreSQL 16, couverture, formatage, analyse statique. Frontend : Prettier, ESLint, build, tests, couverture, `npm audit`. Application complète : Hadolint, `docker compose up`, Cypress, scan Trivy des deux images. |
| `security.yml` | push, PR, chaque lundi | Secrets commités (Gitleaks), dépendances npm et configuration Docker (Trivy), nouvelles dépendances d'une PR. |
| `codeql.yml` | push, PR, chaque lundi | Analyse de sécurité du code Java, TypeScript et des workflows. Résultats dans l'onglet *Security*. |
| `zap.yml` | chaque lundi, manuel | Scan passif OWASP ZAP de l'application démarrée. Ne bloque rien : rapport dans les artefacts. |
| `release.yml` | tag `vX.Y.Z` | Publie les images `backend` et `frontend` sur `ghcr.io`, avec SBOM et provenance. |

Dependabot (`.github/dependabot.yml`) ouvre chaque lundi des PR groupées pour Maven, npm, les images Docker et les actions GitHub.

Les jobs backend et frontend ne tournent que si leur dossier a changé. Les mêmes contrôles se lancent en local :

```bash
cd backend  && mvn verify              # tests + couverture (JaCoCo) + formatage (Spotless) + SpotBugs/FindSecBugs
cd backend  && mvn spotless:apply      # corrige le formatage
cd frontend && npm run lint            # ESLint (npm run lint:fix pour corriger)
cd frontend && npm run format:check    # Prettier (npm run format pour corriger)
cd frontend && npm run test:coverage   # tests + seuil de couverture
```

Seuils de couverture, à relever au fil des tests ajoutés : 55 % des lignes côté backend (`coverage.minimum` dans `pom.xml`), 40 % côté frontend (`karma.conf.js`). Une alerte SpotBugs jugée infondée s'exclut dans `backend/spotbugs-exclude.xml`, avec sa justification.

## Déploiement séparé (Vercel ou Netlify, Render ou Railway)

1. **Base** : créer une instance PostgreSQL et renseigner `DB_URL`, `DB_USER` et `DB_PASSWORD` sur le backend.
2. **Backend** (Render ou Railway) : déployer `backend/` avec son Dockerfile. Définir `JWT_SECRET` (64 caractères aléatoires minimum), `ADMIN_PASSWORD`, `CORS_ORIGINS=https://votre-front.app` et `FRONTEND_URL`, la configuration SMTP, ainsi que `COOKIE_SECURE=true` et `COOKIE_SAME_SITE=None` (le front et l'API étant sur deux domaines, le cookie de session doit être accepté entre sites ; la protection CSRF repose alors sur la validation de l'origine). Quand c'est possible, préférez servir le front et l'API sous le même domaine, comme le fait Docker Compose : le cookie reste en `SameSite=Strict`. Ce mode à deux domaines n'est pas couvert par les tests du projet.
3. **Frontend** (Vercel ou Netlify) : dans `src/environments/environment.ts`, mettre `apiUrl` et `wsUrl` sur l'URL absolue du backend (par exemple `https://api.taskflow.app/api`), puis builder avec `npm run build`, dossier de sortie `dist/frontend/browser`, en configurant une réécriture SPA de toutes les routes vers `index.html`.
