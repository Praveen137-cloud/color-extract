# Production Dockerfile for ColorSnap
FROM node:20-alpine AS runner

WORKDIR /app

# Copy application files
COPY . .

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose server port
EXPOSE 3000

# Run native zero-dependency HTTP server
CMD ["node", "server/server.js"]
