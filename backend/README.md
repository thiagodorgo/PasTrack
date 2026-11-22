# API do PasTrack

Este pacote é a API REST do PasTrack. Ela guarda os cadastros de pastilhas, fabricantes, fornecedores e usuários, registra as entradas e saídas do estoque, mantém o saldo de cada pastilha e abre os alertas de estoque mínimo. O frontend em [`../frontend`](../frontend) consome todas as rotas sob `/api`.

O contrato completo das rotas está em [docs/api.md](../docs/api.md). Este documento explica como o código está organizado e como trabalhar nele.

## Stack

| Item               | Versão                    | Uso                                                                                 |
| ------------------ | ------------------------- | ----------------------------------------------------------------------------------- |
| Node.js            | `>=20` (`engines`)        | Execução. O `.nvmrc` da raiz e a imagem Docker (`node:20-bookworm-slim`) usam o 20. |
| TypeScript         | `~5.9.3`                  | Linguagem, com `tsc` para checar tipos e compilar.                                  |
| Express            | `^4.22.3`                 | Servidor HTTP e rotas.                                                              |
| Prisma             | `^5.22.0`                 | Cliente do banco, schema e migrations.                                              |
| PostgreSQL         | 16 (`postgres:16-alpine`) | Banco de dados, no Docker Compose.                                                  |
| Zod                | `^4.6.5`                  | Validação de body, params, query e variáveis de ambiente.                           |
| jsonwebtoken       | `^9.0.2`                  | Token JWT da sessão.                                                                |
| bcryptjs           | `^3.0.3`                  | Hash das senhas.                                                                    |
| helmet e cors      | `^8.3.0` e `^2.8.5`       | Cabeçalhos de segurança e origens autorizadas.                                      |
| express-rate-limit | `^8.7.0`                  | Limites de requisição por IP, por usuário e no login.                               |
| pino e pino-http   | `^10.3.1` e `^11.0.0`     | Logs estruturados em JSON.                                                          |
| Vitest             | `^4.1.11`                 | Testes, com cobertura pelo `@vitest/coverage-v8`.                                   |
| Supertest          | `^7.2.2`                  | Requisições HTTP nos testes de integração.                                          |
| ESLint e Prettier  | `^9.39.5` e `^3.9.6`      | Análise estática e formatação.                                                      |

## Estrutura das pastas

```text
backend/
├── prisma/        schema.prisma e migrations versionadas
├── scripts/       verificador de migrations
├── src/
│   ├── app.ts     montagem do Express e ordem dos middlewares
│   ├── server.ts  sobe o servidor e encerra com SIGTERM e SIGINT
│   ├── config/
│   ├── controllers/
│   ├── middlewares/
│   ├── repositories/
│   ├── routes/
│   ├── schemas/
│   ├── scripts/
│   ├── services/
│   ├── types/
│   └── utils/
└── tests/
    ├── helpers/
    ├── integration/
    ├── security/
    ├── setup/
    └── unit/
```

### `src/`

