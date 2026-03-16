# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY scripts/ ./scripts/

COPY common/package*.json ./common/
COPY common/tsconfig.json ./common/
COPY common/src ./common/src

COPY orchestrator/package*.json ./orchestrator/
COPY orchestrator/tsconfig.json ./orchestrator/
COPY orchestrator/src ./orchestrator/src

RUN npm ci

RUN cd common && npm run build
RUN cd orchestrator && npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY scripts/ ./scripts/
COPY common/package*.json ./common/
COPY orchestrator/package*.json ./orchestrator/

RUN npm ci --only=production

COPY --from=builder /app/common/dist ./common/dist
COPY --from=builder /app/orchestrator/dist ./orchestrator/dist

RUN mkdir -p /data

EXPOSE 5005

WORKDIR /app/orchestrator

CMD ["node", "--experimental-wasm-modules", "dist/server.js"]
