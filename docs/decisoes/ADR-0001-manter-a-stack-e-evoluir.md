# ADR-0001: Manter a stack e evoluir, sem reescrever

## Situação

Aceita, 14/09/2026.

## Contexto

O MVP do PasTrack foi entregue em 09/08/2026. Ele já fazia o essencial: login, painel, cadastro de pastilhas, fabricantes e fornecedores, entradas e saídas com validação de saldo e alertas de estoque mínimo.

A stack é Express e Prisma no backend, PostgreSQL no banco e React com Vite no frontend. A arquitetura em camadas (routes, controllers, services e repositories) está nos diagramas do projeto.

A revisão do MVP encontrou problemas que precisavam de correção antes da entrega à DDA Usinagem Industrial:

- 9 alertas de vulnerabilidade nas dependências;
- administrador criado pelo seed com senha fixa;
- banco criado com `prisma migrate dev` em cada máquina, sem migrations versionadas;
- permissões espalhadas pelas rotas;
- corpo das requisições repassado ao banco sem validação;
- nenhum teste automatizado e nenhum CI.

O prazo final de entrega é 18/09/2026.

## Decisão

Manter a stack atual e evoluir o MVP em passos pequenos, sem reescrever.

- Cada passo entra por um PR próprio, com testes.
- As dependências são atualizadas para fechar vulnerabilidades, mesmo quando isso exige uma versão maior, como React Router 7 e Vite 6.
- Defeitos conhecidos viram testes `it.fails`. Quando a correção entra, o teste passa a acusar erro e vira um teste normal.
- As decisões que mudam o desenho do sistema ficam registradas em ADRs nesta pasta.

## Alternativas consideradas

- **Reescrever do zero, na mesma stack ou em outra.** Custaria semanas que o prazo não tem, e o sistema passaria um período sem versão funcional.
- **Entregar o MVP como está, só com documentação.** Deixaria em produção a senha fixa, as vulnerabilidades e o saldo sem proteção contra requisições simultâneas.

## Consequências

- O sistema continua funcionando durante toda a evolução, e cada passo pode ser conferido isoladamente.
- O conhecimento da equipe e os diagramas de arquitetura e do banco continuam válidos.
- Algumas escolhas do MVP ficam e são tratadas como risco conhecido, como o token no `localStorage` ([ADR-0005](ADR-0005-token-jwt-no-localstorage-como-risco-aceito.md)).
- A evolução precisa de passos de compatibilidade, como o baseline de bancos antigos ([ADR-0002](ADR-0002-migrations-versionadas-e-docker-compose.md)).
