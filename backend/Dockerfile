# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

# Production Stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=10000

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production
RUN npx prisma generate

COPY --from=builder /app/dist ./dist

# Diretório para sessões do Baileys
RUN mkdir -p /var/data/whatsapp_sessions && chown -R node:node /var/data/whatsapp_sessions

USER node

EXPOSE 10000

CMD ["node", "dist/server.js"]
