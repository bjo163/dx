FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --filter @dx/api --prod
COPY apps/api/src apps/api/src
WORKDIR /app/apps/api
ENV NODE_ENV=production PORT=4000
EXPOSE 4000
CMD ["node","src/server.js"]
