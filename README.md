# PasTrack

Sistema web para controle de estoque de pastilhas industriais, desenvolvido na UC Projeto Aplicado IV do Centro Universitário SENAI Santa Catarina, a partir de uma demanda real da DDA Usinagem Industrial publicada na plataforma SAGA SENAI de Inovação.

O sistema substitui o controle em planilhas por registros centralizados: cadastro de pastilhas, fabricantes e fornecedores, entradas e saídas de estoque com validação de saldo, alertas automáticos de estoque mínimo, painel com a situação geral e histórico completo das movimentações.

## Tecnologias

- Front-end: React + TypeScript (Vite), React Router e Recharts
- Back-end: Node.js + Express + TypeScript
- Banco de dados: PostgreSQL com Prisma ORM
- Autenticação: JWT, com senhas armazenadas em hash (bcrypt)

## Requisitos

- Node.js 20 ou superior
- PostgreSQL 15 ou superior

## Como rodar o back-end

```bash
cd backend
cp .env.example .env   # ajustar a DATABASE_URL e o JWT_SECRET
npm install
npx prisma migrate dev --name inicial
npm run seed
npm run dev
```

A API sobe em http://localhost:3333.

## Como rodar o front-end

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

A aplicação abre em http://localhost:5173.

## Acesso inicial

O seed cria o usuário administrador `admin@pastrack.com` com a senha `admin123`. Trocar a senha depois do primeiro acesso.

## Estrutura do projeto

```
backend/   API REST organizada em camadas (routes, controllers, services, repositories)
frontend/  SPA React com as telas de login, painel, pastilhas e movimentações
docs/      diagramas do projeto (MER conceitual, MER lógico e arquitetura)
```

## Equipe

- Thiago <sobrenome>
- <Integrante 2>
- <Integrante 3>
- <Integrante 4>
