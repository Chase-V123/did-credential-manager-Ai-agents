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

# Copy issuer package
COPY issuer/package*.json ./issuer/
COPY issuer/tsconfig.json ./issuer/
COPY issuer/src ./issuer/src

# Install dependencies
RUN npm ci

# Build common first
RUN cd common && npm run build

# Build issuer
RUN cd issuer && npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY scripts/ ./scripts/
COPY common/package*.json ./common/
COPY issuer/package*.json ./issuer/

# Install production dependencies
RUN npm ci --only=production

# Copy built files
COPY --from=builder /app/common/dist ./common/dist
COPY --from=builder /app/issuer/dist ./issuer/dist

# Expose port
EXPOSE 5001

# Set working directory to issuer
WORKDIR /app/issuer

# Run the application with WASM support (same as local dev)
CMD ["node", "--experimental-wasm-modules", "dist/server.js"]

