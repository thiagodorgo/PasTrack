# Decisões de arquitetura

Esta pasta guarda os ADRs (Architecture Decision Records) do PasTrack. Cada ADR registra uma decisão: o contexto, o que foi decidido, as alternativas e as consequências.

| ADR                                                                 | Decisão                                       | Situação           |
| ------------------------------------------------------------------- | --------------------------------------------- | ------------------ |
| [ADR-0001](ADR-0001-manter-a-stack-e-evoluir.md)                    | Manter a stack e evoluir, sem reescrever      | aceita, 14/09/2026 |
| [ADR-0002](ADR-0002-migrations-versionadas-e-docker-compose.md)     | Migrations versionadas e Docker Compose       | aceita, 14/09/2026 |
| [ADR-0003](ADR-0003-matriz-de-perfis-e-papel-do-comprador.md)       | Matriz de perfis e o papel do COMPRADOR       | aceita, 14/09/2026 |
| [ADR-0004](ADR-0004-validacao-com-zod-como-lista-de-permissao.md)   | Validação com zod como lista de permissão     | aceita, 14/09/2026 |
| [ADR-0005](ADR-0005-token-jwt-no-localstorage-como-risco-aceito.md) | Token JWT no `localStorage` como risco aceito | aceita, 14/09/2026 |
| [ADR-0006](ADR-0006-saldo-atomico-e-regras-no-banco.md)             | Saldo atômico e regras no banco               | aceita, 14/09/2026 |
| [ADR-0007](ADR-0007-resultados-de-testes-versionados.md)            | Resultados de testes versionados              | aceita, 14/09/2026 |
| [ADR-0008](ADR-0008-ciclo-de-vida-do-alerta.md)                     | Ciclo de vida do alerta                       | aceita, 14/09/2026 |

## Estrutura de um ADR

| Seção                     | Conteúdo                                                       |
| ------------------------- | -------------------------------------------------------------- |
| Situação                  | proposta, aceita ou substituída, com a data                    |
| Contexto                  | o problema e as restrições da época                            |
| Decisão                   | o que foi decidido, de um jeito que dê para conferir no código |
| Alternativas consideradas | o que foi descartado e por quê                                 |
| Consequências             | o que muda, o que fica mais difícil e o que ainda falta        |

## Como registrar uma nova decisão

1. Copie um ADR existente e use o próximo número, com um nome curto em minúsculas e hífens.
2. Preencha as cinco seções.
3. Acrescente a linha na tabela do início.
4. Uma decisão que substitui outra não apaga o ADR antigo. A situação dele passa a ser "substituída pelo ADR-XXXX".

Mudanças na matriz de perfis sempre exigem um ADR ([ADR-0003](ADR-0003-matriz-de-perfis-e-papel-do-comprador.md)).
