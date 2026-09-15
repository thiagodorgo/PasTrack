# Manual de operação

Tarefas do dia a dia do PasTrack instalado com Docker Compose. A instalação está no [guia de implantação](deploy.md).

Todos os comandos rodam na pasta do projeto, que nos exemplos é `C:\PasTrack`. Os comandos de Windows são para o PowerShell.

## Referência rápida

| O quê                          | Onde                                      |
| ------------------------------ | ----------------------------------------- |
| Configuração e segredos        | `.env`, na pasta do projeto               |
| Dados do banco                 | volume Docker `pastrack_dados-banco`      |
| Backups                        | `backups/`, na pasta do projeto           |
| Site                           | `http://<ip-do-servidor>:8080`            |
| Saúde da API                   | `http://<ip-do-servidor>:8080/api/health` |
| Contrato da API                | [api.md](api.md)                          |
| Por que cada escolha foi feita | [decisoes/](decisoes/README.md)           |

## Conferir a saúde do sistema

1. Veja o estado dos containers:

   ```bash
   docker compose ps
   ```

   Os três serviços, `banco`, `api` e `web`, devem estar `healthy`.

2. Consulte a saúde da API pelo mesmo caminho que os usuários usam:

   ```powershell
   curl.exe http://localhost:8080/api/health
   ```

   No Linux, use `curl` no lugar de `curl.exe`.

   | Resposta                                         | Significado                                                            |
   | ------------------------------------------------ | ---------------------------------------------------------------------- |
   | 200, com `"status": "ok"`                        | API e banco funcionando. O campo `versao` mostra a versão em execução. |
   | 503, com `"erro": "Banco de dados indisponível"` | A API está no ar, mas não fala com o banco. Veja o log do `banco`.     |
   | 502 ou nenhuma resposta                          | O `web` não alcança a API. Veja o log da `api`.                        |

3. Confira o espaço em disco usado pelo Docker:

   ```bash
   docker system df
   ```

## Ler os logs

```bash
docker compose logs api --tail 200     # últimas linhas da API
docker compose logs -f api             # acompanha em tempo real; Ctrl+C sai
docker compose logs --since 2h web     # acessos ao site nas últimas 2 horas
docker compose logs banco              # PostgreSQL
```

Linhas importantes no log da API:

| Linha                                                      | Significado                                                                        |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `[inicio] aplicando migrations do banco`                   | Começo da subida. Um erro logo depois indica problema de migration.                |
| `[inicio] verificando o administrador inicial`             | Seed do administrador. Em seguida vem `já existe. Nada foi alterado.` ou `criado`. |
| `API do PasTrack rodando na porta 3333 (production)`       | A API subiu.                                                                       |
| `Configuração inválida. Corrija as variáveis de ambiente:` | Variável inválida no `.env`. A lista abaixo da linha diz qual.                     |
| `SIGTERM recebido: encerrando o servidor`                  | Parada normal, por `stop`, `down` ou atualização.                                  |

