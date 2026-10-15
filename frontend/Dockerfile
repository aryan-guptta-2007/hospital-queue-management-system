# syntax=docker/dockerfile:1

# ── Build the static bundle ────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Serve it ───────────────────────────────────────────────
FROM nginx:1.27-alpine

# nginx also proxies /api and /ws to the backend, so the browser only ever
# talks to one origin and the WebSocket upgrade survives
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --spider http://127.0.0.1/ || exit 1
