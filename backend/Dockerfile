# Backend Dockerfile for Node.js + Express + Prisma REST API
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Copy application source
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript code
RUN npm run build
RUN npm run prisma:generate

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5001

# Copy built artifacts and production dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Uploads directory
RUN mkdir -p /app/uploads

EXPOSE 5001

CMD ["node", "dist/server.js"]
