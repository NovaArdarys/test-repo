# ------------------------
# Base image
# ------------------------
FROM oven/bun:1-alpine AS base
WORKDIR /app

# ------------------------
# Dependencies stage
# ------------------------
FROM base AS deps

ARG SERVICE_NAME=auth-service
ENV SERVICE_NAME=${SERVICE_NAME}

# Copy root package files
COPY package.json bun.lock* ./

# Copy package.json service
COPY ./package.json ./packages/${SERVICE_NAME}/

# Install dependencies
RUN bun install

# ------------------------
# Runner stage (final image)
# ------------------------
FROM base AS runner

ARG SERVICE_NAME=auth-service
ENV SERVICE_NAME=${SERVICE_NAME}

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/bun.lock ./bun.lock

# Copy full source code service dari build context
COPY ./ ./packages/${SERVICE_NAME}

# Gunakan user non-root
USER bun

# Environment
ENV NODE_ENV=production
ENV SERVICE_INTERNAL_PORT=3000
EXPOSE 3000

# Metadata
LABEL org.opencontainers.image.title="${SERVICE_NAME} Service"
LABEL org.opencontainers.image.description="Microservice ${SERVICE_NAME} with Bun and Hono"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.licenses="MIT"

# Healthcheck
# HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=5 \
#   CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# jalankan service dynamic
CMD ["bun", "run", "packages/auth-service/src/index.ts"]
