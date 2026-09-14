# ADR-0002: Migrations versionadas e Docker Compose

## Situação

Aceita, 14/09/2026.

## Contexto

No MVP, cada pessoa criava o banco com `npx prisma migrate dev --name inicial`. A pasta de migrations não ia para o repositório. Cada banco tinha um histórico próprio, e não havia um jeito seguro de atualizar um banco já instalado.

Algumas regras de integridade não cabem no `schema.prisma`: os CHECK de saldo e de quantidade e o índice único parcial dos alertas ([ADR-0006](ADR-0006-saldo-atomico-e-regras-no-banco.md)). Elas só existem em SQL.

A instalação na empresa precisa ser simples: uma máquina com Windows, sem instalar Node.js e PostgreSQL à mão.

## Decisão

### Migrations versionadas

- As migrations ficam em `backend/prisma/migrations/` e vão para o repositório:
  - `20260914120000_inicial`: o schema do MVP, sem mudanças;
  - `20260914130000_seguranca_integridade`: auditoria, colunas novas, índices, CHECK e o índice parcial.
- Fora do desenvolvimento, o banco só muda com `prisma migrate deploy`. O `migrate dev` fica na máquina de quem desenvolve.
- Quem já tinha o banco criado por `migrate dev` faz o baseline uma única vez, antes do primeiro `deploy`:

  ```bash
  npx prisma migrate resolve --applied 20260914120000_inicial
  ```

- `npm run db:verificar` confere, num banco de sombra, se as migrations reproduzem o `schema.prisma`. A única diferença aceita é o `DROP INDEX "alerta_aberto_por_pastilha"`, porque o Prisma não representa índices parciais. Qualquer outra diferença faz o comando falhar. O CI roda essa verificação em todo PR.

### Docker Compose

O `docker-compose.yml` da raiz sobe três serviços:

| Serviço | Imagem               | Porta no host                               | Papel                                            |
| ------- | -------------------- | ------------------------------------------- | ------------------------------------------------ |
| `banco` | `postgres:16-alpine` | `127.0.0.1:5432` (`DB_PORTA`)               | PostgreSQL, com os dados no volume `dados-banco` |
| `api`   | build de `backend/`  | nenhuma                                     | API Express, com usuário sem privilégios         |
| `web`   | build de `frontend/` | `8080` em todas as interfaces (`WEB_PORTA`) | nginx com o site e o proxy de `/api`             |

A cada subida, o container da API roda, nesta ordem:

1. `prisma migrate deploy`;
2. o seed do administrador inicial, que não altera um administrador existente;
3. o seed de demonstração, só com `SEED_DEMO=true`;
4. a API.

Qualquer falha interrompe a subida, e o motivo aparece no log da API.

Os segredos ficam no `.env` da raiz, fora do Git. Sem `POSTGRES_PASSWORD` ou `JWT_SECRET`, o Compose se recusa a subir.

## Alternativas consideradas

- **`prisma db push` ou `migrate dev` na instalação.** Não deixam histórico confiável, e o `migrate dev` propõe recriar o banco quando encontra divergência.
- **SQL escrito à mão, sem o Prisma Migrate.** Perderia a geração a partir do schema e a verificação de sincronia.
- **Instalar Node.js e PostgreSQL direto no Windows.** Mais passos, mais versões para manter e diferenças entre a máquina da empresa e o CI.

## Consequências

- Qualquer instalação reproduz o mesmo banco. Atualizar a versão é reconstruir as imagens e subir de novo ([deploy.md](../deploy.md)).
- Toda mudança no `schema.prisma` precisa vir com a migration correspondente. Se as duas divergirem, o CI falha.
- Os CHECK e o índice parcial existem só no SQL das migrations. Os comentários do `schema.prisma` apontam para eles.
- O pacote `prisma` virou dependência de produção, porque o container roda `migrate deploy`.
- As migrations só andam para a frente. Voltar de versão exige restaurar o backup feito antes da atualização ([operacao.md](../operacao.md#atualizar-a-versão)).
- O baseline é um passo único e só vale para bancos criados antes das migrations versionadas.
