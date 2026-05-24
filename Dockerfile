# syntax=docker/dockerfile:1.7
FROM node:18-alpine

# dumb-init = proper PID 1 signal forwarding (clean SIGTERM on deploy)
RUN apk add --no-cache dumb-init

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3001

# Production dependencies only — copy lockfile first for layer caching
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Application source
COPY . .

# Drop privileges
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
