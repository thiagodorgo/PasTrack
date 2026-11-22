# Testes ponta a ponta

Suíte do Playwright que usa o PasTrack inteiro no ar, pelo navegador: site, API e banco, subidos com o Docker Compose num ambiente próprio. A estratégia geral de testes está em [docs/testes.md](../docs/testes.md), e o que cada requisito prova está no [plano de testes](../docs/testes/plano-de-testes.md).

## O que a suíte cobre

São 22 casos em cinco arquivos, todos no Chromium.

| Arquivo                                                                  | Casos | O que confere                                                                                                                                                        |
| ------------------------------------------------------------------------ | ----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [testes/login.spec.ts](testes/login.spec.ts)                             |     4 | Login válido chega ao painel, senha errada não diz se o e-mail existe, botão de mostrar e ocultar a senha e redirecionamento de quem não entrou para o login.        |
| [testes/primeiro-acesso.spec.ts](testes/primeiro-acesso.spec.ts)         |     3 | Senha temporária leva à troca obrigatória, a senha nova segue a política e a sessão gravada do administrador já passou pela troca.                                   |
| [testes/painel-e-permissoes.spec.ts](testes/painel-e-permissoes.spec.ts) |     8 | Painel nos quatro perfis, operador sem o item de usuários, acesso negado em `/usuarios`, operador sem o botão de nova pastilha e comprador só com entrada.           |
| [testes/estoque.spec.ts](testes/estoque.spec.ts)                         |     3 | Entrada muda o saldo na tela, saída acima do saldo é recusada com a quantidade disponível e a reposição acima do mínimo resolve o alerta sozinha.                    |
| [testes/cadastros.spec.ts](testes/cadastros.spec.ts)                     |     4 | Fabricante com nome repetido recusado, fornecedor com CNPJ mostrado com máscara, CNPJ inválido recusado antes da API e senha temporária de usuário mostrada uma vez. |

A última execução registrada, `2026-09-19_17e4380`, passou nos 22 casos. O histórico fica em [tests/results/HISTORICO.md](../tests/results/HISTORICO.md).

## Ambiente isolado

A suíte não usa a instalação de desenvolvimento nem o banco de teste do backend. Ela sobe um sistema separado:

| Item               | Valor                                                                                           |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| Projeto do Compose | `pastrack-e2e`, definido em [docker-compose.e2e.yml](../docker-compose.e2e.yml)                 |
| Site               | `http://127.0.0.1:8093` (`WEB_PORTA`)                                                           |
| Banco              | `127.0.0.1:5438` (`DB_PORTA`)                                                                   |
| Variáveis          | [.env.e2e](../.env.e2e), só com valores descartáveis, por isso versionado                       |
| Limites de taxa    | `RATE_LIMIT_GLOBAL_MAX` e `RATE_LIMIT_USUARIO_MAX` em `100000` e `RATE_LIMIT_LOGIN_MAX` em `50` |
| Dados              | Seed de demonstração ligado (`SEED_DEMO=true`), com um usuário por perfil                       |

O `docker-compose.e2e.yml` não funciona sozinho: ele complementa o [docker-compose.yml](../docker-compose.yml), troca as portas e desliga o reinício automático. Nunca use o `.env.e2e` numa instalação de verdade. Para isso existe o [.env.example](../.env.example) e o [guia de implantação](../docs/deploy.md).

O endereço `127.0.0.1` é usado no lugar de `localhost` porque, no Windows, o `localhost` tenta o IPv6 primeiro e o ambiente publica as portas só no IPv4. Para rodar contra outro endereço, defina `E2E_BASE_URL`.

## Como rodar

Pré-requisitos: Node.js 20 ou mais novo e o Docker ligado. Os comandos abaixo rodam na raiz do repositório.

1. Instale as dependências da suíte:

   ```bash
   npm ci --prefix e2e
   ```

