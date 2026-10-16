# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy backend source
COPY backend/src ./src

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY backend/package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/src ./src

# Create uploads directory with correct permissions
RUN mkdir -p /app/uploads && chown -R nodejs:nodejs /app/uploads

# Switch to non-root user
USER nodejs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD ["node", "-e", "const prefix=process.env.API_PREFIX||'/api/v1';fetch('http://127.0.0.1:3000'+prefix+'/health/ready').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"]

CMD ["node", "src/server.js"]