| Pasta ou arquivo                    | O que faz                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`app.ts`](src/app.ts)              | Cria o app Express e registra os middlewares globais, as rotas de `/api`, o 404 e o tratador de erros.                                                                                                                                                                                                                                                                                     |
| [`server.ts`](src/server.ts)        | Abre a porta `PORT` e, ao receber `SIGTERM` ou `SIGINT`, para de aceitar conexões e fecha o banco. Força a saída depois de 10 s.                                                                                                                                                                                                                                                           |
| [`routes/`](src/routes)             | Um arquivo por recurso (`*.routes.ts`). As rotas que alteram dados encadeiam `autorizar`, `validar` e o controller envolvido em `capturar`; as de leitura usam só `validar` quando recebem params ou query. Em `usuario.routes.ts`, o `autorizar("gerenciarUsuarios")` vale para o router inteiro. O [`index.ts`](src/routes/index.ts) monta os routers e aplica os middlewares de sessão. |
| [`controllers/`](src/controllers)   | Traduzem a requisição em chamada de service e devolvem o status e o JSON. Não têm regra de negócio.                                                                                                                                                                                                                                                                                        |
| [`services/`](src/services)         | Regras de negócio e transações (`prisma.$transaction`). Registram a auditoria na mesma transação. [`estoque/avaliar-alerta.ts`](src/services/estoque/avaliar-alerta.ts) abre e resolve alertas; [`politica-senha.ts`](src/services/politica-senha.ts) define a política de senha.                                                                                                          |
| [`repositories/`](src/repositories) | Consultas e gravações com Prisma. As funções que gravam recebem o cliente da transação (`Prisma.TransactionClient`).                                                                                                                                                                                                                                                                       |
| [`schemas/`](src/schemas)           | Esquemas Zod de entrada, um por recurso. [`comum.schema.ts`](src/schemas/comum.schema.ts) tem `objetoEstrito`, que recusa campos fora do esquema, `texto` e o `idParam` dos caminhos com `:id`.                                                                                                                                                                                            |
| [`middlewares/`](src/middlewares)   | `request-id.ts`, `auth.ts` (`autenticar` e `autorizar`), `exigir-senha-atualizada.ts`, `rate-limit.ts`, `validar.ts` e `erros.ts` (`AppError`, `capturar` e `tratarErros`).                                                                                                                                                                                                                |
| [`config/`](src/config)             | [`env.ts`](src/config/env.ts) valida as variáveis de ambiente e encerra o processo se faltar alguma; [`logger.ts`](src/config/logger.ts) configura o pino e esconde senhas e tokens; [`prisma.ts`](src/config/prisma.ts) cria o cliente; [`permissoes.ts`](src/config/permissoes.ts) é a matriz de perfis.                                                                                 |
| [`scripts/`](src/scripts)           | `seed.ts` cria o administrador inicial, `seed-demo.ts` carrega os dados de demonstração e `redefinir-senha-admin.ts` recupera o acesso de um administrador pela linha de comando.                                                                                                                                                                                                          |
| [`types/`](src/types)               | Acrescenta `req.usuario` ao tipo `Request` do Express.                                                                                                                                                                                                                                                                                                                                     |
| [`utils/`](src/utils)               | Funções puras, como a validação de CNPJ numérico e alfanumérico em [`cnpj.ts`](src/utils/cnpj.ts).                                                                                                                                                                                                                                                                                         |

### `prisma/`, `scripts/` e `tests/`

| Pasta                                                                  | O que faz                                                                                                                   |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [`prisma/schema.prisma`](prisma/schema.prisma)                         | Modelo das tabelas. O dicionário de dados está em [docs/banco-de-dados.md](../docs/banco-de-dados.md).                      |
| [`prisma/migrations/`](prisma/migrations)                              | Migrations SQL versionadas, aplicadas em ordem por `prisma migrate deploy`.                                                 |
| [`scripts/verificar-migrations.mjs`](scripts/verificar-migrations.mjs) | Confere se as migrations reproduzem o `schema.prisma`. Roda com `npm run db:verificar`.                                     |
| [`tests/unit/`](tests/unit)                                            | Testes sem banco: variáveis de ambiente, política de senha, CNPJ, permissões, logger, validação e tratador de erros.        |
| [`tests/integration/`](tests/integration)                              | Testes das rotas pela API, com banco real: cadastros, movimentações, alertas, painel, usuários, seed e transações.          |
| [`tests/security/`](tests/security)                                    | Testes de segurança com banco real: tokens, força bruta, RBAC, primeiro acesso, usuário inativo, cabeçalhos e concorrência. |
| [`tests/helpers/`](tests/helpers)                                      | Funções de apoio: cliente Supertest, limpeza do banco, login por perfil e fábricas de registros.                            |
| [`tests/setup/`](tests/setup)                                          | `global.ts` confere o banco de teste e aplica as migrations; `integracao.ts` limpa o banco antes de cada teste.             |

