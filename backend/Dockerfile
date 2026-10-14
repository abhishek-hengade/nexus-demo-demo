# Production Backend Dockerfile
FROM node:20-alpine AS runner

WORKDIR /app

# Copy dependency specifications
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy backend source code and seed data
COPY . .

# Set environment
ENV PORT=4000
ENV NODE_ENV=production

EXPOSE 4000

# Health check probe
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["node", "src/server.js"]
