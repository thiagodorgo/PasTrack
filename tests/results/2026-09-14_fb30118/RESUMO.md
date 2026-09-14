# Resultados dos testes — 2026-09-14 09:49

- Commit testado: `fb30118a080782f0c289ba12e0abb9dd17797193`
- Branch: `main`
- Data: 2026-09-14T09:49:23-03:00 (America/Sao_Paulo)
- Ambiente: Windows 11 Pro (build 10.0.22631, x64); Node v20.19.5; Docker 29.6.1
- Árvore de trabalho: limpa

## Suítes

| suíte    | testes |  ok | falhas | ignorados | duração | situação |
| -------- | -----: | --: | -----: | --------: | ------: | -------- |
| backend  |    123 | 123 |      0 |         0 | 18,09 s | ok       |
| frontend |     29 |  29 |      0 |         0 |  5,66 s | ok       |
| e2e      |      — |   — |      — |         — |       — | ausente  |

Na coluna falhas entram também os erros do JUnit. Traço indica suíte sem resultado.

## Cobertura

| pacote   | linhas | instruções | funções | branches |
| -------- | -----: | ---------: | ------: | -------: |
| backend  | 88,78% |     88,61% |  76,92% |   84,84% |
| frontend | 62,29% |     62,03% |  55,71% |   59,78% |

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
