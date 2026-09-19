# Plano de testes

Liga cada requisito do PasTrack ao que o prova. A estratégia, os comandos e as convenções estão em [testes.md](../testes.md); os requisitos, em [requisitos.md](../requisitos.md).

Os caminhos são relativos a `backend/tests/` e `frontend/tests/`.

## Requisitos funcionais

| Requisito                                    | Backend                                                                                   | Frontend                                                                    | Manual                         |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------ |
| RF-01 entrar e sair                          | `integration/auth.spec.ts`, `security/auth-tokens.spec.ts`                                | `pages/Login.spec.tsx`, `services/auth.spec.ts`                             | instalação nova                |
| RF-02 trocar a própria senha                 | `security/primeiro-acesso.spec.ts`, `security/troca-concorrente.spec.ts`                  | `pages/AlterarSenha.spec.tsx`                                               | instalação nova                |
| RF-03 troca obrigatória                      | `security/primeiro-acesso.spec.ts`, `unit/exigir-senha-atualizada.spec.ts`                | `components/Protegido.spec.tsx`                                             | instalação nova                |
| RF-04 cadastrar usuário com senha temporária | `integration/usuarios.spec.ts`                                                            | `services/usuarios.spec.ts`                                                 | instalação nova                |
| RF-05 alterar nome e perfil                  | `integration/usuarios.spec.ts`                                                            | `services/usuarios.spec.ts`                                                 | —                              |
| RF-06 ativar e desativar                     | `integration/usuarios.spec.ts`, `security/usuario-inativo.spec.ts`                        | `services/usuarios.spec.ts`                                                 | —                              |
| RF-07 redefinir a senha de outro             | `integration/usuarios.spec.ts`                                                            | `services/usuarios.spec.ts`                                                 | —                              |
| RF-08 recuperar o administrador              | `integration/redefinir-senha-admin.spec.ts`                                               | —                                                                           | —                              |
| RF-09 fabricante                             | `integration/fabricantes.spec.ts`                                                         | `services/cadastros.spec.ts`                                                | —                              |
| RF-10 fornecedor com CNPJ                    | `integration/fornecedores.spec.ts`, `unit/cnpj.spec.ts`                                   | `services/cadastros.spec.ts`, `utils/formato.spec.ts`                       | —                              |
| RF-11 cadastrar pastilha                     | `integration/pastilhas.spec.ts`                                                           | `pages/Pastilhas.spec.tsx`                                                  | instalação nova                |
| RF-12 alterar pastilha sem editar saldo      | `integration/pastilhas.spec.ts`, `integration/campos-nao-permitidos.spec.ts`              | `pages/Pastilhas.spec.tsx`                                                  | —                              |
| RF-13 buscar e filtrar pastilhas             | `integration/pastilhas.spec.ts`                                                           | `pages/Pastilhas.spec.tsx`                                                  | T01                            |
| RF-14 registrar entrada                      | `integration/movimentacoes.spec.ts`                                                       | `pages/Movimentacoes.spec.tsx`                                              | T02, T03, T07, T09, T14        |
| RF-15 registrar saída                        | `integration/movimentacoes.spec.ts`                                                       | `pages/Movimentacoes.spec.tsx`                                              | T04 a T06, T12, T13, T17 a T20 |
| RF-16 histórico com filtro e paginação       | `integration/movimentacoes.spec.ts`                                                       | `components/TabelaMovimentacoes.spec.tsx`, `services/movimentacoes.spec.ts` | T01                            |
| RF-17 corrigir por lançamento inverso        | `integration/movimentacoes.spec.ts`                                                       | —                                                                           | —                              |
| RF-18 abrir alerta sozinho                   | `integration/alertas.spec.ts`, `integration/movimentacoes.spec.ts`                        | `pages/Alertas.spec.tsx`                                                    | T15                            |
| RF-19 fechar alerta na reposição             | `integration/alertas.spec.ts`                                                             | `pages/Alertas.spec.tsx`                                                    | T16                            |
| RF-20 consultar alertas por situação         | `integration/alertas.spec.ts`                                                             | `pages/Alertas.spec.tsx`                                                    | T15, T16                       |
| RF-21 resolver alerta à mão                  | `integration/alertas.spec.ts`                                                             | `pages/Alertas.spec.tsx`                                                    | —                              |
| RF-22 painel                                 | `integration/painel.spec.ts`                                                              | `pages/Painel.spec.tsx`                                                     | instalação nova                |
| RF-23 rastreio da movimentação               | `integration/movimentacoes.spec.ts`                                                       | `components/TabelaMovimentacoes.spec.tsx`                                   | T01                            |
| RF-24 trilha de auditoria                    | `integration/pastilhas.spec.ts`, `integration/usuarios.spec.ts`, `unit/auditoria.spec.ts` | —                                                                           | —                              |

## Regras de negócio

