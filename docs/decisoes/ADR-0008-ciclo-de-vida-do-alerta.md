# ADR-0008: Ciclo de vida do alerta

## Situação

Aceita, 14/09/2026.

## Contexto

No MVP, a SAÍDA que levava o saldo ao estoque mínimo abria um alerta. O único jeito de fechá-lo era a resolução manual:

- a ENTRADA que repunha o estoque deixava o alerta aberto;
- a resolução manual não guardava quem resolveu nem quando;
- resolver um alerta já resolvido gravava de novo, sem aviso;
- mudar o estoque mínimo de uma pastilha não reavaliava o alerta;
- não havia registro das mudanças.

O painel mostrava alertas de itens que já tinham sido repostos.

## Decisão

O alerta segue um ciclo definido. O `avaliarAlerta` (`backend/src/services/estoque/avaliar-alerta.ts`) decide abrir ou fechar, dentro da mesma transação da mudança.

| Evento                                                                 | Resultado                                                                          |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| O saldo chega ao estoque mínimo ou fica abaixo, e não há alerta aberto | Abre um alerta ABERTO.                                                             |
| Uma reposição leva o saldo acima do mínimo, com alerta aberto          | Fecha automaticamente: RESOLVIDO, com `dataResolucao` e com `resolvidoPorId` nulo. |
| ADMINISTRADOR ou GESTOR resolve manualmente                            | RESOLVIDO, com `dataResolucao` e `resolvidoPorId` preenchidos.                     |
| Alguém tenta resolver um alerta já resolvido                           | 409, e nada muda.                                                                  |
| O estoque mínimo da pastilha muda                                      | O alerta é reavaliado com o novo mínimo e abre ou fecha conforme as linhas acima.  |

- Há no máximo um alerta ABERTO por pastilha, garantido pelo índice parcial ([ADR-0006](ADR-0006-saldo-atomico-e-regras-no-banco.md)).
- Só ADMINISTRADOR e GESTOR resolvem manualmente ([ADR-0003](ADR-0003-matriz-de-perfis-e-papel-do-comprador.md)).
- Tudo vai para a tabela `auditoria`, na mesma transação: a abertura (`alerta.aberto`), o fechamento automático (`alerta.resolvido_automaticamente`) e a resolução manual. A auditoria nunca guarda senhas nem hashes.

## Alternativas consideradas

- **Só resolução manual, como no MVP.** O painel acumula alertas de itens já repostos, e o alerta perde valor.
- **Apagar o alerta na reposição.** Perderia o histórico de quando cada item ficou crítico.
- **Permitir vários alertas abertos por pastilha.** Cada SAÍDA abaixo do mínimo abriria um alerta novo, e a lista viraria ruído.

## Consequências

- O painel mostra só o que ainda precisa de reposição.
- O histórico fica completo. Cada alerta resolvido continua na tabela, e `resolvidoPorId` nulo indica fechamento automático.
- O frontend precisa tratar o 409: outra pessoa, ou uma reposição, pode ter fechado o alerta antes.
- Se um alerta for resolvido manualmente com o saldo ainda no mínimo, a próxima movimentação que deixar o saldo no mínimo ou abaixo abre um alerta novo.
- Situação em 14/09/2026: a abertura, o fechamento automático e a auditoria já estão na `main`. A resolução manual com `resolvidoPorId` e 409 e a reavaliação na mudança do estoque mínimo entram nas próximas entregas.
