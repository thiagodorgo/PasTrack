# Implantação com Docker Compose

Este guia instala o PasTrack numa máquina da empresa. Essa máquina vira o servidor da rede local, e os outros computadores acessam o sistema pelo navegador.

Os comandos de Windows são para o PowerShell, o terminal padrão do Windows 11. Quando o comando é igual no Linux, ele aparece uma vez só.

## O que sobe

O `docker-compose.yml` da raiz sobe três containers:

| Serviço | O que é                                             | Porta                                    |
| ------- | --------------------------------------------------- | ---------------------------------------- |
| `web`   | nginx com o site e o proxy de `/api`                | `8080`, aberta para a rede (`WEB_PORTA`) |
| `api`   | API do PasTrack                                     | nenhuma: só o `web` fala com ela         |
| `banco` | PostgreSQL 16, com os dados no volume `dados-banco` | `5432`, só nesta máquina (`DB_PORTA`)    |

O porquê desse desenho está no [ADR-0002](decisoes/ADR-0002-migrations-versionadas-e-docker-compose.md).

## Pré-requisitos

### Windows 11

- Docker Desktop recente, com Docker Engine 25 ou mais novo. O instalador ativa o WSL 2, que exige a virtualização ligada na BIOS.
- Git, para baixar e atualizar o código.
- Pelo menos 5 GB livres em disco, para imagens, dados e backups.

O uso comercial do Docker Desktop tem regras de licença conforme o porte da empresa. Confira os termos da Docker antes de instalar.

### Linux

- Docker Engine 25 ou mais novo, com o plugin Docker Compose v2.
- Git.

### Conferir as versões

```bash
docker version           # em "Server", a versão deve ser 25 ou mais nova
docker compose version   # deve ser v2
```

## Baixar o código

Escolha uma pasta fixa. Os exemplos usam `C:\PasTrack`.

```powershell
git clone https://github.com/thiagodorgo/PasTrack.git C:\PasTrack
cd C:\PasTrack
```

No Linux, use a pasta que preferir, como `/opt/pastrack`.

Todos os comandos `docker compose` deste guia rodam dentro dessa pasta.

## Preparar o `.env`

O `.env` guarda a configuração e os segredos. Ele nunca vai para o Git.

```powershell
Copy-Item .env.example .env     # Windows
```

```bash
cp .env.example .env            # Linux
```

### Gerar os segredos

Gere um valor para `POSTGRES_PASSWORD` e outro para `JWT_SECRET`. Rode o comando uma vez para cada:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Sem Node.js na máquina, rode o mesmo comando dentro de um container:

```bash
docker run --rm node:20-bookworm-slim node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

O resultado tem só letras, números, `-` e `_`. Isso importa para a `POSTGRES_PASSWORD`, que entra na URL de conexão da API.

Abra o `.env` num editor de texto e cole os valores.

### O que cada variável faz

| Variável            | Obrigatória        | Padrão                  | Para que serve                                                                                                     |
| ------------------- | ------------------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `POSTGRES_USER`     | não                | `pastrack`              | Usuário do PostgreSQL.                                                                                             |
| `POSTGRES_PASSWORD` | sim                | —                       | Senha do PostgreSQL. Só letras, números, `-` e `_`.                                                                |
| `POSTGRES_DB`       | não                | `pastrack`              | Nome do banco.                                                                                                     |
| `JWT_SECRET`        | sim                | —                       | Chave que assina os tokens de login. Pelo menos 32 caracteres, sem trechos de exemplo como `troque` ou `changeme`. |
| `JWT_EXPIRES_IN`    | não                | `8h`                    | Validade do login, como `8h`, `30m` ou `1d`.                                                                       |
| `CORS_ORIGINS`      | não                | `http://localhost:8080` | Origens do navegador autorizadas a chamar a API. Pelo nginx, site e API ficam na mesma origem: não precisa mudar.  |
| `BCRYPT_CUSTO`      | não                | `12`                    | Custo do hash das senhas. Precisa ser 12 ou mais.                                                                  |
| `LOG_LEVEL`         | não                | `info`                  | Nível dos logs da API: `fatal`, `error`, `warn`, `info`, `debug`, `trace` ou `silent`.                             |
| `SEED_ADMIN_EMAIL`  | não                | `admin@pastrack.local`  | E-mail do administrador inicial.                                                                                   |
| `SEED_ADMIN_SENHA`  | na primeira subida | —                       | Senha do administrador inicial.                                                                                    |
| `SEED_DEMO`         | não                | `false`                 | `true` carrega dados de demonstração. Não use na instalação da empresa.                                            |
| `SEED_DEMO_SENHA`   | não                | vazia                   | Senha dos usuários de demonstração. Vazia: a API gera uma e mostra no log.                                         |
| `WEB_PORTA`         | não                | `8080`                  | Porta do site, nesta máquina e na rede.                                                                            |
| `DB_PORTA`          | não                | `5432`                  | Porta do PostgreSQL, só nesta máquina, para quem desenvolve.                                                       |

`POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_DB` só valem quando o banco é criado, na primeira subida. Mudar esses valores depois não altera o banco. Para trocar a senha do banco, siga o [manual de operação](operacao.md#trocar-a-senha-do-banco).

`NODE_ENV` e `TRUST_PROXY` não ficam no `.env`: o `docker-compose.yml` fixa os valores certos para esta instalação.

### A senha do administrador inicial

`SEED_ADMIN_SENHA` é obrigatória na primeira subida. Sem ela, a API não sobe.

A senha precisa:

- ter 10 caracteres ou mais, com pelo menos uma letra e um número;
- não conter a parte do e-mail antes do `@`;
- não ser uma senha comum, como `admin12345`;
- ter no máximo 72 bytes (letras acentuadas ocupam 2).

Depois que o administrador existe, mudar `SEED_ADMIN_SENHA` não altera a senha dele.

## Subir o sistema

```bash
docker compose up -d --build --wait
```

A primeira subida leva alguns minutos, porque as imagens são construídas. O `--wait` só devolve o terminal quando os três serviços estão saudáveis, ou quando algum falha.

A cada subida, a API:

1. aplica as migrations pendentes do banco;
2. cria o administrador inicial, se ele ainda não existir;
3. carrega os dados de demonstração, se `SEED_DEMO=true`;
4. começa a atender.

Confira o estado dos containers:

```bash
docker compose ps
```

Os três serviços devem aparecer como `healthy`. Depois, confira a API pelo nginx:

```powershell
curl.exe http://localhost:8080/api/health     # Windows
```

```bash
curl http://localhost:8080/api/health          # Linux
```

No PowerShell, use `curl.exe`: o `curl` sozinho é outro comando.

A resposta esperada é parecida com:

```json
{ "status": "ok", "banco": "ok", "versao": "0.2.0", "uptimeSegundos": 42 }
```

Com o banco fora do ar, a resposta é 503, com `"erro": "Banco de dados indisponível"` e `"banco": "indisponivel"`.

## Primeiro acesso

1. Na máquina servidora, abra http://localhost:8080.
2. Entre com o e-mail de `SEED_ADMIN_EMAIL` e a senha de `SEED_ADMIN_SENHA`.
3. Guarde essa senha num gerenciador de senhas.
4. Apague o valor de `SEED_ADMIN_SENHA` no `.env`. A API só usa esse valor para criar o administrador, e uma senha parada num arquivo é um risco sem necessidade. Se um dia o banco for zerado, preencha de novo.

O administrador nasce marcado para trocar a senha no primeiro acesso. A troca obrigatória está em implementação. O cadastro dos demais usuários fica com o ADMINISTRADOR, no módulo de usuários, também em implementação ([contrato da API](api.md)).

Não use `SEED_DEMO=true` na instalação da empresa. Ele cria usuários e dados de exemplo.

## Acesso pelos outros computadores da rede

### 1. Descubra o IP da máquina servidora

```powershell
ipconfig
```

Procure o "Endereço IPv4" do adaptador em uso (Ethernet ou Wi-Fi), por exemplo `192.168.0.10`.

Peça a quem cuida da rede para fixar esse IP, com uma reserva no roteador. Se o IP mudar, o endereço que os outros computadores usam para de funcionar.

### 2. Libere a porta no firewall do Windows

Abra o PowerShell como administrador e rode:

```powershell
New-NetFirewallRule -DisplayName "PasTrack (porta 8080)" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow -Profile Private
```

A regra vale para redes do tipo privada. Confira o tipo da rede:

```powershell
Get-NetConnectionProfile
```

Se `NetworkCategory` for `Public`, mude em Configurações > Rede e Internet > Ethernet (ou Wi-Fi) > Tipo de perfil de rede > Rede privada.

Se você mudou `WEB_PORTA`, use a mesma porta na regra.

No Linux, libere a porta no firewall da distribuição, se houver um ativo. No Ubuntu, por exemplo: `sudo ufw allow 8080/tcp`.

### 3. Acesse

Nos outros computadores, abra `http://192.168.0.10:8080`, trocando pelo IP da máquina servidora.

Para testar a conexão a partir de outro Windows:

```powershell
Test-NetConnection 192.168.0.10 -Port 8080
```

`TcpTestSucceeded : True` indica que a porta está acessível.

Não é preciso mudar `CORS_ORIGINS`: pelo nginx, o site e a API ficam no mesmo endereço.

Só a porta do site fica aberta para a rede. O banco escuta apenas em `127.0.0.1`, e a API não tem porta publicada.

## Iniciar junto com o Windows

1. No Docker Desktop, abra Settings > General e marque "Start Docker Desktop when you sign in to your computer".
2. Os containers têm `restart: unless-stopped`. Eles voltam sozinhos quando o Docker inicia, a não ser que tenham sido parados com `docker compose stop` ou removidos com `docker compose down`.
3. O Docker Desktop só inicia depois que alguém entra no Windows. Depois de uma reinicialização, como a de uma atualização do Windows, entre na máquina servidora para o sistema voltar. Bloquear a tela, sem sair da conta, mantém o sistema no ar.
4. Desligue a suspensão da máquina servidora em Configurações > Sistema > Energia. Com a máquina suspensa, ninguém acessa o sistema.

No Linux, habilite o Docker na inicialização:

```bash
sudo systemctl enable --now docker
```

## Backup e restauração

O backup é um arquivo SQL gerado pelo `pg_dump`. Ele contém todos os dados, inclusive os hashes das senhas. Guarde-o com o mesmo cuidado do `.env`.

### Fazer um backup

Na pasta do projeto:

```bash
mkdir backups
docker compose exec -T banco pg_dump -U pastrack -d pastrack --clean --if-exists --no-owner -f /tmp/backup.sql
docker compose cp banco:/tmp/backup.sql backups/pastrack_2026-09-14.sql
docker compose exec -T banco rm /tmp/backup.sql
```

- O `mkdir` só é preciso na primeira vez.
- Troque `pastrack` se você mudou `POSTGRES_USER` ou `POSTGRES_DB`.
- O arquivo é gerado dentro do container e copiado depois. Redirecionar a saída com `>` no Windows PowerShell 5.1 grava o arquivo em UTF-16, e o `psql` não consegue lê-lo.
- A pasta `backups/` não está no `.gitignore`. Para ela nunca ir para o Git, rode uma vez `Add-Content .git/info/exclude "backups/"` (Windows) ou `echo "backups/" >> .git/info/exclude` (Linux).
- Copie os backups para fora da máquina servidora, como um disco externo ou uma pasta de rede. Um backup no mesmo disco não protege contra a perda do disco.

### Restaurar

A restauração substitui todos os dados atuais pelos do backup.

```bash
docker compose stop web api
docker compose cp backups/pastrack_2026-09-14.sql banco:/tmp/restaurar.sql
docker compose exec -T banco psql -U pastrack -d pastrack -v ON_ERROR_STOP=1 --single-transaction -f /tmp/restaurar.sql
docker compose exec -T banco rm /tmp/restaurar.sql
docker compose up -d --wait
```

Com `--single-transaction`, um erro no meio desfaz tudo, e o banco fica como estava. Na subida, a API aplica as migrations que o backup ainda não tinha.

Para restaurar numa instalação nova ou depois de zerar tudo, siga o [manual de operação](operacao.md#restaurar-um-backup).

### Agendar o backup no Windows

Crie o arquivo `C:\PasTrack\backups\backup-pastrack.ps1`:

```powershell
# Backup diário do banco do PasTrack. Mantém os 30 arquivos mais recentes.
Set-Location "C:\PasTrack"
$arquivo = "backups/pastrack_{0}.sql" -f (Get-Date -Format "yyyy-MM-dd_HHmm")

docker compose exec -T banco pg_dump -U pastrack -d pastrack --clean --if-exists --no-owner -f /tmp/backup.sql
if ($LASTEXITCODE -ne 0) { exit 1 }
docker compose cp banco:/tmp/backup.sql $arquivo
if ($LASTEXITCODE -ne 0) { exit 1 }
docker compose exec -T banco rm /tmp/backup.sql

Get-ChildItem backups -Filter "pastrack_*.sql" | Sort-Object Name -Descending | Select-Object -Skip 30 | Remove-Item
```

Depois, no Agendador de Tarefas:

1. Clique em Ação > Criar Tarefa Básica e dê o nome "Backup do PasTrack".
2. Disparador: Diariamente, num horário em que a máquina esteja ligada.
3. Ação: Iniciar um programa.
   - Programa/script: `powershell.exe`
   - Argumentos: `-NoProfile -ExecutionPolicy Bypass -File "C:\PasTrack\backups\backup-pastrack.ps1"`
4. Nas propriedades da tarefa, mantenha "Executar somente quando o usuário estiver conectado". O Docker Desktop roda na sessão do usuário.

Para testar, clique com o botão direito na tarefa e escolha Executar. Um arquivo novo deve aparecer em `C:\PasTrack\backups`.

No Linux, agende os mesmos comandos com o `cron`.

## Atualizar a versão

1. Faça um backup.
2. Leia o [CHANGELOG](../CHANGELOG.md). Ele avisa se há variável nova no `.env.example`.
3. Baixe o código novo e suba:

   ```bash
   git pull
   docker compose up -d --build --wait
   ```

4. Confira o `docker compose ps` e o `/api/health`. O campo `versao` mostra a versão em execução.

A API aplica as migrations novas na subida. Os dados ficam no volume e não são apagados.

As migrations só andam para a frente. Voltar para a versão anterior exige restaurar o backup feito no passo 1 ([manual de operação](operacao.md#atualizar-a-versão)).

As imagens antigas continuam no disco. Para liberar espaço, rode `docker image prune`.

## Logs

```bash
docker compose logs api --tail 100     # últimas 100 linhas da API
docker compose logs -f api             # acompanha em tempo real; Ctrl+C sai
docker compose logs --since 1h         # última hora dos três serviços
```

Cada container guarda até 3 arquivos de 10 MB, e o mais antigo é descartado. O que procurar nos logs está no [manual de operação](operacao.md#ler-os-logs).

## Parar e zerar tudo

Parar sem perder dados:

```bash
docker compose stop    # para os containers
docker compose down    # para e remove os containers; o volume com os dados fica
```

Depois de um `down`, suba de novo com `docker compose up -d --wait`.

> **Atenção: `docker compose down -v` apaga todos os dados.** O `-v` remove o volume `dados-banco`, com pastilhas, movimentações, alertas, usuários e auditoria. Não há como desfazer. Faça um backup antes.

Para zerar e começar do zero:

```bash
docker compose down -v
docker compose up -d --build --wait
```

O banco nasce vazio de novo, então `SEED_ADMIN_SENHA` volta a ser obrigatória.

## Problemas comuns

### Porta ocupada

A subida falha com uma mensagem como `port is already allocated` ou `ports are not available`. Outro programa já usa a porta.

Descubra qual programa é:

```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 8080 -State Listen).OwningProcess    # Windows
```

```bash
sudo ss -ltnp | grep :8080                                                              # Linux
```

Ou troque a porta no `.env`, por exemplo `WEB_PORTA=8081`, e rode `docker compose up -d --wait`.

Na porta 5432, o conflito costuma ser um PostgreSQL instalado na própria máquina. Troque `DB_PORTA` para outra porta livre, como `5434`.

### Variável obrigatória ausente

O Compose se recusa a subir, com uma mensagem como:

```text
required variable POSTGRES_PASSWORD is missing a value: defina POSTGRES_PASSWORD no arquivo .env
```

Preencha a variável citada. Confira também se o `.env` está na pasta onde o comando rodou.

### API unhealthy

O `up --wait` termina com algo como `container pastrack-api-1 is unhealthy` ou `dependency failed to start`. Veja o motivo no log da API:

```bash
docker compose logs api --tail 50
```

| Mensagem no log                                                              | Causa                                                                    | O que fazer                                                                                        |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `Configuração inválida. Corrija as variáveis de ambiente:`, seguida da lista | Valor inválido no `.env`, como um `JWT_SECRET` curto                     | Corrija a variável citada e rode `docker compose up -d --wait`.                                    |
| `Authentication failed against database server`                              | A `POSTGRES_PASSWORD` do `.env` não é a senha com que o banco foi criado | Volte a senha antiga ou siga [trocar a senha do banco](operacao.md#trocar-a-senha-do-banco).       |
| Erro logo depois de `[inicio] aplicando migrations do banco`                 | Uma migration não se aplica ao banco                                     | Siga [aplicar migrations num banco existente](operacao.md#aplicar-migrations-num-banco-existente). |
| `A senha do administrador não atende à política de senha`                    | `SEED_ADMIN_SENHA` fraca                                                 | Escolha outra senha, seguindo as regras acima.                                                     |

Na primeira subida, a API tem até 90 s para ficar saudável. Espere esse tempo antes de concluir que falhou.

Mudou o `.env`? Rode `docker compose up -d --wait`. O `docker compose restart` não relê o `.env`.

### `SEED_ADMIN_SENHA` ausente

Com o banco vazio e sem `SEED_ADMIN_SENHA`, o log da API mostra:

```text
Defina SEED_ADMIN_SENHA para criar o administrador inicial em produção.
```

A API tenta subir de novo, em ciclo, até a variável existir. Preencha `SEED_ADMIN_SENHA` no `.env` e rode `docker compose up -d --wait`.

O mesmo acontece se `SEED_ADMIN_EMAIL` mudar para um e-mail que ainda não existe no banco.

## Nota de segurança

- O acesso é por HTTP na rede local, sem criptografia. Senhas e dados trafegam em texto claro dentro da rede.
- Não abra a porta 8080 no roteador. Para expor o sistema na internet, é preciso um proxy reverso com TLS (HTTPS) na frente do `web`. Isso está fora do escopo deste guia.
- O `.env` e os backups têm segredos e dados da empresa. Restrinja o acesso à pasta do projeto.
- As decisões sobre o login e os riscos aceitos estão no [ADR-0005](decisoes/ADR-0005-token-jwt-no-localstorage-como-risco-aceito.md).