Cada container guarda até 3 arquivos de 10 MB, e o mais antigo é descartado. Para guardar um trecho, por exemplo para enviar a quem dá suporte:

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
docker compose logs --no-color --since 24h api | Out-File -Encoding utf8 logs-api.txt    # Windows
```

A primeira linha faz o PowerShell ler a saída do Docker em UTF-8. Sem ela, os acentos saem corrompidos no arquivo. Outra opção é gravar pelo `cmd`, que não converte nada: `cmd /c "docker compose logs --no-color --since 24h api > logs-api.txt"`.

```bash
docker compose logs --no-color --since 24h api > logs-api.txt                            # Linux
```

## Recuperar o acesso do administrador

O script `redefinir-senha-admin` recupera o acesso de um ADMINISTRADOR direto no servidor, sem entrar no sistema. Troque o e-mail pelo do administrador:

```bash
docker compose exec api node dist/scripts/redefinir-senha-admin.js admin@pastrack.local
```

O script:

- reativa o usuário, se ele estiver desativado;
- grava uma senha temporária e a mostra uma única vez;
- obriga a troca de senha no próximo acesso;
- encerra todas as sessões abertas dessa conta;
- registra `usuario.acesso_recuperado` na auditoria.

Para escolher a senha em vez de receber uma temporária, passe `NOVA_SENHA` só para esse comando, com `docker compose exec -e NOVA_SENHA=<senha> api node dist/scripts/redefinir-senha-admin.js <e-mail>`. A senha segue a política do administrador inicial, mas fica no histórico do terminal. Prefira a temporária.

O script só vale para ADMINISTRADOR. A senha dos outros perfis é redefinida por um administrador, na tela de usuários.

Mudar a `SEED_ADMIN_SENHA` não adianta: o seed nunca altera a senha de um administrador que já existe.

## Responder a um vazamento do `.env`

Se o `.env` vazou, ou se houver suspeita, troque tudo o que ele guarda:

1. o `JWT_SECRET`, o que derruba todas as sessões ([trocar o `JWT_SECRET`](#trocar-o-jwt_secret));
2. a `POSTGRES_PASSWORD` ([trocar a senha do banco](#trocar-a-senha-do-banco));
3. a senha do administrador, se a `SEED_ADMIN_SENHA` ainda estava preenchida no arquivo ([recuperar o acesso do administrador](#recuperar-o-acesso-do-administrador)).

Depois, deixe a `SEED_ADMIN_SENHA` vazia e confira a proteção da pasta ([guia de implantação](deploy.md#proteger-a-pasta-do-projeto)).

### Desativar uma conta de administrador comprometida

O caminho normal é a tela de usuários, com outro administrador. Ela recusa desativar o último administrador ativo e registra a desativação na auditoria.

Sem acesso à tela, desative pelo `psql`. Confira antes se sobra outro administrador ativo, porque o banco não tem essa trava:

```bash
docker compose exec banco psql -U pastrack -d pastrack
```

No prompt do `psql`, troque o e-mail, sempre em minúsculas, e rode:

```sql
SELECT id, email, ativo FROM usuario WHERE perfil = 'ADMINISTRADOR';

BEGIN;
UPDATE usuario SET ativo = false, versao_token = versao_token + 1
  WHERE email = 'conta-comprometida@empresa.com.br';
INSERT INTO auditoria (acao, entidade, id_entidade, antes, depois)
  SELECT 'usuario.desativado', 'usuario', id, '{"ativo": true}', '{"ativo": false, "origem": "psql"}'
  FROM usuario WHERE email = 'conta-comprometida@empresa.com.br';