O [`Dockerfile`](Dockerfile) compila o código e gera a imagem da API. Na subida do container, o [`docker-entrypoint.sh`](docker-entrypoint.sh) aplica as migrations, roda o seed do administrador, carrega a demonstração quando `SEED_DEMO=true` e inicia o servidor.

## Caminho de uma requisição

A ordem vem de [`src/app.ts`](src/app.ts) e de [`src/routes/index.ts`](src/routes/index.ts):

1. `atribuirRequestId` dá um id à requisição e o devolve no cabeçalho `X-Request-Id`.
2. `criarLogDeAcesso` registra o acesso no log.
3. `helmet` aplica os cabeçalhos de segurança, e `cors` libera só as origens de `CORS_ORIGINS`.
4. As respostas de `/api` recebem `Cache-Control: no-store`.
5. `express.json` lê o corpo, com limite de 100 kB.
6. `limitarGlobal` aplica o limite por IP em todo o `/api`.
7. As rotas públicas respondem aqui: `GET /api/health` e `POST /api/auth/login`, que tem o próprio `limitarLogin`. `GET /api/auth/me` e `PATCH /api/auth/senha` declaram `autenticar` na própria rota.
8. Para as demais rotas, `autenticar` confere o token e revalida a sessão no banco, `limitarPorUsuario` aplica o limite do usuário e `exigirSenhaAtualizada` bloqueia quem ainda tem senha temporária.
9. Na rota, `autorizar` confere o perfil, `validar` aplica os esquemas Zod e o controller chama o service.
10. Uma rota que não existe responde 404, e `tratarErros` converte qualquer erro na resposta JSON.