| Regra                                     | O que prova                                                                                              |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| RN-01 saldo nunca negativo                | `security/concorrencia.spec.ts`, `integration/movimentacoes.spec.ts`; manual T06 e T18                   |
| RN-02 saldo só por movimentação           | `integration/pastilhas.spec.ts`, `integration/campos-nao-permitidos.spec.ts`                             |
| RN-03 fornecedor na entrada, não na saída | `integration/movimentacoes.spec.ts`; manual T03                                                          |
| RN-04 estoque mínimo zero não gera alerta | `integration/alertas.spec.ts`, `integration/painel.spec.ts`                                              |
| RN-05 um alerta aberto por pastilha       | `security/concorrencia.spec.ts`, `integration/alertas.spec.ts`                                           |
| RN-06 mudar o mínimo reavalia o alerta    | `integration/alertas.spec.ts`                                                                            |
| RN-07 movimentação não é apagada          | ausência de rota de exclusão, conferida em `integration/permissoes.spec.ts`                              |
| RN-08 nunca sem administrador ativo       | `security/travas-administradores.spec.ts`                                                                |
| RN-09 política de senha                   | `unit/politica-senha.spec.ts`, `utils/senha.spec.ts` no frontend                                         |
| RN-10 sessão cai ao mudar a conta         | `security/usuario-inativo.spec.ts`, `security/auth-tokens.spec.ts`, `security/troca-concorrente.spec.ts` |
| RN-11 usuário é desativado, não apagado   | `integration/usuarios.spec.ts`                                                                           |

## Requisitos não funcionais

| Requisito                             | O que prova                                                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| RNF-01 rodar com Docker Compose       | [evidência da implantação](evidencias/2026-09-19-implantacao.md)                                                    |
| RNF-02 subir com um comando           | mesma evidência e o `compose-smoke` do CI                                                                           |
| RNF-03 backup e restauração           | mesma evidência                                                                                                     |
| RNF-04 acesso por perfil no servidor  | `integration/permissoes.spec.ts`, `integration/cadastros-permissoes.spec.ts`, `unit/permissoes.spec.ts`; manual T14 |
| RNF-05 ASVS nível 1                   | [autoavaliação](../seguranca/asvs-l1-checklist.md)                                                                  |
| RNF-06 senha em hash, log sem segredo | `unit/politica-senha.spec.ts`, `unit/logger.spec.ts`, `unit/auditoria.spec.ts`                                      |
| RNF-07 tempo de resposta              | [medição com volume](evidencias/2026-09-19-desempenho.md): 400 pastilhas e 30.000 movimentações, pior p95 de 22 ms  |
| RNF-08 navegadores                    | sessão manual gravada, no Chromium                                                                                  |
| RNF-09 teclado e leitor de tela       | as buscas dos testes de tela usam papel e rótulo acessível                                                          |
| RNF-10 português do Brasil            | testes que fixam as mensagens, como `unit/validar-e-erros.spec.ts` e `pages/AlterarSenha.spec.tsx`                  |
| RNF-11 suítes verdes com evidência    | CI obrigatório e [tests/results/](../../tests/results/README.md)                                                    |
| RNF-12 decisões registradas           | [ADRs](../decisoes/README.md)                                                                                       |

## Casos manuais

Uma sessão pelo navegador cobriu 20 casos do registro de movimentações, com conferência no banco a cada caso. O resultado está em [evidências](evidencias/2026-09-19-casos-manuais.md).

| Caso | O que faz                           | Resultado esperado                                    |
| ---- | ----------------------------------- | ----------------------------------------------------- |
| T01  | Consultar a tela e o histórico      | A tela abre com o formulário e o histórico            |
| T02  | Registrar entrada válida            | `201` e saldo somado                                  |
| T03  | Entrada sem fornecedor              | O formulário bloqueia antes de enviar                 |
| T04  | Saída válida                        | `201` e saldo subtraído                               |
| T05  | Retirar exatamente o saldo          | `201` e saldo zerado                                  |
| T06  | Saída acima do saldo                | `400` com "saldo insuficiente"                        |
| T07  | Quantidade mínima, 1                | `201`                                                 |
| T08  | Quantidade zero                     | O formulário bloqueia                                 |
| T09  | Quantidade máxima, 1.000.000        | `201`                                                 |
| T10  | Acima do máximo                     | O formulário bloqueia                                 |
| T11  | Quantidade fracionária              | O formulário bloqueia                                 |
| T12  | Campos opcionais deixados em branco | `201`, com os dois campos nulos no histórico          |
| T13  | Documento e observação no limite    | `201`; o campo recusa o caractere além do limite      |
| T14  | Registro pelo perfil COMPRADOR      | O campo Tipo só oferece entrada, e a entrada registra |
| T15  | Saída que leva ao estoque mínimo    | Alerta aberto e visível na tela de alertas            |
| T16  | Entrada que repõe acima do mínimo   | Alerta resolvido automaticamente                      |
| T17  | Saída sem escolher a pastilha       | O formulário bloqueia                                 |
| T18  | Saída com saldo zero                | `400` com "saldo insuficiente"                        |
| T19  | Quantidade negativa                 | O formulário bloqueia                                 |
| T20  | Quantidade vazia                    | O formulário bloqueia                                 |

## Lacunas conhecidas

| Lacuna                             | Plano                                                                  |
| ---------------------------------- | ---------------------------------------------------------------------- |
| Fluxos ponta a ponta automatizados | Suíte Playwright contra o Compose, com os cinco fluxos principais      |
| Matriz de permissões rota por rota | Teste que percorre a matriz inteira e falha se surgir rota fora dela   |
| Medição contínua de desempenho     | Hoje é uma medição pontual; repetir a cada mudança que toque consultas |