COMMIT;
```

O `ativo = false` barra o login, e o `versao_token` maior derruba na hora as sessões abertas. A linha na `auditoria` deixa o mesmo registro que a tela faria. Saia com `\q`.

## Trocar o `JWT_SECRET`

Trocar a chave invalida todos os tokens emitidos, e todo mundo precisa entrar de novo. Faça isso se houver suspeita de que o `.env` vazou.

1. Gere um valor novo com o Node.js do container da API. A máquina servidora não precisa ter Node.js:

   ```bash
   docker compose exec api node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

   Com a API parada, use o gerador avulso do [guia de implantação](deploy.md#gerar-os-segredos).

2. Substitua o `JWT_SECRET` no `.env`.
3. Recrie a API:

   ```bash
   docker compose up -d --wait
   ```

   O Compose percebe a mudança no `.env` e recria o container da API.

4. Confira o `/api/health` e faça um login.

Quem estava com o sistema aberto recebe 401 na próxima ação e volta para a tela de login.

## Trocar a senha do banco

A `POSTGRES_PASSWORD` do `.env` só vale na criação do banco. Para trocar a senha, mude primeiro no PostgreSQL e depois no `.env`.

1. Gere uma senha nova com o mesmo comando do `JWT_SECRET`. Use só letras, números, `-` e `_`.
2. Troque a senha no PostgreSQL:

   ```bash
   docker compose exec banco psql -U pastrack -d pastrack
   ```

   No prompt do `psql`, rode `\password pastrack`, digite a senha nova duas vezes e saia com `\q`.

3. Substitua a `POSTGRES_PASSWORD` no `.env`.
4. Recrie os containers:

   ```bash
   docker compose up -d --wait
   ```

   O banco reinicia em poucos segundos. Os dados continuam no volume.

5. Confira o `/api/health`.

Se você trocar só o `.env`, a API passa a falhar com `Authentication failed against database server`. Para corrigir, faça o passo 2 usando a senha que está no `.env`.

## Restaurar um backup

Os backups são feitos como no [guia de implantação](deploy.md#backup-e-restauração). A restauração substitui todos os dados atuais pelos do backup.

### Escolher e conferir o arquivo

Liste os backups, do mais novo para o mais antigo:

```powershell
Get-ChildItem backups -Filter "pastrack_*.sql" | Sort-Object LastWriteTime -Descending | Format-Table Name, Length, LastWriteTime    # Windows
```

```bash
ls -lt backups/pastrack_*.sql    # Linux
```

Confira a data no nome do arquivo e na listagem. Depois, veja se o arquivo terminou de ser gravado: as últimas linhas precisam trazer `-- PostgreSQL database dump complete`.

```powershell
Get-Content backups/<arquivo>.sql -Tail 5    # Windows
```

```bash
tail -n 5 backups/<arquivo>.sql    # Linux
```

Sem essa linha, o backup está incompleto: escolha outro.

Nos comandos desta seção, troque `<arquivo>` pelo nome escolhido, sem o `.sql`, como `pastrack_2026-09-15_143000`. Copiado como está, o marcador faz o comando falhar, de propósito.

### Na mesma instalação

```bash
docker compose stop web api
docker compose cp backups/<arquivo>.sql banco:/tmp/restaurar.sql
docker compose exec -T banco psql -U pastrack -d pastrack -v ON_ERROR_STOP=1 --single-transaction -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" -f /tmp/restaurar.sql
docker compose exec -T banco rm /tmp/restaurar.sql
docker compose up -d --wait
```

O `-c` recria o schema `public` antes de ler o arquivo, e o `--single-transaction` junta os dois numa transação só. Um erro no meio desfaz tudo, e o banco fica como estava.

### Numa instalação nova ou depois de zerar tudo

1. Prepare o `.env` como no guia de implantação. Use o mesmo `SEED_ADMIN_EMAIL` do administrador que está no backup.
2. Suba só o banco:

   ```bash
   docker compose up -d --wait banco
   ```

3. Restaure o backup:

   ```bash
   docker compose cp backups/<arquivo>.sql banco:/tmp/restaurar.sql
   docker compose exec -T banco psql -U pastrack -d pastrack -v ON_ERROR_STOP=1 --single-transaction -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" -f /tmp/restaurar.sql
   docker compose exec -T banco rm /tmp/restaurar.sql
   ```

4. Suba o restante:

   ```bash
   docker compose up -d --build --wait
   ```

Por que o mesmo `SEED_ADMIN_EMAIL`? Na subida, o seed procura esse e-mail. Se ele não estiver no backup e `SEED_ADMIN_SENHA` estiver vazia, a API não sobe.

### Backup de uma versão anterior

Um backup de uma versão anterior não tem as tabelas, as colunas e os índices das migrations mais novas. Restaurado por cima do banco atual sem recriar o schema, ele falha: o que as migrations novas criaram continua no banco e entra em conflito com o arquivo.

Por isso, os comandos acima recriam o schema `public` na mesma transação, antes do `-f`. Sem esse `-c`, um backup antigo só se restaura numa instalação nova ou depois de zerar tudo. Na subida seguinte, a API aplica as migrations que o backup não tinha.

Um backup de um banco criado com `migrate dev`, antes das migrations versionadas, precisa do baseline. Veja [aplicar migrations num banco existente](#aplicar-migrations-num-banco-existente).

### Conferir

Entre no sistema e confira o painel, algumas pastilhas e as últimas movimentações.

## Atualizar a versão

1. Faça um backup.
2. Leia o [CHANGELOG](../CHANGELOG.md) da versão nova. Ele avisa sobre variáveis novas no `.env.example` e outras mudanças de operação.
3. Baixe o código e suba:

   ```bash
   git pull
   docker compose up -d --build --wait
   ```

4. Confira o `docker compose ps` e o `/api/health`, e faça um login.
5. Se quiser, libere o espaço das imagens antigas com `docker image prune`.

### Voltar para a versão anterior

As migrations só andam para a frente. Por isso, voltar exige o backup do passo 1:

1. Confira o backup do passo 1: a data no nome e as últimas linhas com `-- PostgreSQL database dump complete` ([escolher e conferir o arquivo](#escolher-e-conferir-o-arquivo)). Só depois apague o banco atual com `docker compose down -v`, que apaga os dados.
2. Volte o código com `git checkout <tag ou commit anterior>`.
3. Siga [numa instalação nova ou depois de zerar tudo](#numa-instalação-nova-ou-depois-de-zerar-tudo), com o backup do passo 1.

Para voltar a acompanhar a `main` depois, rode `git checkout main`.

## Aplicar migrations num banco existente

### No Docker

É automático. A cada subida, a API roda `prisma migrate deploy` e aplica o que falta. Para ver o estado:

```bash
docker compose exec api /app/node_modules/.bin/prisma migrate status
```

### Fora do Docker

Para quem desenvolve. Na pasta `backend/`, com a `DATABASE_URL` do `backend/.env` apontando para o banco:

```bash
npx prisma migrate status
npm run db:deploy
```

### Baseline de um banco criado com `migrate dev`

Até o MVP, o banco era criado com `npx prisma migrate dev --name inicial`. Esse banco já tem as tabelas da migration `20260914120000_inicial`, mas com outro registro no histórico. O `migrate deploy` tenta criar tudo de novo e falha com o erro P3018, porque os tipos e as tabelas já existem.

Faça o baseline uma única vez:

1. Faça um backup do banco.
2. Na pasta `backend/`, marque a migration inicial como aplicada, sem rodar nada, e aplique as seguintes:

   ```bash
   npx prisma migrate resolve --applied 20260914120000_inicial
   npm run db:deploy
   ```

3. Confira com `npx prisma migrate status`.

Se o `deploy` já tinha falhado antes do baseline, o Prisma recusa novos `deploy` com o erro P3009. O mesmo `migrate resolve --applied 20260914120000_inicial` resolve.

### Baseline no Docker

Se um backup de banco criado com `migrate dev` foi restaurado no container, a API não sobe, porque o `migrate deploy` falha. Faça o baseline num container avulso da API:

```bash
docker compose run --rm --entrypoint /app/node_modules/.bin/prisma api migrate resolve --applied 20260914120000_inicial
docker compose up -d --wait
```

### Ao mudar o schema

Para quem desenvolve: toda mudança no `schema.prisma` vem com uma migration, criada com `npm run db:migrate -- --name descricao-curta`. Antes do PR, confira a sincronia como o CI faz:

```bash
docker compose -f docker-compose.test.yml up -d --wait
docker compose -f docker-compose.test.yml exec banco-teste psql -U pastrack -d pastrack_teste -c "CREATE DATABASE pastrack_sombra"
cd backend
SHADOW_DATABASE_URL="postgresql://pastrack:pastrack@localhost:5433/pastrack_sombra?schema=public" npm run db:verificar
```

No PowerShell, defina a variável antes, com `$env:SHADOW_DATABASE_URL = "postgresql://pastrack:pastrack@localhost:5433/pastrack_sombra?schema=public"`, e depois rode `npm run db:verificar`.

A saída esperada é `Migrations em sincronia com o schema.prisma.` O motivo da única diferença aceita está no [ADR-0002](decisoes/ADR-0002-migrations-versionadas-e-docker-compose.md).
