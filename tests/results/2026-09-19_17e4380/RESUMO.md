# Resultados dos testes — 2026-09-19 22:09

- Commit testado: `17e4380e3a1ef5ed5fee5fb0356e74f4b5ed3b2f`
- Branch: `main`
- Data: 2026-09-19T22:09:37-03:00 (America/Sao_Paulo)
- Ambiente: Windows 11 Pro (build 10.0.22631, x64); Node v20.19.5; Docker 29.6.1
- Árvore de trabalho: limpa

## Suítes

| suíte    | testes |  ok | falhas | ignorados | duração | situação |
| -------- | -----: | --: | -----: | --------: | ------: | -------- |
| backend  |    725 | 725 |      0 |         0 | 28,95 s | ok       |
| frontend |    300 | 300 |      0 |         0 | 91,71 s | ok       |
| e2e      |     22 |  22 |      0 |         0 | 22,19 s | ok       |

Na coluna falhas entram também os erros do JUnit. Traço indica suíte sem resultado.

## Cobertura

| pacote   | linhas | instruções | funções | branches |
| -------- | -----: | ---------: | ------: | -------: |
| backend  | 98,56% |      98,5% |  97,54% |   94,01% |
| frontend | 97,14% |     95,81% |  96,52% |   93,15% |

## npm audit (dependências de produção)

| pacote   | crítica | alta | moderada | baixa | info | total |
| -------- | ------: | ---: | -------: | ----: | ---: | ----: |
| backend  |       0 |    0 |        0 |     0 |    0 |     0 |
| frontend |       0 |    0 |        0 |     0 |    0 |     0 |

## Comandos executados

- `docker compose -f docker-compose.test.yml up -d --wait` (código 0)
- `npm run test:cov --prefix backend` (código 0)
- `docker compose -f docker-compose.test.yml down -v` (código 0)
- `npm run test:cov --prefix frontend` (código 0)
- `docker compose --env-file .env.e2e -f docker-compose.yml -f docker-compose.e2e.yml up -d --build --wait` (código 0)
- `npm run e2e` (código 0)
- `docker compose --env-file .env.e2e -f docker-compose.yml -f docker-compose.e2e.yml down -v` (código 0)
- `npm audit --omit=dev --json --prefix backend` (código 0)
- `npm audit --omit=dev --json --prefix frontend` (código 0)
