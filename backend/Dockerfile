# Base comum: Node 20 com OpenSSL, exigido pelos engines do Prisma.
FROM node:20-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Build: instala tudo, gera o Prisma Client, compila e descarta as dependências de desenvolvimento.
FROM base AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json tsconfig.build.json ./
RUN npm run build && npm prune --omit=dev

# Imagem final: só o necessário para rodar, com usuário sem privilégios.
FROM base
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --chown=node:node docker-entrypoint.sh ./docker-entrypoint.sh
USER node
EXPOSE 3333
# chamado via sh: o bit de execução do script se perde em checkouts no Windows
ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
