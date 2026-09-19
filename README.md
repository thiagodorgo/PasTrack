# PasTrack

[![CI](https://github.com/thiagodorgo/PasTrack/actions/workflows/ci.yml/badge.svg)](https://github.com/thiagodorgo/PasTrack/actions/workflows/ci.yml)

Sistema web para controle de estoque de pastilhas industriais, desenvolvido na UC Projeto Aplicado IV do Centro Universitário SENAI Santa Catarina, a partir de uma demanda real da DDA Usinagem Industrial publicada na plataforma SAGA SENAI de Inovação.

O sistema substitui o controle em planilhas por registros centralizados: cadastro de pastilhas, fabricantes e fornecedores, entradas e saídas de estoque com validação de saldo, alertas automáticos de estoque mínimo, painel com a situação geral e histórico completo das movimentações.

## O que ele faz

- **Saldo que não se digita:** ele é consequência das entradas e saídas, numa operação atômica que nunca deixa o estoque negativo.
- **Alerta automático de reposição:** abre quando o saldo chega ao estoque mínimo e fecha sozinho quando a reposição passa dele. Mínimo zero desliga o alerta.
- **Rastreabilidade:** toda movimentação guarda quem registrou, quando e com qual documento; cadastros e senhas deixam trilha de auditoria.
- **Acesso por perfil:** administrador, gestor, operador e comprador, com a permissão conferida no servidor.
- **Dez telas:** login, primeiro acesso, painel, pastilhas, movimentações, alertas, fabricantes, fornecedores, usuários e a página de acesso negado.

## Modelagem de dados

O banco do PasTrack foi modelado em duas etapas: primeiro o modelo conceitual,
na notação de Peter Chen, e depois o modelo lógico, já no formato relacional
com as chaves primárias e estrangeiras definidas.

O modelo tem seis entidades. A pastilha é o centro: cada uma pertence a um
fabricante e guarda o estoque mínimo configurado e o saldo atual. A
movimentacao registra tanto as entradas quanto as saídas (campo tipo), sempre
com o usuario responsável pelo lançamento; nas entradas, ela também pode
indicar o fornecedor de origem. Quando o saldo de um item chega ao estoque
mínimo, o sistema gera um registro em alerta, que fica aberto até a reposição.

### Modelo conceitual

![Modelo conceitual do banco de dados](docs/mer_conceitual.png)

### Modelo lógico

![Modelo lógico do banco de dados](docs/mer_logico.png)

A arquitetura em três camadas da aplicação está em [docs/arquitetura.png](docs/arquitetura.png).

## Tecnologias

- Front-end: React + TypeScript (Vite), React Router e Recharts
- Back-end: Node.js + Express + TypeScript
- Banco de dados: PostgreSQL com Prisma ORM
- Autenticação: JWT, com senhas armazenadas em hash (bcrypt)

## Requisitos

- Node.js 20 ou superior
- PostgreSQL 15 ou superior
- Ou apenas Docker com Compose v2, para rodar tudo em containers

## Como rodar com Docker

Sobe o banco, a API e o front-end (servido pelo nginx) com um único comando. Requer Docker com Compose v2.

```bash
cp .env.example .env   # preencha POSTGRES_PASSWORD, JWT_SECRET e SEED_ADMIN_SENHA (instruções no próprio arquivo)
docker compose up -d --build --wait
```

Abra http://localhost:8080 e entre com o e-mail de `SEED_ADMIN_EMAIL` e a senha definida em `SEED_ADMIN_SENHA`. Outros computadores da rede acessam pelo IP desta máquina, na mesma porta (`WEB_PORTA`). A cada subida, a API aplica as migrations pendentes e confere o administrador inicial, sem alterar um que já exista.

O banco fica acessível só nesta máquina, em `localhost:5432` (`DB_PORTA`), para quem quiser rodar a API em modo de desenvolvimento. Para parar, use `docker compose down`; os dados continuam no volume `dados-banco`, que só é apagado com `docker compose down -v`.

## Como rodar o back-end

```bash
cd backend
cp .env.example .env   # preencha JWT_SECRET e SEED_ADMIN_SENHA (instruções no próprio arquivo)
npm install
npm run db:deploy      # aplica as migrations versionadas
npm run db:seed        # cria o administrador inicial
npm run dev
```

A API sobe em http://localhost:3333. O banco pode ser um PostgreSQL local ou o do Docker Compose (`docker compose up -d banco`, com a senha de `POSTGRES_PASSWORD` na `DATABASE_URL`).

## Como rodar o front-end

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

A aplicação abre em http://localhost:5173 e encaminha as chamadas de `/api` para a API em http://localhost:3333.

## Acesso inicial

O seed cria um único administrador com o e-mail de `SEED_ADMIN_EMAIL` e a senha de `SEED_ADMIN_SENHA`. Em desenvolvimento, se a senha ficar vazia, o seed gera uma senha aleatória e a exibe uma única vez. Em produção a variável é obrigatória. Rodar o seed de novo nunca altera a senha de um administrador que já existe.

Para carregar dados de demonstração (fabricantes, fornecedores, pastilhas e um usuário de cada perfil), defina `SEED_DEMO=true` no `.env` e rode `npm run db:seed:demo`.

## Testes

```bash
docker compose -f docker-compose.test.yml up -d --wait   # banco de teste, na porta 5433
npm run test:tudo                                        # backend e frontend
docker compose -f docker-compose.test.yml down -v
```

A última execução registrada tem **574 testes no backend** e **295 no frontend**, com cobertura de linhas acima de 98% nos dois. As evidências ficam em [tests/results/](tests/results/README.md), e a estratégia em [docs/testes.md](docs/testes.md).

Para conferir uma instalação recém-criada de ponta a ponta, use `npm run verificar:implantacao`, descrito no [guia de implantação](docs/deploy.md#conferir-a-instalação).

## Documentação

| Para                               | Leia                                                                                                 |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------- |
| usar o sistema no dia a dia        | [Manual do usuário](docs/manual-do-usuario.md)                                                       |
| instalar na empresa                | [Guia de implantação](docs/deploy.md)                                                                |
| cuidar do sistema no servidor      | [Manual de operação](docs/operacao.md)                                                               |
| integrar com a API                 | [Contrato da API](docs/api.md)                                                                       |
| entender as decisões e a segurança | [Arquitetura](docs/arquitetura.md), [Segurança](docs/seguranca.md) e [ADRs](docs/decisoes/README.md) |
| conferir requisitos e testes       | [Requisitos](docs/requisitos.md) e [Plano de testes](docs/testes/plano-de-testes.md)                 |

O índice completo está em [docs/README.md](docs/README.md).

## Estrutura do projeto

```
backend/        API REST em camadas (routes, controllers, services, repositories), com Prisma e os testes
frontend/       SPA React com as dez telas e os testes de interface
e2e/            testes ponta a ponta com Playwright
docs/           documentação e diagramas do projeto
scripts/        geradores e o relatório de testes
tests/results/  evidências versionadas das execuções de teste
```

## Equipe

- Thiago Araújo
- Fabrício Alves
- Joseph Correa
- Péttrin Miranda