2. Instale o Chromium do Playwright. Só é preciso na primeira vez:

   ```bash
   npm run instalar-navegador --prefix e2e
   ```

3. Suba o ambiente isolado. O `--wait` só devolve o terminal quando os serviços estão saudáveis:

   ```bash
   docker compose --env-file .env.e2e -f docker-compose.yml -f docker-compose.e2e.yml up -d --build --wait
   ```

4. Rode a suíte:

   ```bash
   npm run e2e
   ```

5. Derrube o ambiente. O `-v` apaga o volume do banco, então a próxima execução começa do zero:

   ```bash
   docker compose --env-file .env.e2e -f docker-compose.yml -f docker-compose.e2e.yml down -v
   ```

Para rodar um arquivo só, entre em `e2e/` e passe o caminho ao Playwright, como em `npx playwright test testes/login.spec.ts`. O modo interativo abre com `npm run test:ui --prefix e2e`. A checagem de tipos da suíte é `npm run typecheck --prefix e2e`.

Os casos rodam em série, com um único worker: todos mexem no mesmo estoque, e em paralelo os saldos ficariam imprevisíveis. Para não depender da ordem, cada caso de estoque cria a própria pastilha pela API, e os cadastros usam nomes e CNPJ diferentes a cada execução.

## Preparo das sessões

Antes dos casos, o preparo global em [preparo/global.ts](preparo/global.ts):

1. espera o `GET /api/health` responder, por até 2 minutos;
2. resolve a troca obrigatória de senha do administrador inicial, uma vez, para os casos não tropeçarem nela;
3. faz o login de cada perfil pela API e grava a sessão em `e2e/sessoes/<perfil>.json`.

Cada caso declara o perfil que precisa com `test.use({ perfil: "OPERADOR" })`, e a página já abre logada com ele. Sem perfil declarado, a página abre deslogada. Isso fica em [preparo/fixtures.ts](preparo/fixtures.ts), e as contas e senhas em [preparo/sessao.ts](preparo/sessao.ts), lidas de `SEED_ADMIN_EMAIL`, `SEED_ADMIN_SENHA` e `SEED_DEMO_SENHA` quando definidas.

A pasta `e2e/sessoes/` fica fora do Git, porque os arquivos guardam tokens de acesso.

## Relatório

Cada execução gera:

- o relatório HTML em `e2e/playwright-report/`, que abre com `npx playwright show-report` dentro de `e2e/`;
- o JUnit em `tests/results/latest/e2e-junit.xml`, usado pelo `npm run test:relatorio` (veja [scripts/README.md](../scripts/README.md));
- o rastro e a captura de tela dos casos que falharam, em `e2e/test-results/`.

As três saídas ficam fora do Git. A evidência versionada é o snapshot de `tests/results/<data>_<commit>/`, descrito no [protocolo de resultados](../tests/results/README.md).

## Convenções

- Os elementos são buscados por papel e rótulo acessível, com `getByRole` e `getByLabel`, nunca por classe de CSS. Assim o teste continua valendo quando o visual mudar.
- As mensagens são conferidas pelo papel: `status` para confirmações e avisos, e `alert` para erros.
- Os nomes dos casos são frases em português que descrevem o comportamento, como "a saída acima do saldo é recusada com a quantidade disponível".
- Dados que o caso precisa, como uma pastilha ou um usuário novo, são criados pela API no próprio caso.

## No CI

O job `e2e` do [workflow de integração](../.github/workflows/ci.yml) roda depois dos jobs `backend` e `frontend`, com o mesmo roteiro: instala as dependências e o Chromium, sobe o ambiente com o `.env.e2e`, roda `npm run e2e` e sempre derruba o ambiente com `down -v`. No CI, cada caso que falha é repetido uma vez, e um `test.only` esquecido reprova a execução. O relatório HTML e o JUnit ficam guardados como o artefato `relatorio-e2e` por 30 dias. Quando a suíte falha, o job imprime os logs dos containers.
