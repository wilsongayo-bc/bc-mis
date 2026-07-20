FROM node:20-alpine

RUN apk add --no-cache python3 make g++ wget

WORKDIR /app

COPY package*.json ./
COPY api/package*.json ./api/

RUN npm ci --omit=dev --ignore-scripts
RUN cd api && npm ci --omit=dev

COPY . .

RUN cd api && npm run build

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "api/dist/server.js"]