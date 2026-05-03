# PNW Mushroom Dashboard - Production Build
# Single container with Nginx serving frontend + Node.js API backend
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies for frontend build
COPY dashboard/package*.json ./
COPY dashboard/package-lock.json* ./
RUN npm ci

# Copy frontend source files
COPY dashboard/vite.config.js ./
COPY dashboard/index.html ./
COPY dashboard/tailwind.config.js ./
COPY dashboard/postcss.config.js ./
COPY dashboard/eslint.config.js ./
COPY dashboard/src ./src

# Create public dir if it doesn't exist (for Vite)
RUN mkdir -p public

# Build React frontend
RUN npm run build

# Production stage
FROM node:20-alpine

# Install nginx and supervisord
RUN apk add --no-cache nginx supervisor curl

# Create app directory
WORKDIR /app

# Copy built frontend
COPY --from=builder /app/dist ./dist

# Copy server files
COPY dashboard/server ./server
COPY dashboard/package*.json ./

# Install Node.js dependencies
RUN npm ci --omit=dev

# Copy nginx config
COPY nginx.conf /etc/nginx/http.d/default.conf

# Create directories
RUN mkdir -p /app/data /app/logs /run/nginx /var/lib/nginx/logs /etc/supervisor/conf.d

# Fix nginx config to use /run/nginx
RUN sed -i 's|/var/run/nginx|/run/nginx|g' /etc/nginx/nginx.conf || true

# Create supervisord config
RUN echo '[supervisord]' > /etc/supervisor/conf.d/supervisord.conf && \
    echo 'nodaemon=true' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'user=root' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo '' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo '[program:node]' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'command=node server/index.js' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'directory=/app' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'autostart=true' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'autorestart=true' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'user=appuser' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'stdout_logfile=/app/logs/node.log' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'stderr_logfile=/app/logs/node.err' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo '' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo '[program:nginx]' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'command=nginx -g "daemon off;"' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'autostart=true' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'autorestart=true' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'stdout_logfile=/app/logs/nginx.log' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'stderr_logfile=/app/logs/nginx.err' >> /etc/supervisor/conf.d/supervisord.conf

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Set ownership (but keep root for nginx)
RUN chown -R appuser:appgroup /app

# Keep root for nginx, but switch to appuser for Node
USER root

EXPOSE 3060 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3060/ || exit 1

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
