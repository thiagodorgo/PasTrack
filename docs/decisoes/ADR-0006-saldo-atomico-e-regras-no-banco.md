# ADR-0006: Saldo atômico e regras no banco

## Situação

Aceita, 14/09/2026.

## Contexto

No MVP, a movimentação lia a pastilha, conferia o saldo na aplicação e só depois atualizava o saldo. Duas SAÍDAS simultâneas da mesma pastilha podiam passar juntas pela conferência e deixar o saldo negativo.

O alerta tinha um problema parecido: duas transações podiam abrir dois alertas para a mesma pastilha.

O banco não tinha nenhuma regra própria. Um script, um SQL manual ou um defeito no código podia gravar saldo negativo ou quantidade zero.

## Decisão

### SAÍDA com update condicional

A baixa do saldo é um único comando, que só atualiza se houver saldo:

```ts
const { count } = await tx.pastilha.updateMany({
  where: { id: pastilhaId, saldoAtual: { gte: quantidade } },
  data: { saldoAtual: { decrement: quantidade } },
});
```

Com `count` igual a zero, o saldo não bastava. A API responde com o erro de saldo insuficiente, e a transação não grava nada.

### Regras no banco

Criadas na migration `20260914130000_seguranca_integridade`:

| Regra                | Nome no banco                          | Garante                                 |
| -------------------- | -------------------------------------- | --------------------------------------- |
| CHECK                | `pastilha_saldo_nao_negativo`          | `saldo_atual >= 0`                      |
| CHECK                | `pastilha_estoque_minimo_nao_negativo` | `estoque_minimo >= 0`                   |
| CHECK                | `movimentacao_quantidade_positiva`     | `quantidade > 0`                        |
| Índice único parcial | `alerta_aberto_por_pastilha`           | no máximo um alerta ABERTO por pastilha |

Antes de criar o índice, a migration fecha os alertas ABERTO duplicados de dados antigos. Fica aberto só o mais recente de cada pastilha.

### Ordem dentro da transação

O `avaliarAlerta` roda depois do update da pastilha, na mesma transação. O update trava a linha da pastilha até o fim da transação. Assim, duas movimentações da mesma pastilha avaliam o alerta uma de cada vez.

O índice parcial é a segunda barreira. Se ainda assim houver disputa, o `createMany` com `skipDuplicates` não cria o segundo alerta.

## Alternativas consideradas

- **Conferir o saldo na aplicação, como no MVP.** Não resiste a requisições simultâneas.
- **Só o CHECK, sem o update condicional.** O saldo nunca ficaria negativo, mas a requisição perdedora terminaria em erro 500, e não numa mensagem de saldo insuficiente.
- **`SELECT ... FOR UPDATE` em SQL escrito à mão.** O Prisma não oferece esse bloqueio na API de consultas, e o SQL manual espalharia consultas cruas pelo código.
- **Isolamento SERIALIZABLE com nova tentativa.** Resolve, mas exige repetir a transação em caso de conflito e complica os testes.

## Consequências

- O saldo nunca fica negativo, mesmo com requisições simultâneas ou com um defeito no código.
- O banco recusa dados inválidos vindos de qualquer caminho, inclusive scripts e SQL manual.
- As regras vivem só no SQL das migrations. O Prisma não as representa, e o `npm run db:verificar` aceita só a diferença do índice parcial ([ADR-0002](ADR-0002-migrations-versionadas-e-docker-compose.md)).
- A validação da API ([ADR-0004](ADR-0004-validacao-com-zod-como-lista-de-permissao.md)) barra os casos comuns antes do banco. Os CHECK são a última barreira.
- Situação em 14/09/2026: os CHECK, o índice parcial e o `avaliarAlerta` já estão na `main`. A SAÍDA com `updateMany` condicional substitui a leitura seguida de atualização nas próximas entregas.
