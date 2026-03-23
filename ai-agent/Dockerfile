# Build stage
# Random comment for commit
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY scripts/ ./scripts/

COPY common/package*.json ./common/
COPY common/tsconfig.json ./common/
COPY common/src ./common/src

COPY ai-agent/package*.json ./ai-agent/
COPY ai-agent/tsconfig.json ./ai-agent/
COPY ai-agent/src ./ai-agent/src

RUN npm ci

RUN cd common && npm run build
RUN cd ai-agent && npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY scripts/ ./scripts/
COPY common/package*.json ./common/
COPY ai-agent/package*.json ./ai-agent/

RUN npm ci --only=production

COPY --from=builder /app/common/dist ./common/dist
COPY --from=builder /app/ai-agent/dist ./ai-agent/dist

RUN mkdir -p /data

EXPOSE 5006

WORKDIR /app/ai-agent

CMD ["node", "--experimental-wasm-modules", "dist/server.js"]
