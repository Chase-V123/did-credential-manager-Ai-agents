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

# Copy verifier package
COPY verifier/package*.json ./verifier/
COPY verifier/tsconfig.json ./verifier/
COPY verifier/src ./verifier/src

# Install dependencies
RUN npm ci

# Build common first
RUN cd common && npm run build

# Build verifier
RUN cd verifier && npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY scripts/ ./scripts/
COPY common/package*.json ./common/
COPY verifier/package*.json ./verifier/

# Install production dependencies
RUN npm ci --only=production

# Copy built files
COPY --from=builder /app/common/dist ./common/dist
COPY --from=builder /app/verifier/dist ./verifier/dist

# Expose port
EXPOSE 5002

# Set working directory to verifier
WORKDIR /app/verifier

# Run the application with WASM support (same as local dev)
CMD ["node", "--experimental-wasm-modules", "dist/server.js"]

