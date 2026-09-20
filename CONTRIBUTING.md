# Como contribuir

Este guia cobre desenvolvimento, testes e revisão do PasTrack. A [arquitetura](docs/arquitetura.md), o [banco de dados](docs/banco-de-dados.md) e o [contrato da API](docs/api.md) trazem o contexto técnico.

## Preparar o ambiente

Use Node.js 20 ou superior, npm e Docker com Compose v2. Instale as dependências com `npm ci --prefix backend` e `npm ci --prefix frontend`. Para executar os testes ponta a ponta, instale também `npm ci --prefix e2e`.

### Aplicação completa com Docker Compose

Na raiz do projeto, copie [`.env.example`](.env.example) para `.env`, defina `POSTGRES_PASSWORD`, `JWT_SECRET` e `SEED_ADMIN_SENHA` e execute:

```bash
docker compose up -d --build --wait
```

Acesse `http://localhost:8080`. O serviço `web` expõe o site e encaminha `/api`; a API não abre uma porta no host. O banco fica disponível em `127.0.0.1:5432` para desenvolvimento local. `docker compose down` para a aplicação; o volume do banco só é removido com `-v`.

### Desenvolvimento local

É possível usar apenas o banco do Compose e iniciar os dois servidores no host:

```bash
docker compose up -d banco
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm ci --prefix backend
npm ci --prefix frontend
```

No `backend/.env`, configure `DATABASE_URL` com `127.0.0.1` e a senha de `POSTGRES_PASSWORD`. Defina `JWT_SECRET` e as variáveis do administrador inicial. Em terminais separados, execute:

```bash
cd backend
npm run db:deploy
npm run db:seed
npm run dev
```

```bash
cd frontend
npm run dev
```

A API atende em `http://localhost:3333` e o Vite em `http://localhost:5173`. O proxy de desenvolvimento encaminha `/api` para a API.

## Testes

Para os testes de integração da API, mantenha o PostgreSQL de teste disponível na porta 5433:

```bash
docker compose -f docker-compose.test.yml up -d --wait
docker exec pastrack-teste-banco-teste-1 createdb -U pastrack pastrack_teste_seu_nome
```

Use um banco próprio. No PowerShell, defina `$env:DATABASE_URL_TESTE = "postgresql://pastrack:pastrack@127.0.0.1:5433/pastrack_teste_seu_nome?schema=public"`; no Bash, use `export DATABASE_URL_TESTE="postgresql://pastrack:pastrack@127.0.0.1:5433/pastrack_teste_seu_nome?schema=public"`. O preparo dos testes aplica as migrations nesse banco. Não derrube a pilha de teste compartilhada enquanto outras pessoas a usam.

```bash
npm test --prefix backend
npm test --prefix frontend
node --test scripts/
node scripts/gerar-doc-perfis.mjs --verificar
```

`npm run test:relatorio` executa as suítes de backend e frontend, coleta a auditoria das dependências e grava resultados em `tests/results/latest/`. `npm run test:relatorio -- --suites=backend,frontend,e2e` inclui os testes ponta a ponta quando o ambiente E2E estiver preparado. O script sobe e derruba a pilha de teste com `down -v`; rode esse comando apenas em um ambiente isolado, sem outros testes usando a mesma pilha. O [protocolo de resultados](tests/results/README.md) explica como registrar evidências.

### Testes ponta a ponta

Eles rodam contra o sistema inteiro no ar, num ambiente próprio: projeto `pastrack-e2e`, site em `127.0.0.1:8093` e banco em `127.0.0.1:5438`. Ele não encosta na instalação de desenvolvimento nem no banco de teste compartilhado.

```bash
npm ci --prefix e2e
npm run instalar-navegador --prefix e2e   # só na primeira vez
docker compose --env-file .env.e2e -f docker-compose.yml -f docker-compose.e2e.yml up -d --build --wait
npm run e2e
docker compose --env-file .env.e2e -f docker-compose.yml -f docker-compose.e2e.yml down -v
```

O `.env.e2e` guarda só valores descartáveis, e por isso é versionado. O preparo global resolve a troca obrigatória de senha do administrador e grava uma sessão por perfil em `e2e/sessoes/`, que fica fora do Git por conter tokens.

Para ver a última execução, use `npx playwright show-report` dentro de `e2e/`. Os casos usam papel e rótulo acessível, nunca classe de CSS: assim eles continuam valendo quando o visual mudar.

## Fluxo de trabalho

Crie uma branch a partir da `main` atualizada. Use `tipo/descricao-em-kebab-case`, com um dos tipos `feat`, `fix`, `docs`, `test`, `chore`, `ci`, `refactor`, `style`, `perf` ou `build`. Mantenha cada mudança focada e explique no PR como foi verificada.

Escreva commits em português no formato Conventional Commits, como `fix(estoque): impede saldo negativo`. Faça o merge de PRs por **squash** após a revisão. Os checks obrigatórios são `backend`, `frontend` e `compose-smoke` no [workflow de integração](.github/workflows/ci.yml). O registro de evidências de testes segue o [protocolo próprio](tests/results/README.md).

## Migrations e estilo

Altere o [schema Prisma](backend/prisma/schema.prisma) e crie migrations com `npx prisma migrate dev --create-only --name nome_da_mudanca` dentro de `backend/`. Revise o SQL, em especial restrições e índices que o Prisma não modela. Confira com `npm run db:verificar` usando um `SHADOW_DATABASE_URL` descartável. Não reescreva migrations já aplicadas. A [política do banco](docs/banco-de-dados.md#política-de-migrations) descreve o baseline de bancos existentes.

Siga os padrões do projeto: TypeScript tipado, validação de entrada com Zod, texto em português do Brasil e formatação com Prettier. Rode `npm run lint`, `npm run typecheck`, `npm run format:check`, `npm run test:tudo` e `npm run build` na raiz antes de pedir revisão. A revisão confere comportamento, permissão por perfil, mensagens de erro, concorrência no estoque, migrations, documentação e testes relevantes.
