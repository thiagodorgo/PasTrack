# Ensaio do roteiro da demonstração — 19/09/2026

Conferência de que cada afirmação do [roteiro da demonstração](../../roteiro-demo.md) é verdade numa instalação real. O ensaio percorre os mesmos passos do roteiro pela API, no mesmo estado em que a apresentação começa.

Isto confere os **fatos** do roteiro, não a apresentação em si. O ensaio com a pessoa que vai apresentar continua necessário.

## Ambiente

| Item       | Valor                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------ |
| Commit     | `c635045`                                                                                        |
| Instalação | Docker Compose em clone limpo, com `SEED_DEMO=true`                                              |
| Estado     | o do preparo do roteiro: 2 fabricantes, 2 fornecedores, 3 pastilhas e 3 usuários de demonstração |

## Resultado: 26 de 26 conferências

| Passo do roteiro     | O que foi conferido                                                                                                                                                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2. Primeiro acesso   | A senha do administrador nasce temporária, e a troca obrigatória funciona.                                                                                                                                                    |
| 3. Painel            | Abre com 1 alerta aberto e com a WNMG entre os itens críticos.                                                                                                                                                                |
| 4. Pastilhas         | A WNMG começa com saldo 6 e mínimo 8, e a busca por "wnmg" acha a pastilha.                                                                                                                                                   |
| 5. Ciclo do estoque  | O operador de demonstração entra direto; a entrada de 5 leva o saldo a 11 e **resolve o alerta sozinha**; a saída de 3 volta para 8 e **reabre o alerta**; a saída de 100 é recusada com a quantidade disponível na mensagem. |
| 6. Alertas           | A resolução automática fica registrada sem responsável; a resolução manual funciona e **não muda o saldo**.                                                                                                                   |
| 7. Permissões        | O operador recebe `403` ao cadastrar pastilha e ao listar usuários; o comprador recebe `403` na saída.                                                                                                                        |
| 8. Usuários e sessão | O usuário novo vem com senha temporária; ao desativar o operador, a sessão aberta dele cai na hora, com `401 SESSAO_INVALIDA`.                                                                                                |

## Observações para quem apresentar

- O ciclo do alerta funciona nos dois sentidos com a WNMG, como o roteiro promete: a entrada fecha e a saída reabre. É o momento mais forte da demonstração, e vale narrá-lo devagar.
- A queda da sessão do operador é instantânea: a janela dele responde no primeiro clique depois da desativação. Não é preciso esperar nem recarregar.
- Depois do ensaio, zere a instalação antes da apresentação de verdade, com `docker compose down -v` seguido de `docker compose up -d --wait`. O ensaio deixa dados criados e a senha do administrador trocada.
