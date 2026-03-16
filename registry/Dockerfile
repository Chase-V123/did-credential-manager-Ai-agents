# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY scripts/ ./scripts/

COPY common/package*.json ./common/
COPY common/tsconfig.json ./common/
COPY common/src ./common/src

COPY registry/package*.json ./registry/
COPY registry/tsconfig.json ./registry/
COPY registry/src ./registry/src

RUN npm ci

RUN cd common && npm run build
RUN cd registry && npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY scripts/ ./scripts/
COPY common/package*.json ./common/
COPY registry/package*.json ./registry/

RUN npm ci --only=production

COPY --from=builder /app/common/dist ./common/dist
COPY --from=builder /app/registry/dist ./registry/dist

RUN mkdir -p /data

EXPOSE 5004

WORKDIR /app/registry

CMD ["node", "--experimental-wasm-modules", "dist/server.js"]
