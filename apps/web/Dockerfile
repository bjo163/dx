FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --filter @dx/web
COPY apps/web apps/web
RUN pnpm --filter @dx/web build
WORKDIR /app/apps/web
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
# Run the workspace script so pnpm resolves the package-local Next.js binary.
CMD ["pnpm","start"]
