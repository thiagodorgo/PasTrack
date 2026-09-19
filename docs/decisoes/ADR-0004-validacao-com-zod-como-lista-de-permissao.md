# ADR-0004: Validação com zod como lista de permissão

## Situação

Aceita, 14/09/2026.

## Contexto

No MVP, os controllers liam o `req.body` e repassavam o conteúdo aos services. Dois defeitos vieram disso. Os dois estão registrados como `it.fails` em `backend/tests/security/pendencias.spec.ts`:

- `PUT /api/pastilhas/:id` aceita `saldoAtual` no corpo. Um GESTOR consegue mudar o saldo sem movimentação (mass assignment).
- Uma quantidade não numérica em `POST /api/movimentacoes` gera erro 500 em vez de 400.

O saldo é a informação mais sensível do sistema. Ele precisa bater com a soma das movimentações.

## Decisão

Toda rota que recebe dados valida `body`, `params` e `query` com zod, pelo middleware `validar()` de `backend/src/middlewares/validar.ts`.

- Os esquemas de corpo usam `z.strictObject`. Eles funcionam como lista de permissão: só passam os campos listados.
- Um campo fora do esquema responde 400. Ele não é descartado em silêncio.
- Nenhum esquema de pastilha tem `saldoAtual`. O saldo só muda por movimentação ([ADR-0006](ADR-0006-saldo-atomico-e-regras-no-banco.md)).
- O `validar()` troca os valores da requisição pelos já convertidos. O controller recebe números como números.
- O tratador de erros devolve sempre o mesmo formato:

  ```json
  {
    "erro": "Dados inválidos",
    "codigo": "DADOS_INVALIDOS",
    "campos": [{ "caminho": "quantidade", "mensagem": "..." }]
  }
  ```

  - `erro`: a mensagem para a pessoa;
  - `codigo`: um valor estável, para o frontend reagir sem depender do texto;
  - `campos`: cada problema, com o caminho do campo e a mensagem.

## Alternativas consideradas

- **Validação manual em cada controller, como no MVP.** Cada rota validava do seu jeito, e um campo esquecido virava falha de segurança.
- **`z.object` padrão, que descarta campos desconhecidos.** Esconderia erros do cliente e tentativas de alterar campos protegidos.
- **Lista de bloqueio, removendo `saldoAtual` do corpo.** Falha no dia em que surgir outro campo sensível e ninguém lembrar de bloqueá-lo.

## Consequências

- O que a API aceita fica explícito no esquema. Um campo novo só passa depois de entrar no esquema.
- O frontend precisa enviar exatamente os campos do esquema. Enviar o objeto inteiro de uma pastilha, por exemplo, gera 400.
- As mensagens por campo permitem mostrar o erro ao lado do campo no formulário.
- JSON malformado também responde 400, e corpo acima de 100 kB responde 413.
- Situação em 15/09/2026: o `validar()` e o formato de erro estão na `main` desde o PR #9. Movimentações e alertas validam com `strictObject` desde o PR #18, e pastilhas, fabricantes e fornecedores desde o PR #19. Os dois `it.fails` citados acima viraram testes normais: a quantidade não numérica no PR #18 e o mass assignment no PR #19. A entrega de identidade (#21) valida as rotas de usuários do mesmo jeito, com `.strict()`.
