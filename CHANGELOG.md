# Registro de mudanças

Todas as mudanças relevantes do PasTrack ficam registradas neste arquivo.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/), e as versões seguem o [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Adicionado

- Fundação do repositório: `.gitignore`, `.gitattributes` com LF, `.editorconfig`, `.nvmrc` com Node 20, `.prettierrc` e `.dockerignore` em lista de permissão. (#8)
- `package.json` na raiz com os scripts `lint`, `format:check`, `typecheck`, `build` e `test:tudo`. (#8)
- ESLint 9 e Prettier no backend e no frontend, e o pacote `e2e/` com o Playwright. (#8)
- Validação das variáveis de ambiente na subida da API, com a lista do que corrigir. (#9)
- `GET /api/health`, que confere o banco e responde 503 quando ele cai. (#9)
- Encerramento limpo da API em SIGTERM e SIGINT. (#9)
- Rotas em um arquivo por recurso, e `/api/usuarios` protegido para administradores. (#9)
- Matriz única de permissões em `backend/src/config/permissoes.ts`. (#9)
- Middleware `validar()` com zod: dados inválidos e JSON malformado respondem 400, e corpo grande demais responde 413. (#9)
- Administrador inicial vindo de `SEED_ADMIN_EMAIL` e `SEED_ADMIN_SENHA`, com política de senha, e dados de demonstração só com `SEED_DEMO=true`. (#9)
- Migration versionada `20260914120000_inicial`, idêntica ao schema do MVP. (#9)
- `docker-compose.test.yml`, com um PostgreSQL descartável na porta 5433 para os testes. (#9)
- Testes do backend com Vitest e Supertest, unitários e de integração contra um banco real. (#9)
- Testes `it.fails` que registram defeitos conhecidos até a correção. (#9, #12)
- CI com os jobs `backend` e `frontend`: lint, formatação, tipos, testes com cobertura, build e `npm audit`. Os relatórios ficam como artefato por 30 dias. (#10)
- Verificação no CI de que as migrations estão em sincronia com o schema. (#10, #11)
- Migration `20260914130000_seguranca_integridade`: tabela `auditoria`, datas de criação e atualização, dados de resolução do alerta, `deve_trocar_senha`, `versao_token` e índices de consulta. (#11)
- CHECK de saldo e de estoque mínimo não negativos e de quantidade positiva, e índice único parcial com no máximo um alerta ABERTO por pastilha. (#11)
- Ciclo de vida do alerta com `avaliarAlerta`: abre no estoque mínimo e fecha automaticamente na reposição. (#11)
- Trilha de auditoria na tabela `auditoria`, sem senhas nem hashes. (#11)
- `npm run db:verificar`, que confere se as migrations reproduzem o schema. (#11)
- Respostas claras para erros do banco: 409 para duplicidade, 404 para registro inexistente e 400 para referência inválida, sempre com um `codigo` estável. (#11)
- Testes do frontend com Vitest, Testing Library e MSW, cobrindo serviços, rota protegida e as telas de Login, Painel e Movimentações. O CI passa a rodá-los com cobertura. (#12)
- Relatório de testes: `npm run test:relatorio` roda as suítes e grava a evidência sanitizada em `tests/results/<data>_<sha7>/`, com o protocolo em `tests/results/README.md`. (#13)
- Testes dos scripts do repositório com `node:test` (`npm run test:scripts`), também no CI. (#13)
- Docker Compose com `banco`, `api` e `web`: healthchecks, reinício automático e rotação de logs. A API aplica as migrations e roda o seed a cada subida. (#14)
- nginx com o site, o proxy de `/api`, o fallback da SPA e os cabeçalhos de segurança. (#14)
- Job `compose-smoke` no CI, que sobe o sistema e confere saúde, login, cabeçalhos e fallback da SPA. (#14)
- Contrato da API REST em `docs/api.md`. (#15)
- Primeiro snapshot de evidências, em `tests/results/2026-09-14_fb30118/`, e o `HISTORICO.md`. Backend com 123 testes e 88,78% de cobertura de linhas, frontend com 29 testes e 62,29%, e `npm audit` sem vulnerabilidades. (#17)
- Movimentações validadas com zod, numa união discriminada por tipo: na ENTRADA o fornecedor é obrigatório e precisa existir, e na SAÍDA ele é proibido. (#18)
- Filtros de movimentações por pastilha, tipo e período, filtro de alertas por situação e paginação opcional nas duas listagens. (#18)
- Resolução manual de alerta com trava da pastilha, registro de quem resolveu e da data, auditoria e 409 `ALERTA_JA_RESOLVIDO` para alerta já resolvido. (#18)
- Edição e consulta por id de fabricantes e fornecedores. (#19)
- Validação e formatação de CNPJ, inclusive o CNPJ alfanumérico. (#19)
- Cadastro de pastilhas validado e auditado. A pastilha criada já no mínimo abre o alerta, e a mudança do estoque mínimo reavalia o alerta, na mesma transação. (#19)
- Rotas de todas as telas no frontend, com carregamento sob demanda: o gráfico do painel não entra no pacote do login. Troca de senha, página não encontrada e sem permissão estão prontas; fabricantes, fornecedores, alertas e usuários ficam como páginas provisórias. (#20)
- Espelho da matriz de permissões no frontend: menu, botões e rotas conforme o perfil, com a página de sem permissão. A API continua autorizando. (#20)
- Componentes comuns, layout acessível e serviços do frontend por recurso, com erros tipados. (#20)
- Sessão no frontend que reage aos eventos da API sem recarregar a página: um 401 leva ao login com o aviso de sessão expirada, o 403 de troca obrigatória leva à tela de troca de senha, e sair ou entrar numa aba atualiza as outras. (#20)
- Validação de CNPJ no frontend pelos dígitos verificadores, nos formatos numérico e alfanumérico, com máscara que preserva as letras. (#20)
- Logs estruturados em JSON, com request id, redação de senhas e credenciais e nível definido por `LOG_LEVEL`. (#21)
- Gestão de usuários para administradores: cadastro, edição, ativação, desativação e redefinição de senha, sem deixar o sistema sem administrador ativo. (#21)
- Troca obrigatória de senha no primeiro acesso e depois de uma redefinição. (#21)
- Script `redefinir-senha-admin`, que recupera o acesso de um administrador pelo servidor. (#21)
- Documentação: decisões de arquitetura (ADR-0001 a ADR-0008), guia de implantação, manual de operação, índice da documentação e este registro de mudanças.

### Modificado

- O pacote `prisma` virou dependência de produção, porque o container roda `migrate deploy`. (#8)
- `tsconfig` mais estritos, com `noUnusedLocals`, `noUnusedParameters` e `noFallthroughCasesInSwitch`. (#8)
- As telas de Pastilhas e Movimentações carregam dados sem `setState` síncrono dentro de efeito, e o login perde o `autoFocus`. (#8)
- O COMPRADOR passa a cadastrar fornecedores e a registrar entradas, sem registrar saídas. (#9)
- O README passa a usar `npm run db:deploy` no lugar de `migrate dev`. (#9)
- Os usuários de demonstração entram sem troca obrigatória de senha. (#11)
- A cobertura do backend e do frontend é gravada mesmo quando algum teste falha. (#13)
- O frontend chama a API por `/api`: em desenvolvimento pelo proxy do Vite, e no Docker pelo nginx. (#14)
- A ENTRADA sem `fornecedorId` passa a responder 400. (#18)
- O painel consulta o banco com os limites de 20 itens críticos e 5 movimentações. (#18)
- A permissão é conferida antes da validação do corpo: a SAÍDA do COMPRADOR e as escritas dos cadastros sem permissão recebem 403, e não 400. (#18, #19)
- Movimentações no frontend: fornecedor obrigatório na entrada, saída escondida para quem não pode registrá-la e limites de tamanho iguais aos do backend. (#20)
- A edição de pastilha no frontend nunca envia `codigo` nem `saldoAtual`. (#20)
- Códigos e mensagens de erro alinhados ao contrato da API. (#21)

### Removido

- `backend/prisma/seed.ts`, que criava o administrador com senha fixa. O seed agora fica em `backend/src/scripts/`. (#9)

### Corrigido

- CNPJs válidos nos dados de demonstração. (#9)
- A ENTRADA que repõe o estoque acima do mínimo fecha o alerta aberto. (#11)
- A migration fecha alertas ABERTO duplicados de dados antigos e mantém aberto só o mais recente de cada pastilha. (#11)
- `GET /api/health` sem banco responde 503 com a chave `erro`, como todo erro da API, e mantém os campos de diagnóstico. (#16)
- Quantidade não numérica, ids acima do limite do banco, datas fora dos anos 1 a 9999 e o caractere nulo em texto respondem 400, e não 500. (#18)
- O código da pastilha é único sem diferença de maiúsculas. (#19)
- O frontend confere a expiração do token e protege a leitura do armazenamento local. Os dois defeitos registrados como `it.fails` no frontend viraram testes normais. (#20)
- Uma sessão expirada numa rota protegida mantém o aviso na tela de login, e um relógio adiantado não prende o usuário num ciclo de sessão expirada. (#20)

### Segurança

- Resolve os 9 alertas de dependências: React Router 7.18.3, Vite 6.4.3, esbuild, express 4.22.3, qs 6.16.0 e body-parser 1.20.8. O `npm audit` fica sem vulnerabilidades. (#8)
- `JWT_SECRET` com pelo menos 32 caracteres e recusado se for o valor de exemplo, e custo do bcrypt entre 12 e 15 em produção. (#9)
- O seed não tem mais senha fixa. Rodar de novo nunca troca a senha de um administrador existente. (#9)
- `X-Powered-By` desligado, CORS restrito às origens configuradas e corpo limitado a 100 kB. (#9)
- O relatório de testes remove caminhos absolutos e hostname e aborta sem gravar se sobrar algum dado da máquina. (#13)
- Containers sem root, banco publicado só em `127.0.0.1` e API sem porta no host. (#14)
- CSP, `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` e `server_tokens off` no nginx. (#14)
- A SAÍDA é atômica: saídas simultâneas nunca deixam o saldo negativo. (#18)
- `PUT /api/pastilhas/:id` não aceita mais `saldoAtual`: o saldo só muda por movimentação. (#19)
- Sessão revalidada no banco a cada requisição, com JWT endurecido: usuário desativado, com a senha trocada ou com o perfil alterado perde o acesso na hora. (#21)
- Helmet na API e limites de requisição, com 429 `MUITAS_TENTATIVAS`: 5 falhas de login por IP e e-mail em 15 minutos, até 1000 requisições por minuto por IP antes da autenticação e até 300 por minuto por usuário depois dela. (#21)

## [0.1.0] — 09/08/2026

MVP entregue na UC Projeto Aplicado IV.

### Adicionado

- API REST em Node.js, Express e TypeScript, em camadas: routes, controllers, services e repositories.
- Banco PostgreSQL com Prisma e seis entidades: usuário, fabricante, fornecedor, pastilha, movimentação e alerta.
- Quatro perfis: ADMINISTRADOR, GESTOR, OPERADOR e COMPRADOR.
- Login com JWT e senhas guardadas em hash bcrypt.
- Cadastro e edição de pastilhas, com busca por código ou descrição, e cadastro de fabricantes e fornecedores.
- Movimentações de ENTRADA e SAÍDA, com validação de saldo e atualização do saldo na mesma transação.
- Alerta automático quando o saldo chega ao estoque mínimo, com resolução manual por ADMINISTRADOR e GESTOR.
- Painel com o total de pastilhas, os alertas abertos, os itens críticos e as últimas movimentações.
- Frontend em React, TypeScript e Vite, com as telas de login, painel com gráfico, pastilhas e movimentações.
- Seed com um administrador e dados de exemplo.
- Diagramas: MER conceitual, MER lógico e arquitetura.
- README com a modelagem de dados e a equipe. (#1, #2)

[Não lançado]: https://github.com/thiagodorgo/PasTrack/compare/8584c51...HEAD
[0.1.0]: https://github.com/thiagodorgo/PasTrack/tree/8584c51
