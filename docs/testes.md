# Testes do PasTrack

Como o sistema é testado, como rodar cada suíte e onde ficam as evidências. O que cada requisito prova está no [plano de testes](testes/plano-de-testes.md).

## Estratégia

| Nível                  | O que cobre                                                                         | Ferramentas                                                    |
| ---------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Unidade                | Módulos isolados: política de senha, permissões, validação, erros, logger, ambiente | Vitest                                                         |
| Integração e segurança | A API inteira contra um PostgreSQL de verdade, rota por rota                        | Vitest e Supertest                                             |
| Componentes e telas    | As telas do frontend, com a API simulada                                            | Vitest, Testing Library e MSW                                  |
| Ponta a ponta          | O sistema inteiro no ar, pelo navegador, num ambiente próprio                       | Playwright, contra o Docker Compose                            |
| Manual, gravado        | O uso real pelo navegador, com conferência no banco                                 | sessão gravada, registrada em [evidências](testes/evidencias/) |

Os testes de integração rodam **em série**, cada um começando com o banco limpo. A regra do projeto é que cada mudança entra com os testes dela no mesmo PR, e o CI é obrigatório antes do merge.

## Números da última execução registrada

| Suíte    | Testes | Falhas | Cobertura de linhas |
| -------- | -----: | -----: | ------------------: |
| backend  |    574 |      0 |              98,56% |
| frontend |    254 |      0 |              98,32% |

O histórico completo fica em [tests/results/HISTORICO.md](../tests/results/HISTORICO.md), e cada execução registrada tem a própria pasta com o JUnit e o resumo de cobertura.

## Como rodar

### Backend

O banco de teste sobe em container, separado do banco de desenvolvimento:

```bash
docker compose -f docker-compose.test.yml up -d --wait
npm test --prefix backend            # todas as suítes
npm run test:unit --prefix backend   # só as de unidade, sem banco
npm run test:cov --prefix backend    # com cobertura
docker compose -f docker-compose.test.yml down -v
```

### Frontend

Não precisa de banco nem de API: as respostas são simuladas.

```bash
npm test --prefix frontend
npm run test:cov --prefix frontend
```

### Ponta a ponta

Rodam contra o sistema inteiro no ar, num ambiente próprio (site em `127.0.0.1:8093`, banco em `127.0.0.1:5438`), sem encostar na instalação de desenvolvimento nem no banco de teste compartilhado:

```bash
npm ci --prefix e2e
npm run instalar-navegador --prefix e2e   # só na primeira vez
docker compose --env-file .env.e2e -f docker-compose.yml -f docker-compose.e2e.yml up -d --build --wait
npm run e2e
docker compose --env-file .env.e2e -f docker-compose.yml -f docker-compose.e2e.yml down -v
```

São 22 casos: login e senha errada, primeiro acesso com troca obrigatória e política de senha, painel nos quatro perfis, limites de perfil, ciclo do estoque com o alerta abrindo e fechando, e os cadastros de fabricante, fornecedor e usuário.

### Tudo de uma vez

```bash
npm run test:tudo
```

## Variáveis de ambiente dos testes

O `backend/vitest.config.mts` define o ambiente das suítes do backend. Nenhum valor ali é segredo de produção.

| Variável                                          | Valor nos testes                   | Por quê                                                                                 |
| ------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                    | banco de teste em `127.0.0.1:5433` | Separado do banco de desenvolvimento; o endereço IPv4 evita a espera do IPv6 no Windows |
| `DATABASE_URL_TESTE`                              | opcional                           | Aponta para outro banco, quando várias frentes rodam ao mesmo tempo                     |
| `BCRYPT_CUSTO`                                    | `4`                                | Mantém a suíte rápida; em produção o mínimo é 12                                        |
| `JWT_SECRET`, `JWT_EXPIRES_IN`                    | valores fixos de teste             | Tornam o token previsível                                                               |
| `RATE_LIMIT_GLOBAL_MAX`, `RATE_LIMIT_USUARIO_MAX` | altos                              | Os limites gerais não podem interferir; o limite de login fica no padrão                |
| `LOG_LEVEL`                                       | `silent`                           | Deixa a saída dos testes limpa                                                          |

No Windows, use `127.0.0.1` em vez de `localhost`: o `localhost` tenta o IPv6 primeiro e cada conexão nova atrasa cerca de 2 segundos, o que estoura o tempo das transações.

## Evidências versionadas

- **Execuções das suítes:** `npm run test:relatorio` roda as suítes, sanitiza a saída e grava um snapshot em `tests/results/<data>_<commit>/`. O protocolo está em [tests/results/README.md](../tests/results/README.md) e a decisão no [ADR-0007](decisoes/ADR-0007-resultados-de-testes-versionados.md).
- **Execuções manuais:** ficam em [testes/evidencias/](testes/evidencias/), uma por data, como a implantação em clone limpo e a sessão gravada dos casos de movimentação.
- **Conferência de uma instalação nova:** `npm run verificar:implantacao`, descrito no [guia de implantação](deploy.md#conferir-a-instalação).

## Convenções

- Os nomes dos testes são frases em português que descrevem o comportamento, não o código: "recusa saída acima do saldo", e não "testa erro 400".
- Os testes de API conferem status, corpo e efeito no banco, não só o status.
- As buscas nas telas usam papel e rótulo acessível, nunca classe de CSS, para o teste continuar valendo quando o visual mudar.
- Um bug corrigido entra com o teste que falharia antes da correção.

## O que ainda não é testado automaticamente

| Lacuna                             | Como está coberta hoje                                                                         |
| ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| Matriz de permissões rota por rota | Casos escolhidos, em `integration/permissoes.spec.ts`                                          |
| Desempenho, a cada mudança         | Há uma [medição pontual](testes/evidencias/2026-09-19-desempenho.md), não uma medição contínua |
