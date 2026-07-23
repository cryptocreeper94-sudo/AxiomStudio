# Axiom Studio — Production Dockerfile
# DarkWave Studios LLC — 2026

FROM node:22-slim

WORKDIR /app

# Install only production system deps (no apt-get update issues)
# node:22-slim already has everything we need

# Copy package files first for layer caching
COPY package.json package-lock.json ./

# Install all deps (need devDependencies for build step)
RUN npm ci --ignore-scripts 2>/dev/null || npm install

# Copy source
COPY . .

# Build client (Vite) + server (TypeScript)
RUN npm run build

# Expose the port
EXPOSE 5100

# Run the cloud server (NOT local-index.js)
ENV NODE_ENV=production
CMD ["node", "dist/server/index.js"]
