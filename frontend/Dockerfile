# ---- Build Angular ----
FROM node:26-alpine AS build
WORKDIR /app
ENV CYPRESS_INSTALL_BINARY=0
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx ng build --configuration production

# ---- Servir avec Nginx ----
# Image non privilégiée : Nginx tourne sous l'utilisateur « nginx » (UID 101) et écoute sur 8080,
# jamais en root. Une faille dans le serveur web ne donne donc pas les droits root dans le conteneur.
FROM nginxinc/nginx-unprivileged:1.27-alpine
# Proxy dont l'en-tête X-Forwarded-For est digne de confiance (aucun par défaut)
ENV TRUSTED_PROXY=127.0.0.1
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
EXPOSE 8080
