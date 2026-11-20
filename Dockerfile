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

ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev

# Copy built files and the generated Prisma client from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
# Prisma CLI is only needed to apply migrations at startup
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma/engines ./node_modules/@prisma/engines

# Hosting providers (Render, Railway, Fly) inject PORT; 3000 is the local default
ENV PORT=3000
EXPOSE 3000

# Run as the unprivileged node user. Upload folders (the compiled default and Render's UPLOADS_DIR)
# must exist and be writable before dropping root, or the server cannot create them at startup.
RUN mkdir -p /app/dist-server/uploads /var/data/uploads && chown -R node:node /app/dist-server/uploads /var/data/uploads
USER node

# Apply pending migrations, then start the compiled server
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node dist-server/server/index.js"]
