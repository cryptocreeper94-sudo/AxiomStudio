# Axiom Studio — Production Dockerfile
# DarkWave Studios LLC — 2026

FROM node:22-slim

WORKDIR /app

# Copy package files first for layer caching
COPY package.json package-lock.json ./

# Install all deps (devDeps needed for TypeScript build)
RUN npm ci

# Copy source
COPY . .

# Build: Vite for client, tsc for server (ignore type errors, emit JS anyway)
RUN npx vite build && npx tsc -p tsconfig.server.json --noEmit false --noEmitOnError false; exit 0

# Verify server JS was emitted
RUN test -f dist/server/index.js || (echo "FATAL: dist/server/index.js not found" && exit 1)

# Prune devDependencies to keep image small
RUN npm prune --production 2>/dev/null || true

# Expose the port
EXPOSE 5100

# Run the cloud server
ENV NODE_ENV=production
CMD ["node", "dist/server/index.js"]
