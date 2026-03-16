# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY tsconfig.json ./
COPY scripts/ ./scripts/

# Copy common package
COPY common/package*.json ./common/
COPY common/tsconfig.json ./common/
COPY common/src ./common/src

# Copy holder package
COPY holder/package*.json ./holder/
COPY holder/tsconfig.json ./holder/
COPY holder/src ./holder/src

# Install dependencies
RUN npm ci

# Build common first
RUN cd common && npm run build

# Build holder
RUN cd holder && npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY scripts/ ./scripts/
COPY common/package*.json ./common/
COPY holder/package*.json ./holder/

# Install production dependencies
RUN npm ci --only=production

# Copy built files
COPY --from=builder /app/common/dist ./common/dist
COPY --from=builder /app/holder/dist ./holder/dist

# Expose port
EXPOSE 5003

# Set working directory to holder
WORKDIR /app/holder

# Run the application with WASM support (same as local dev)
CMD ["node", "--experimental-wasm-modules", "dist/server.js"]

