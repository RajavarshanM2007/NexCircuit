FROM node:20-slim
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json .npmrc ./
COPY prisma ./prisma
RUN npm ci --prefer-offline --no-audit && npm cache clean --force
RUN npx prisma generate
COPY . .
RUN npm run build
RUN node_modules/.bin/tsc --esModuleInterop --module commonjs --target ES2021 --skipLibCheck --outDir dist/prisma prisma/seed.ts 2>/dev/null || true
RUN npm prune --omit=dev
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node","dist/src/main.js"]
