# syntax=docker/dockerfile:1

FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app

# Dependencies first, so a code change does not reinstall node_modules
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server.js ./
COPY src ./src

# node:alpine ships an unprivileged "node" user; the app never needs root
USER node

EXPOSE 5001

# The container is unhealthy if the API stops answering, so compose can hold
# the frontend back until the backend is really up
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 5001) + '/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
