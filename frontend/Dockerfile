FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json .npmrc ./
RUN npm ci --legacy-peer-deps --prefer-offline --no-audit && npm cache clean --force

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build-time public env vars — must be ARG+ENV so Next.js bakes them in during build
ARG NEXT_PUBLIC_GOOGLE_ENABLED=false
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ARG NEXT_PUBLIC_CDN_URL=https://media.vitelectronics.com
ARG NEXT_PUBLIC_SITE_URL=https://vitelectronics.com
ENV NEXT_PUBLIC_GOOGLE_ENABLED=$NEXT_PUBLIC_GOOGLE_ENABLED
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_CDN_URL=$NEXT_PUBLIC_CDN_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
