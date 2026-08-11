FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./
# Copy workspace packages
COPY packages/shared-types ./packages/shared-types
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN npm ci

# Copy the rest of the source code
COPY apps/api ./apps/api

# Generate Prisma Client & Build
WORKDIR /app/apps/api
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine

WORKDIR /app

# Copy root package files for production install
COPY package.json package-lock.json ./
COPY packages/shared-types ./packages/shared-types
COPY apps/api/package.json ./apps/api/

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built files
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

WORKDIR /app/apps/api
ENV NODE_ENV=production

EXPOSE 3001

CMD ["npm", "start"]
