# Resultados dos testes — 2026-09-19 18:13

- Commit testado: `84b9e37819ac9ce40e1a957cf0155d1c3006e29f`
- Branch: `main`
- Data: 2026-09-19T18:13:15-03:00 (America/Sao_Paulo)
- Ambiente: Windows 11 Pro (build 10.0.22631, x64); Node v20.19.5; Docker 29.6.1
- Árvore de trabalho: limpa

## Suítes

| suíte    | testes |  ok | falhas | ignorados | duração | situação |
| -------- | -----: | --: | -----: | --------: | ------: | -------- |
| backend  |    574 | 574 |      0 |         0 | 19,73 s | ok       |
| frontend |    254 | 254 |      0 |         0 | 57,34 s | ok       |
| e2e      |      — |   — |      — |         — |       — | ausente  |

Na coluna falhas entram também os erros do JUnit. Traço indica suíte sem resultado.

## Cobertura

| pacote   | linhas | instruções | funções | branches |
| -------- | -----: | ---------: | ------: | -------: |
| backend  | 98,56% |      98,5% |  97,54% |   94,01% |
| frontend | 98,32% |      97,4% |  96,89% |   94,64% |

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
- `npm audit --omit=dev --json --prefix backend` (código 0)
- `npm audit --omit=dev --json --prefix frontend` (código 0)