A [arquitetura](../docs/arquitetura.md#caminho-de-uma-requisição-autenticada) descreve o mesmo caminho do ponto de vista do sistema inteiro.

## Como os erros são devolvidos

Todo erro sai do tratador central em [`src/middlewares/erros.ts`](src/middlewares/erros.ts) com o mesmo formato:

| Campo       | Quando aparece                                           |
| ----------- | -------------------------------------------------------- |
| `erro`      | Sempre. Mensagem para exibir ao usuário.                 |
| `codigo`    | Quando o erro tem código estável, como `NAO_ENCONTRADO`. |
| `campos`    | Com `DADOS_INVALIDOS`: lista de `{ caminho, mensagem }`. |
| `requestId` | No `500`, para achar o erro completo nos logs.           |

O tratador reconhece estes casos:

- `AppError(mensagem, status, codigo)`, lançado pelos services e middlewares, vira o status e o código informados.
- `ZodError`, lançado por `validar`, vira `400` com `DADOS_INVALIDOS` e `campos`.
- Os erros do Prisma `P2002`, `P2025` e `P2003` viram `409 DUPLICADO`, `404 NAO_ENCONTRADO` e `400 REFERENCIA_INVALIDA`.
- JSON malformado vira `400`, e corpo acima de 100 kB vira `413`.
- Qualquer outro erro vai para o log e responde `500` com `requestId`, sem detalhes internos.

Controllers assíncronos ficam dentro de `capturar(...)`, que encaminha a promessa rejeitada para o tratador. A lista de códigos e status está em [docs/api.md](../docs/api.md#envelope-de-erro).

## Scripts do npm

Rode dentro de `backend/` ou com `--prefix backend` a partir da raiz.

| Script                    | O que faz                                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `npm run dev`             | Sobe a API com `tsx watch`, que reinicia a cada alteração em `src/`.                                             |
| `npm run build`           | Gera o cliente Prisma e compila `src/` para `dist/`.                                                             |
| `npm start`               | Executa a versão compilada em `dist/server.js`.                                                                  |
| `npm run typecheck`       | Confere os tipos sem gerar arquivos.                                                                             |
| `npm run lint`            | Roda o ESLint.                                                                                                   |
| `npm run lint:fix`        | Roda o ESLint e corrige o que for automático.                                                                    |
| `npm run format`          | Formata os arquivos com o Prettier.                                                                              |
| `npm run format:check`    | Confere a formatação sem alterar arquivos.                                                                       |
| `npm test`                | Roda todas as suítes: unidade, integração e segurança.                                                           |
| `npm run test:unit`       | Roda só os testes de unidade, que não precisam de banco.                                                         |
| `npm run test:integracao` | Roda os testes de integração e de segurança, que precisam do banco de teste.                                     |
| `npm run test:cov`        | Roda todas as suítes com cobertura, gravada em `tests/results/latest/backend-coverage/`, na raiz do repositório. |
| `npm run db:migrate`      | `prisma migrate dev`: aplica as migrations no banco de desenvolvimento e cria novas.                             |
| `npm run db:deploy`       | `prisma migrate deploy`: aplica as migrations pendentes, sem criar novas.                                        |
| `npm run db:verificar`    | Confere se as migrations reproduzem o `schema.prisma`. Exige `SHADOW_DATABASE_URL`.                              |
| `npm run db:seed`         | Cria o administrador inicial, se ele ainda não existir.                                                          |
| `npm run db:seed:demo`    | Carrega os dados de demonstração. Só faz algo com `SEED_DEMO=true`.                                              |
| `npm run db:studio`       | Abre o Prisma Studio para ver as tabelas no navegador.                                                           |
| `npm run db:teste:subir`  | Sobe o banco de teste de `docker-compose.test.yml` e espera ele ficar pronto.                                    |
| `npm run db:teste:parar`  | Derruba o banco de teste e apaga os dados.                                                                       |

## Variáveis de ambiente

A API lê o `backend/.env` (modelo em [`.env.example`](.env.example)). [`src/config/env.ts`](src/config/env.ts) valida os valores na partida e encerra o processo com a lista do que corrigir.

| Variável                      | Padrão                  | Descrição                                                                                |
| ----------------------------- | ----------------------- | ---------------------------------------------------------------------------------------- |
| `NODE_ENV`                    | `development`           | `development`, `test` ou `production`.                                                   |
| `PORT`                        | `3333`                  | Porta da API.                                                                            |
| `DATABASE_URL`                | obrigatória             | URL `postgresql://` do banco. Use `127.0.0.1` em vez de `localhost` no Windows.          |
| `JWT_SECRET`                  | obrigatória             | Chave do token, com pelo menos 32 caracteres. Valores de exemplo são recusados.          |
| `JWT_EXPIRES_IN`              | `8h`                    | Validade do token, no formato `8h`, `30m` ou `1d`.                                       |
| `CORS_ORIGINS`                | `http://localhost:5173` | Origens do navegador autorizadas, separadas por vírgula.                                 |
| `TRUST_PROXY`                 | `0`                     | Quantidade de proxies reversos na frente da API. É `1` atrás do nginx do Docker Compose. |
| `BCRYPT_CUSTO`                | `12`                    | Custo do bcrypt, de 4 a 15. Em produção precisa ser 12 ou mais.                          |
| `LOG_LEVEL`                   | `info`                  | Nível do log do pino, de `fatal` a `trace`, ou `silent`.                                 |
| `RATE_LIMIT_LOGIN_MAX`        | `5`                     | Falhas de login permitidas por IP e e-mail dentro da janela.                             |
| `RATE_LIMIT_LOGIN_JANELA_MIN` | `15`                    | Janela do limite de login, em minutos.                                                   |
| `RATE_LIMIT_GLOBAL_MAX`       | `1000`                  | Requisições por minuto de cada IP em `/api`, antes da autenticação.                      |
| `RATE_LIMIT_USUARIO_MAX`      | `300`                   | Requisições por minuto de cada usuário autenticado.                                      |
| `SEED_ADMIN_EMAIL`            | `admin@pastrack.local`  | E-mail do administrador criado por `npm run db:seed`.                                    |
| `SEED_ADMIN_SENHA`            | vazia                   | Senha desse administrador. Vazia, o seed gera uma senha e a exibe uma vez.               |
| `SEED_DEMO`                   | `false`                 | Com `true`, `npm run db:seed:demo` cria os dados de demonstração.                        |
| `SEED_DEMO_SENHA`             | vazia                   | Senha dos usuários de demonstração. Vazia, o seed gera uma senha e a exibe uma vez.      |

As variáveis `SEED_*` são lidas só pelos scripts de seed. No Docker Compose, os valores vêm do `.env` da raiz, descrito no [guia de implantação](../docs/deploy.md#o-que-cada-variável-faz).

## Como rodar localmente

Pré-requisitos: Node.js 20 ou superior, npm e Docker com Compose v2.

1. Na raiz do projeto, copie `.env.example` para `.env` e preencha `POSTGRES_PASSWORD` e `JWT_SECRET`. O Docker Compose confere as variáveis obrigatórias de todos os serviços, então `docker compose up -d banco` falha sem o `JWT_SECRET`. Se a porta 5432 já estiver ocupada na máquina, troque `DB_PORTA` nesse arquivo.
2. Suba só o banco: `docker compose up -d banco`.
3. Copie `backend/.env.example` para `backend/.env`. Em `DATABASE_URL`, coloque a senha de `POSTGRES_PASSWORD` e a porta de `DB_PORTA`. Gere um `JWT_SECRET` com o comando indicado no próprio arquivo.
4. Instale as dependências, aplique as migrations, crie o administrador e suba a API:

```bash
cd backend
npm ci
npm run db:deploy
npm run db:seed
npm run dev
```

A API responde em `http://localhost:3333`. Para conferir, abra `http://localhost:3333/api/health`. O primeiro login do administrador exige a troca da senha. Para usar a interface, suba o frontend em outro terminal com `npm run dev --prefix frontend`; o Vite atende em `http://localhost:5173` e encaminha `/api` para a porta 3333.

Para subir o sistema inteiro em containers, siga o [guia de implantação](../docs/deploy.md).

## Como rodar os testes

Os testes de unidade não precisam de banco:

```bash
npm run test:unit
```

Os testes de integração e de segurança usam um PostgreSQL descartável na porta 5433, definido em [`docker-compose.test.yml`](../docker-compose.test.yml). Os dados ficam em memória e somem quando o container para.

```bash
npm run db:teste:subir
npm test
npm run test:cov
```

Antes da primeira suíte de integração, [`tests/setup/global.ts`](tests/setup/global.ts) confere a conexão e aplica as migrations. Antes de cada teste, [`tests/setup/integracao.ts`](tests/setup/integracao.ts) esvazia as tabelas. Os arquivos de integração rodam um de cada vez.

O ambiente dos testes fica em [`vitest.config.mts`](vitest.config.mts). Por padrão, a URL do banco é `postgresql://pastrack:pastrack@127.0.0.1:5433/pastrack_teste?schema=public`. Para usar outro banco, defina `DATABASE_URL_TESTE`. Quando várias pessoas usam a mesma pilha de teste, crie um banco próprio, como explica o [guia de contribuição](../CONTRIBUTING.md#testes), e não rode `npm run db:teste:parar` enquanto outras pessoas a usam.

A última execução registrada teve 725 testes do backend aprovados e 98,56% de cobertura de linhas. Os números de cada execução estão em [tests/results/HISTORICO.md](../tests/results/HISTORICO.md), e a estratégia de testes em [docs/testes.md](../docs/testes.md).

## Migrations

O fluxo para mudar o banco:

1. Altere [`prisma/schema.prisma`](prisma/schema.prisma).
2. Crie a migration sem aplicar: `npx prisma migrate dev --create-only --name nome_da_mudanca`.
3. Revise o SQL gerado em `prisma/migrations/` e acrescente as regras do PostgreSQL que o Prisma não representa, como índices parciais.
4. Aplique no banco de desenvolvimento com `npm run db:migrate`.
5. Confira com `npm run db:verificar`, com `SHADOW_DATABASE_URL` apontando para um banco vazio e descartável.

Não edite migrations já aplicadas. A política completa, com o baseline de bancos existentes, está em [docs/banco-de-dados.md](../docs/banco-de-dados.md#política-de-migrations) e no [ADR-0002](../docs/decisoes/ADR-0002-migrations-versionadas-e-docker-compose.md).

## Como adicionar uma nova rota

Siga a mesma divisão das rotas existentes. Os arquivos de fabricante são o exemplo mais curto.

1. **Schema.** Em `src/schemas/<recurso>.schema.ts`, descreva body, params e query com `objetoEstrito` e `texto` de [`comum.schema.ts`](src/schemas/comum.schema.ts). Use `idParam` para `:id` e exporte o tipo com `z.infer`.
2. **Permissão.** Se a rota altera dados e não é liberada para os quatro perfis, crie ou reaproveite uma ação em [`src/config/permissoes.ts`](src/config/permissoes.ts). Uma ação nova também precisa da descrição em `DESCRICOES`, no [`scripts/gerar-doc-perfis.mjs`](../scripts/gerar-doc-perfis.mjs) da raiz. Mudança na matriz de perfis exige um ADR ([ADR-0003](../docs/decisoes/ADR-0003-matriz-de-perfis-e-papel-do-comprador.md)).
3. **Rota.** Em `src/routes/<recurso>.routes.ts`, encadeie `autorizar("<acao>")`, depois `validar({ ... })` e o controller dentro de `capturar(...)`. A permissão vem antes da validação. Um router novo é montado em [`src/routes/index.ts`](src/routes/index.ts), abaixo da linha que aplica `autenticar`.
4. **Controller.** Em `src/controllers/`, leia `req.params`, `req.query`, `req.body` e `req.usuario`, chame o service e devolva o status e o JSON.
5. **Service.** Em `src/services/`, aplique a regra de negócio. Para falhas esperadas, lance `AppError` com status e código. Gravações ficam dentro de `prisma.$transaction`, com `registrarAuditoria` na mesma transação.
6. **Repository.** Em `src/repositories/`, escreva as consultas Prisma. As funções que gravam recebem o `tx` da transação.
7. **Testes.** Cubra o caminho feliz, a validação e o `403` de cada perfil sem permissão em `tests/integration/`. Use os helpers de `tests/helpers/`, como `entrarComo`. Regras puras ganham teste em `tests/unit/`.
8. **Documentação.** Descreva a rota em [docs/api.md](../docs/api.md), na tabela de resumo e na seção do recurso, com corpo, respostas e erros.
9. **Perfis.** Se mexeu em `permissoes.ts`, rode `npm run docs:perfis` na raiz para regenerar [docs/perfis-e-permissoes.md](../docs/perfis-e-permissoes.md). O CI recusa o documento desatualizado.
10. **Conferência.** Rode `npm run lint`, `npm run typecheck`, `npm run format:check` e `npm test` antes de abrir o PR.

## Leitura relacionada

- [Contrato da API](../docs/api.md): rotas, corpos, respostas, códigos de erro e limites.
- [Arquitetura](../docs/arquitetura.md): camadas, caminho de uma requisição e registro de uma movimentação.
- [Banco de dados](../docs/banco-de-dados.md): relações, dicionário de dados e restrições.
- [Segurança](../docs/seguranca.md): autenticação, sessão, permissões, riscos aceitos e LGPD.
- [Perfis e permissões](../docs/perfis-e-permissoes.md): matriz gerada a partir de `permissoes.ts`.
- [Testes](../docs/testes.md): estratégia, comandos e evidências.
- [Decisões de arquitetura](../docs/decisoes/README.md): os ADRs do projeto.
- [Guia de contribuição](../CONTRIBUTING.md): branches, commits, revisão e checks do CI.
