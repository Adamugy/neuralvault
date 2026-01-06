# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies including devDependencies (for build)
RUN npm ci

# Copy the rest of the files
COPY . .

# Build the application (client + server)
RUN npm run build

# Production Stage
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server

# Expose port 3000 (Vite typically uses 3000, server.ts might use 3001 or process.env.PORT)
EXPOSE 3000

# Entry point: Use the compiled server
# Note: In Cloud Run, the PORT env var is provided automatically
CMD ["node", "dist-server/server/index.js"]
