# ADR-0003: Matriz de perfis e o papel do COMPRADOR

## Situação

Aceita, 14/09/2026.

## Contexto

O PasTrack tem quatro perfis: ADMINISTRADOR, GESTOR, OPERADOR e COMPRADOR.

No MVP, cada rota listava os perfis aceitos, como `autorizar("ADMINISTRADOR", "GESTOR")`. Não havia um lugar único para conferir quem pode o quê.

O COMPRADOR só conseguia consultar. Mas é a área de compras que cadastra os fornecedores e recebe o material comprado, e ela precisava registrar essas entradas.

## Decisão

### Fonte única

`backend/src/config/permissoes.ts` define cada ação e os perfis autorizados. As rotas usam `autorizar(acao)`. O controller de movimentações usa `pode(perfil, "registrarSaida")` quando o tipo é `SAIDA`.

### Espelho no teste

`backend/tests/unit/permissoes.spec.ts` tem uma tabela escrita à mão com a mesma matriz. Mudar uma permissão exige mudar os dois arquivos e registrar a decisão num ADR.

### A matriz

| Ação                    | O que cobre                                           | ADMINISTRADOR | GESTOR | OPERADOR | COMPRADOR |
| ----------------------- | ----------------------------------------------------- | ------------- | ------ | -------- | --------- |
| `consultar`             | painel, pastilhas, cadastros, movimentações e alertas | sim           | sim    | sim      | sim       |
| `gerenciarPastilhas`    | cadastrar e editar pastilhas                          | sim           | sim    | não      | não       |
| `gerenciarFabricantes`  | cadastrar e editar fabricantes                        | sim           | sim    | não      | não       |
| `gerenciarFornecedores` | cadastrar e editar fornecedores                       | sim           | sim    | não      | sim       |
| `registrarEntrada`      | lançar ENTRADA                                        | sim           | sim    | sim      | sim       |
| `registrarSaida`        | lançar SAÍDA                                          | sim           | sim    | sim      | não       |
| `resolverAlerta`        | resolver um alerta manualmente                        | sim           | sim    | não      | não       |
| `gerenciarUsuarios`     | tudo em `/api/usuarios`                               | sim           | não    | não      | não       |

### O papel do COMPRADOR

O COMPRADOR é a área de compras.

- Cadastra e edita fornecedores.
- Registra só ENTRADA. Uma SAÍDA enviada por ele recebe 403, com a mensagem "Seu perfil só pode registrar entradas".
- Acompanha os alertas, para saber o que precisa ser reposto.
- Não resolve alerta manualmente. Isso fica com ADMINISTRADOR e GESTOR.
- Não gerencia usuários.

## Alternativas consideradas

- **Manter a lista de perfis em cada rota, como no MVP.** É fácil esquecer uma rota, e a revisão fica difícil.
- **Guardar as permissões no banco, configuráveis por tela.** Mais flexível, mas exigiria telas, migrations e testes que quatro perfis fixos não justificam.
- **COMPRADOR só com consulta, como no MVP.** Obrigaria outra pessoa a lançar as entradas que a área de compras recebe.

## Consequências

- Uma mudança de permissão aparece no diff de dois arquivos e num ADR. Se só um lado mudar, o teste falha.
- Todos os perfis podem consultar. Por isso, as rotas de leitura exigem só um usuário autenticado.
- A documentação de perfis, em elaboração em `docs/perfis-e-permissoes.md`, sai desta mesma matriz.
- A resolução manual de alertas fica com ADMINISTRADOR e GESTOR ([ADR-0008](ADR-0008-ciclo-de-vida-do-alerta.md)).
