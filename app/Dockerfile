# syntax=docker/dockerfile:1.7
FROM node:26-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund

FROM node:26-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_CHARGEBEE_SITE
ARG NEXT_PUBLIC_CHARGEBEE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CHARGEBEE_SITE=$NEXT_PUBLIC_CHARGEBEE_SITE
ENV NEXT_PUBLIC_CHARGEBEE_PUBLISHABLE_KEY=$NEXT_PUBLIC_CHARGEBEE_PUBLISHABLE_KEY
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:26-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache tini postgresql16-client
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules ./node_modules
RUN mkdir -p /app/.next/server/chunks/data && cp /app/node_modules/pdfkit/js/data/*.afm /app/.next/server/chunks/data/
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/src/db ./src/db
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
ENTRYPOINT ["/sbin/tini","--"]
CMD ["sh","scripts/start.sh"]
