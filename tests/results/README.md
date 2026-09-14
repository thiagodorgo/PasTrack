# Resultados dos testes

Esta pasta guarda a evidência versionada das execuções de teste do PasTrack. Cada execução registrada vira uma
pasta com os resultados sanitizados e um resumo legível, amarrada ao commit que foi testado.

## Estrutura

```
tests/results/
  latest/                       saída bruta da última execução (ignorada pelo Git)
    backend-junit.xml
    frontend-junit.xml
    e2e-junit.xml
    backend-coverage/coverage-summary.json
    frontend-coverage/coverage-summary.json
  AAAA-MM-DD_<sha7>/            um snapshot por execução registrada (versionado)
    backend-junit.xml
    frontend-junit.xml
    e2e-junit.xml               só quando o e2e foi pedido
    backend-coverage-summary.json
    frontend-coverage-summary.json
    resumo.json                 dados consolidados, lidos pelo histórico
    RESUMO.md                   resumo da execução em português
  HISTORICO.md                  tabela de todas as execuções (gerada)
```

- `latest/` recebe o que os reporters escrevem: o JUnit do Vitest e do Playwright e o `coverage-summary.json`
  do `@vitest/coverage-v8`. Essa pasta nunca é versionada.
- As pastas datadas são versionadas. A data é a data local no fuso America/Sao_Paulo e o `<sha7>` é o commit
  testado.
- As cópias são sanitizadas: caminhos absolutos do repositório viram relativos e o atributo `hostname` sai do
  JUnit. Se ainda sobrar caminho absoluto de máquina ou termo proibido, o script aborta sem gravar nada.
- `HISTORICO.md` é regenerado a cada execução a partir de todos os `resumo.json`. Não edite à mão.

## Comandos

```bash
npm run test:relatorio                                   # backend e frontend
npm run test:relatorio -- --suites=backend,frontend,e2e  # inclui o e2e
npm run test:relatorio -- --sem-executar                 # só consolida o que já está em latest/
npm run test:relatorio -- --ajuda
npm run test:scripts                                     # testes do próprio script
```

| Opção             | Efeito                                                                                |
| ----------------- | ------------------------------------------------------------------------------------- |
| `--suites=...`    | Suítes consideradas, separadas por vírgula. Padrão: `backend,frontend`.               |
| `--sem-executar`  | Não roda testes nem auditoria; consolida os arquivos de `latest/` das suítes pedidas. |
| `--permitir-sujo` | Aceita árvore com alterações não commitadas; o resumo registra "árvore suja".         |
| `--ajuda`         | Mostra a ajuda.                                                                       |

O que o script executa em cada suíte:

- backend: `docker compose -f docker-compose.test.yml up -d --wait`, `npm run test:cov --prefix backend` e, sempre
  no fim, `docker compose -f docker-compose.test.yml down -v`;
- frontend: `npm run test:cov --prefix frontend`;
- e2e: `docker compose -f docker-compose.yml -f docker-compose.e2e.yml up -d --build --wait`, `npm run e2e` e,
  sempre no fim, o `down -v` correspondente.

A falha de uma suíte não interrompe as outras. Depois dos testes, o script coleta `npm audit --omit=dev --json`
do backend e do frontend e guarda a contagem por severidade.

Códigos de saída:

- `0`: todas as suítes consideradas passaram;
- `1`: alguma suíte falhou (o snapshot é gravado mesmo assim e marcado como FALHA);
- `2`: nada foi gravado (opção inválida, árvore suja ou sanitização reprovada).

Pré-requisitos: Docker Desktop ligado para o backend e o e2e, dependências instaladas (`npm run instalar` e
`npm ci --prefix e2e`) e acesso à rede para o `npm audit`.

A verificação de termos proibidos usa um arquivo local, fora do repositório: o caminho da variável de ambiente
`PASTRACK_PADROES` ou, se ela faltar, `~/.pastrack-local/padroes.txt`. O formato é uma linha `<chave>: <regex>`
por padrão; a chave `termos` é comparada sem diferenciar maiúsculas e a chave `termos-maiusculas`, diferenciando.
Sem o arquivo, a verificação é pulada com um aviso.

## Protocolo para registrar evidência

1. Rode na `main` atualizada e limpa. O script recusa árvore suja; `--permitir-sujo` serve só para ensaio e
   nunca para evidência oficial.

   ```bash
   git switch main
   git pull --ff-only
   git status        # sem alterações
   npm run test:relatorio -- --suites=backend,frontend,e2e
   ```

2. A evidência entra por um PR próprio, só com `tests/results/`. Crie a branch a partir do mesmo commit que foi
   testado:

   ```bash
   git switch -c test/evidencia-AAAA-MM-DD
   git add tests/results
   git commit -m "test: registra resultados dos testes de AAAA-MM-DD"
   ```

3. Faça o merge do PR com merge commit (sem squash e sem rebase), para que o commit de evidência continue com o
   commit testado como pai.

4. A tag aponta para o commit de evidência, cujo pai é o código testado:

   ```bash
   git tag -a vX.Y.Z <commit-de-evidencia> -m "vX.Y.Z"
   git rev-parse vX.Y.Z^          # deve ser igual ao campo sha do resumo.json
   git show --stat vX.Y.Z         # deve listar só arquivos de tests/results/
   ```
