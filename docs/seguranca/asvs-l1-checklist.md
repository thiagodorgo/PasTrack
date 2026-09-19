# Autoavaliação ASVS 4.0.3 — nível 1

Esta é uma **autoavaliação**, feita pela própria equipe do PasTrack, contra o [OWASP Application Security Verification Standard 4.0.3](https://owasp.org/www-project-application-security-verification-standard/), nível 1. Ela não substitui uma auditoria externa.

Os requisitos estão resumidos em português. O texto original, em inglês, é do OWASP e está publicado sob a licença CC BY-SA 3.0.

## Como ler

| Situação            | Significado                                                                          |
| ------------------- | ------------------------------------------------------------------------------------ |
| Atende              | O controle existe e está coberto por teste automatizado ou por evidência registrada. |
| Atende com ressalva | O controle existe, com uma limitação declarada na própria linha.                     |
| Desvio consciente   | O sistema não faz o que o requisito pede, por uma decisão registrada.                |
| Não se aplica       | O requisito trata de um recurso que o sistema não tem.                               |
| Pendente            | Reconhecido como falta, ainda sem correção.                                          |

A evidência aponta arquivos e nomes de teste, sem número de linha, para não envelhecer a cada mudança.

O escopo é o commit avaliado da `main`: API Express, interface React, nginx e o Docker Compose da raiz.

## V1 Arquitetura

O capítulo V1 não tem requisitos de nível 1. A documentação correspondente está em [arquitetura.md](../arquitetura.md), [banco-de-dados.md](../banco-de-dados.md) e no [modelo de ameaças](modelo-de-ameacas.md).

## V2 Autenticação

| Req.   | Resumo                                      | Situação            | Evidência                                                                                                                                                           |
| ------ | ------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1.1  | Senha com 12 caracteres ou mais             | Atende              | `services/politica-senha.ts`; `unit/politica-senha.spec.ts`                                                                                                         |
| 2.1.2  | Aceitar senhas longas                       | Atende com ressalva | Aceita até 72 bytes, limite do bcrypt, e não 128; `unit/politica-senha.spec.ts` cobre o limite em bytes                                                             |
| 2.1.3  | Não truncar a senha                         | Atende              | Senha acima do limite é recusada, nunca cortada; `unit/politica-senha.spec.ts`                                                                                      |
| 2.1.4  | Aceitar qualquer caractere imprimível       | Atende              | A política não restringe o conjunto de caracteres; `schemas/auth.schema.ts`                                                                                         |
| 2.1.5  | Usuário troca a própria senha               | Atende              | `PATCH /api/auth/senha`; `security/primeiro-acesso.spec.ts`                                                                                                         |
| 2.1.6  | Troca exige a senha atual                   | Atende              | `services/auth.service.ts`; `security/primeiro-acesso.spec.ts`                                                                                                      |
| 2.1.7  | Conferir contra senhas vazadas              | Atende com ressalva | Lista local de senhas comuns, sem consulta a base de vazamentos: a instalação não acessa a internet                                                                 |
| 2.1.8  | Indicador de força da senha                 | Atende com ressalva | A tela mostra as regras e o que falta, sem barra de força; `pages/AlterarSenha.tsx`                                                                                 |
| 2.1.9  | Sem regras de composição                    | Desvio consciente   | Exige uma letra e um número, para compensar senhas curtas; registrado em [seguranca.md](../seguranca.md)                                                            |
| 2.1.10 | Sem troca periódica obrigatória             | Atende              | Só a primeira senha e a redefinida pelo administrador exigem troca                                                                                                  |
| 2.1.11 | Permitir colar e usar gerenciador de senhas | Atende              | Campos de senha comuns, sem bloqueio de colagem; `pages/Login.tsx`, `pages/AlterarSenha.tsx`                                                                        |
| 2.1.12 | Poder revelar a senha digitada              | Atende              | Botão que mostra e esconde a senha no login e na troca de senha; `components/MostrarSenha.tsx`, com teste em `pages/Login.spec.tsx` e `pages/AlterarSenha.spec.tsx` |
| 2.2.1  | Antiautomação no login                      | Atende              | 5 falhas por IP e e-mail a cada 15 minutos, bem abaixo do teto de 100 por hora; `security/bruteforce.spec.ts`                                                       |
| 2.2.2  | Autenticadores fracos só como segundo fator | Não se aplica       | Só existe senha                                                                                                                                                     |
| 2.2.3  | Avisar o usuário ao mudar credenciais       | Desvio consciente   | A instalação não envia e-mail; a mudança fica na trilha de auditoria                                                                                                |
| 2.5.1  | Segredo inicial não trafega em claro        | Atende com ressalva | A senha temporária aparece uma vez na resposta da API; o transporte é HTTP na rede local, veja V9                                                                   |
| 2.5.2  | Sem perguntas secretas nem dicas            | Atende              | A recuperação é administrativa; `scripts/redefinir-senha-admin.ts`                                                                                                  |
| 2.5.3  | Recuperação não revela a senha atual        | Atende              | A redefinição gera uma senha nova; `integration/usuarios.spec.ts`                                                                                                   |
| 2.5.4  | Sem contas compartilhadas ou padrão         | Atende              | O administrador inicial usa a senha do `.env`, com troca obrigatória; `security/primeiro-acesso.spec.ts`                                                            |
| 2.5.5  | Avisar quando o fator de acesso muda        | Desvio consciente   | Mesmo motivo do 2.2.3                                                                                                                                               |
| 2.5.6  | Recuperação por canal seguro                | Não se aplica       | Não há autoatendimento de recuperação: quem redefine é o administrador, ou o script no servidor                                                                     |
| 2.7.x  | Verificador fora de banda                   | Não se aplica       | Não existe canal fora de banda                                                                                                                                      |
| 2.8.1  | Código de uso único com validade            | Não se aplica       | Não existe autenticador de uso único                                                                                                                                |

## V3 Sessão

| Req.  | Resumo                                     | Situação            | Evidência                                                                                                 |
| ----- | ------------------------------------------ | ------------------- | --------------------------------------------------------------------------------------------------------- |
| 3.1.1 | Token nunca na URL                         | Atende              | O token vai no cabeçalho `Authorization`; `services/api.ts`; `security/auth-tokens.spec.ts`               |
| 3.2.1 | Token novo a cada autenticação             | Atende              | Login e troca de senha emitem token novo; `integration/auth.spec.ts` e `security/primeiro-acesso.spec.ts` |
| 3.2.2 | Entropia suficiente no token               | Atende com ressalva | O token é um JWT HS256 assinado com segredo de 32 caracteres ou mais, exigido no boot; `config/env.ts`    |
| 3.2.3 | Guardar o token com segurança no navegador | Desvio consciente   | Fica no `localStorage`, decisão registrada no ADR-0005                                                    |
| 3.4.x | Atributos de cookie                        | Não se aplica       | A sessão não usa cookie                                                                                   |
| 3.7.1 | Sessão válida antes de ação sensível       | Atende              | Cada requisição revalida a sessão no banco; a troca de senha exige a senha atual; `middlewares/auth.ts`   |

## V4 Controle de acesso

| Req.  | Resumo                                           | Situação            | Evidência                                                                                          |
| ----- | ------------------------------------------------ | ------------------- | -------------------------------------------------------------------------------------------------- |
| 4.1.1 | Controle aplicado no servidor                    | Atende              | `config/permissoes.ts` e `middlewares/auth.ts`; `integration/permissoes.spec.ts`                   |
| 4.1.2 | Usuário não manipula atributos de acesso         | Atende              | Esquemas estritos e perfil só pelo administrador; `integration/campos-nao-permitidos.spec.ts`      |
| 4.1.3 | Menor privilégio                                 | Atende              | Matriz em [perfis-e-permissoes.md](../perfis-e-permissoes.md); `unit/permissoes.spec.ts`           |
| 4.1.5 | Falhar fechado                                   | Atende              | Sem token ou sem permissão, a resposta é 401 ou 403; `security/auth-tokens.spec.ts`                |
| 4.2.1 | Proteção contra acesso direto a objeto           | Atende com ressalva | O acesso é por perfil, não por dono: o estoque é da empresa inteira e todo usuário logado consulta |
| 4.2.2 | Anti-CSRF e antiautomação                        | Atende              | Sem cookie, o CSRF clássico não se aplica; CORS com lista e limites por IP e por usuário           |
| 4.3.1 | Segundo fator na área administrativa             | Desvio consciente   | Não há segundo fator; risco aceito em [seguranca.md](../seguranca.md)                              |
| 4.3.2 | Sem listagem de diretório nem metadados expostos | Atende              | O nginx serve só o site compilado; a imagem não leva `.git`; `compose-smoke` no CI                 |

## V5 Validação, sanitização e codificação

| Req.   | Resumo                                | Situação      | Evidência                                                                                     |
| ------ | ------------------------------------- | ------------- | --------------------------------------------------------------------------------------------- |
| 5.1.1  | Poluição de parâmetros                | Atende        | Parâmetro repetido vira 400; `integration/pastilhas.spec.ts`                                  |
| 5.1.2  | Atribuição em massa                   | Atende        | Esquemas estritos; o saldo não é campo de cadastro; `integration/pastilhas.spec.ts`           |
| 5.1.3  | Validação por lista de permissão      | Atende        | `middlewares/validar.ts` e `schemas/`; `unit/validar-e-erros.spec.ts`                         |
| 5.1.4  | Tipagem forte e esquema               | Atende        | Zod em corpo, parâmetros e consulta; ADR-0004                                                 |
| 5.1.5  | Redirecionamentos em lista            | Não se aplica | A API não redireciona                                                                         |
| 5.2.1  | HTML de editor de texto               | Não se aplica | Não há editor de texto rico                                                                   |
| 5.2.2  | Dados sem estrutura limitados         | Atende        | Texto com corte de espaços, limite de tamanho e sem caractere nulo; `schemas/comum.schema.ts` |
| 5.2.3  | Entrada usada em e-mail               | Não se aplica | O sistema não envia e-mail                                                                    |
| 5.2.4  | Sem `eval`                            | Atende        | Não há `eval` nem execução dinâmica no código da aplicação                                    |
| 5.2.5  | Injeção em template                   | Não se aplica | A API devolve JSON; não há template no servidor                                               |
| 5.2.6  | SSRF                                  | Não se aplica | A API não faz requisições para endereços vindos do usuário                                    |
| 5.2.7  | SVG enviado pelo usuário              | Não se aplica | Não há envio de arquivo                                                                       |
| 5.2.8  | Linguagens de template do usuário     | Não se aplica | Não há                                                                                        |
| 5.3.1  | Codificação de saída por contexto     | Atende        | O React escapa o conteúdo; não há `dangerouslySetInnerHTML` no projeto                        |
| 5.3.2  | Conjunto de caracteres preservado     | Atende        | UTF-8 na API e no nginx; `compose-smoke` no CI                                                |
| 5.3.3  | Proteção contra XSS                   | Atende        | Escape do React mais CSP no nginx; `compose-smoke` no CI                                      |
| 5.3.4  | Consulta parametrizada                | Atende        | Prisma; a única consulta crua usa parâmetro ligado, em `repositories/pastilha.repository.ts`  |
| 5.3.5  | Codificação específica de contexto    | Atende        | Mesma evidência do 5.3.1                                                                      |
| 5.3.6  | Injeção em JSON e `eval`              | Atende        | `express.json` e `JSON.parse`, sem `eval`                                                     |
| 5.3.7  | Injeção em LDAP                       | Não se aplica | Não há LDAP                                                                                   |
| 5.3.8  | Injeção de comando do sistema         | Não se aplica | A API não executa comandos do sistema                                                         |
| 5.3.9  | Inclusão de arquivo local ou remoto   | Não se aplica | A API não lê caminhos vindos do usuário                                                       |
| 5.3.10 | Injeção em XPath ou XML               | Não se aplica | Não há XML                                                                                    |
| 5.5.1  | Integridade de objeto serializado     | Não se aplica | Não há objeto serializado além de JSON                                                        |
| 5.5.2  | Parser XML restrito                   | Não se aplica | Não há XML                                                                                    |
| 5.5.3  | Desserialização de dado não confiável | Atende        | Só JSON, com esquema estrito                                                                  |
| 5.5.4  | `JSON.parse` em vez de `eval`         | Atende        | Mesma evidência do 5.3.6                                                                      |

## V7 Erros e registro

| Req.  | Resumo                                   | Situação | Evidência                                                     |
| ----- | ---------------------------------------- | -------- | ------------------------------------------------------------- |
| 7.1.1 | Sem credenciais nem token no log         | Atende   | Redação no logger; `unit/logger.spec.ts`                      |
| 7.1.2 | Sem dado sensível no log                 | Atende   | A auditoria remove campos sensíveis; `unit/auditoria.spec.ts` |
| 7.4.1 | Erro genérico com identificador de apoio | Atende   | 500 responde com `requestId`; `unit/erros-banco.spec.ts`      |

## V8 Proteção de dados

| Req.  | Resumo                                          | Situação          | Evidência                                                                                                            |
| ----- | ----------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------- |
| 8.2.1 | Cabeçalho contra cache                          | Atende            | `Cache-Control: no-store` em `/api`; `security/headers.spec.ts`                                                      |
| 8.2.2 | Sem dado sensível no armazenamento do navegador | Desvio consciente | O token fica no `localStorage`; ADR-0005                                                                             |
| 8.2.3 | Limpar os dados ao encerrar a sessão            | Atende            | `services/sessao.ts` limpa no logout e no 401; `services/auth.spec.ts` e `contexts/AuthContext.spec.tsx` do frontend |
| 8.3.1 | Dado sensível fora da query string              | Atende            | Login e troca de senha vão no corpo; nenhum segredo em parâmetro de URL                                              |
| 8.3.2 | Exportar ou apagar os próprios dados            | Pendente          | Não há exportação nem exclusão pelo usuário; tratado em [seguranca.md](../seguranca.md), LGPD                        |
| 8.3.3 | Informar o usuário sobre os dados coletados     | Pendente          | Depende de um aviso da empresa aos funcionários; modelo sugerido em [seguranca.md](../seguranca.md)                  |
| 8.3.4 | Dados sensíveis identificados, com política     | Atende            | Inventário e política em [seguranca.md](../seguranca.md)                                                             |

## V9 Comunicação

| Req.  | Resumo                    | Situação          | Evidência                                                                                                   |
| ----- | ------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------- |
| 9.1.1 | TLS em toda a comunicação | Desvio consciente | A instalação padrão é HTTP na rede local da fábrica; risco e alternativa em [seguranca.md](../seguranca.md) |
| 9.1.2 | Só cifras fortes          | Não se aplica     | Sem TLS na instalação padrão                                                                                |
| 9.1.3 | Só versões atuais do TLS  | Não se aplica     | Sem TLS na instalação padrão                                                                                |

## V10 Código malicioso

| Req.   | Resumo                                     | Situação            | Evidência                                                                                 |
| ------ | ------------------------------------------ | ------------------- | ----------------------------------------------------------------------------------------- |
| 10.3.1 | Atualização por canal seguro               | Atende              | Código por HTTPS, dependências por `npm ci` com integridade no lockfile, imagens oficiais |
| 10.3.2 | Sem conteúdo executável de origem duvidosa | Atende com ressalva | A CSP só libera scripts do próprio site; não há assinatura de código                      |
| 10.3.3 | Proteção contra tomada de subdomínio       | Não se aplica       | O sistema não é publicado num domínio                                                     |

## V11 Lógica de negócio

| Req.   | Resumo                                 | Situação            | Evidência                                                                                                                 |
| ------ | -------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 11.1.1 | Passos na ordem, sem pular etapa       | Atende              | A movimentação é uma transação única; a senha temporária bloqueia o resto do sistema                                      |
| 11.1.2 | Tempo humano entre as ações            | Desvio consciente   | Lançamentos legítimos podem ser rápidos; a proteção é o limite por usuário                                                |
| 11.1.3 | Limite por usuário nas transações      | Atende              | Quantidade máxima por movimentação e limite por usuário; `integration/movimentacoes.spec.ts` e `unit/env-limites.spec.ts` |
| 11.1.4 | Antiautomação contra extração em massa | Atende com ressalva | Limite por usuário e página de no máximo 100 registros                                                                    |
| 11.1.5 | Regras vindas do modelo de ameaças     | Atende              | [modelo-de-ameacas.md](modelo-de-ameacas.md); `security/concorrencia.spec.ts`                                             |

## V12 Arquivos e recursos

O sistema não recebe nem serve arquivos enviados por usuários, então V12.1 a V12.4 e V12.6 não se aplicam. O nginx serve apenas o site compilado, o que atende 12.5.1 e 12.5.2.

## V13 API

| Req.   | Resumo                                     | Situação      | Evidência                                                           |
| ------ | ------------------------------------------ | ------------- | ------------------------------------------------------------------- |
| 13.1.1 | Mesma codificação e parser em toda a pilha | Atende        | Só JSON em UTF-8, do nginx à API                                    |
| 13.1.3 | Sem segredo na URL                         | Atende        | Mesma evidência do 3.1.1                                            |
| 13.2.1 | Métodos HTTP restritos                     | Atende        | Só os métodos declarados nas rotas respondem; os demais caem no 404 |
| 13.2.2 | Validação de esquema antes de aceitar      | Atende        | Mesma evidência do 5.1.3                                            |
| 13.2.3 | Anti-CSRF em serviço com cookie            | Não se aplica | A API não usa cookie                                                |
| 13.3.1 | Validação de XML                           | Não se aplica | Não há SOAP nem XML                                                 |

## V14 Configuração

| Req.   | Resumo                                     | Situação            | Evidência                                                                                                                         |
| ------ | ------------------------------------------ | ------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 14.2.1 | Dependências atualizadas, com verificador  | Atende              | `npm audit --omit=dev --audit-level=high` no CI e alertas do GitHub                                                               |
| 14.2.2 | Sem recursos e exemplos desnecessários     | Atende              | Imagem em estágios, sem ferramentas de build; dados de demonstração desligados por padrão                                         |
| 14.2.3 | Integridade de recurso externo             | Não se aplica       | O site não carrega recurso de fora: a CSP só libera a própria origem                                                              |
| 14.3.2 | Modo de depuração desligado                | Atende              | `NODE_ENV=production` na imagem e erro 500 sem pilha; `unit/erros-banco.spec.ts`                                                  |
| 14.3.3 | Sem versão de componente nos cabeçalhos    | Atende com ressalva | `x-powered-by` e `server_tokens` desligados; `GET /api/health` mostra a versão do próprio PasTrack, de propósito, para a operação |
| 14.4.1 | `Content-Type` com charset                 | Atende              | API e nginx respondem com `charset=utf-8`; conferido no `compose-smoke`                                                           |
| 14.4.2 | `Content-Disposition` nas respostas da API | Desvio consciente   | A API é consumida pelo próprio site; com `nosniff` e CSP, o ganho não compensa o ruído                                            |
| 14.4.3 | Content Security Policy                    | Atende              | CSP no nginx e na API; `security/headers.spec.ts` e `compose-smoke`                                                               |
| 14.4.4 | `X-Content-Type-Options: nosniff`          | Atende              | Mesma evidência do 14.4.3                                                                                                         |
| 14.4.5 | HSTS                                       | Desvio consciente   | Sem TLS na rede local, o HSTS quebraria o acesso; veja V9                                                                         |
| 14.4.6 | `Referrer-Policy`                          | Atende              | `no-referrer` na API e `strict-origin-when-cross-origin` no nginx                                                                 |
| 14.4.7 | Bloquear incorporação em outro site        | Atende              | `frame-ancestors 'none'` e `X-Frame-Options: DENY`                                                                                |
| 14.5.1 | Só os métodos necessários                  | Atende              | Mesma evidência do 13.2.1                                                                                                         |
| 14.5.2 | `Origin` não decide acesso                 | Atende              | O acesso vem do token; o `Origin` só entra no CORS                                                                                |
| 14.5.3 | Lista de origens no CORS, sem `null`       | Atende              | `CORS_ORIGINS` conferido no boot; `config/env.ts` e `unit/env.spec.ts`                                                            |

## Resumo

| Situação            | Linhas |
| ------------------- | -----: |
| Atende              |     61 |
| Atende com ressalva |      9 |
| Desvio consciente   |     10 |
| Não se aplica       |     24 |
| Pendente            |      2 |

São 106 linhas. Duas delas, `2.7.x` e `3.4.x`, agrupam uma seção inteira que não se aplica. O capítulo V12 é tratado em texto, sem tabela.

As pendências são os dois requisitos de LGPD sobre dados do usuário (8.3.2 e 8.3.3), que dependem de um aviso da empresa. Os desvios conscientes, com o motivo de cada um, estão reunidos em [seguranca.md](../seguranca.md).
