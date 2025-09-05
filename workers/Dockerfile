# Node.js workers for Telegram bots
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    curl \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package*.json ./

# Set npm configuration for better reliability
RUN npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm config set fetch-retries 5 \
    && npm config set fetch-timeout 300000

# Install dependencies with fallback
RUN npm ci --only=production --verbose || \
    (rm -rf node_modules package-lock.json && npm install --only=production --no-package-lock)

# Production image
FROM deps AS runner

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copy application code
COPY --chown=nodejs:nodejs . .

# Create necessary directories
RUN mkdir -p /app/logs /app/data && chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Health check (исправлен порт на 3002)
HEALTHCHECK --interval=15s --timeout=3s --start-period=60s --retries=6 \
    CMD curl -fsS http://localhost:3002/health || exit 1

# Expose ports
EXPOSE 8443 3002 9090

# Environment variables
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"

# Start command
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "master/scalable_bot_manager.js"]