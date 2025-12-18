# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and npm config
COPY package*.json .npmrc* ./

# Install dependencies with cache mount for npm package cache
# npm ci is deterministic and faster when package-lock.json exists
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --no-fund --silent

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files and npm config
COPY package*.json .npmrc* ./

# Install only production dependencies with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production --prefer-offline --no-audit --no-fund --silent

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy data directory (for card files and other static data)
COPY --from=builder /app/data ./data

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "dist/src/main"]

