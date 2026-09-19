# Casos manuais de movimentação — 19/09/2026

Sessão de teste pelo navegador, cobrindo os 20 casos de registro de movimentação do [plano de testes](../plano-de-testes.md). Todos foram aprovados.

Cada caso foi conferido em três pontos: o que a tela mostrou, o que a API respondeu e o que ficou gravado no banco. A sessão foi gravada em vídeo, guardado fora do repositório por causa do tamanho.

## Ambiente

| Item           | Valor                                                                                                    |
| -------------- | -------------------------------------------------------------------------------------------------------- |
| Commit testado | `be33ae5`                                                                                                |
| Instalação     | Docker Compose, com uma cópia da `main`, em portas próprias                                              |
| Navegador      | Chromium, em 1280 × 720                                                                                  |
| Massa de teste | 5 pastilhas, 2 fabricantes, 2 fornecedores e movimentações de 11 a 17/09, restauradas antes de cada caso |
| Perfis usados  | OPERADOR nos casos de registro e COMPRADOR no caso de permissão                                          |

## Resultado

| Caso | O que foi feito                                           | O que aconteceu                                                                         | Veredito |
| ---- | --------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------- |
| T01  | Abrir a tela de movimentações                             | Formulário e histórico carregados, com as colunas esperadas                             | aprovado |
| T02  | Entrada de 5 unidades, com fornecedor                     | `201`, "Saldo atual do item: 15"                                                        | aprovado |
| T03  | Entrada sem escolher o fornecedor                         | Bloqueado no campo Fornecedor: "Selecione um item da lista."                            | aprovado |
| T04  | Saída de 4 unidades                                       | `201`, "Saldo atual do item: 6"                                                         | aprovado |
| T05  | Saída igual ao saldo                                      | `201`, "Saldo atual do item: 0"                                                         | aprovado |
| T06  | Saída acima do saldo                                      | `400`, "Saldo insuficiente: há 10 un em estoque"                                        | aprovado |
| T07  | Entrada de 1 unidade                                      | `201`, "Saldo atual do item: 11"                                                        | aprovado |
| T08  | Quantidade zero                                           | Bloqueado no campo Quantidade: "O valor deve ser maior ou igual a 1."                   | aprovado |
| T09  | Entrada de 1.000.000                                      | `201`, "Saldo atual do item: 1.000.000"                                                 | aprovado |
| T10  | Quantidade acima do máximo                                | Bloqueado: "O valor deve ser menor ou igual a 1000000."                                 | aprovado |
| T11  | Quantidade fracionária                                    | Bloqueado: "Insira um valor válido. Os dois valores válidos mais próximos são 1 e 2."   | aprovado |
| T12  | Saída com documento e observação em branco                | `201`, "Saldo atual do item: 8"; os dois campos ficam nulos e a tabela mostra "-"       | aprovado |
| T13  | Saída com documento de 100 e observação de 500 caracteres | `201`, "Saldo atual do item: 9"; o caractere além do limite é recusado pelo campo       | aprovado |
| T14  | COMPRADOR abre o campo Tipo e registra                    | O campo só oferece "Entrada"; a entrada de 3 unidades vai a `201`, com saldo 13         | aprovado |
| T15  | Saída que leva P3 ao estoque mínimo                       | `201`, saldo 5, alerta **aberto** no banco e listado na tela de alertas                 | aprovado |
| T16  | Entrada que repõe P4 acima do mínimo                      | `201`, saldo 6, alerta **resolvido** automaticamente e mostrado no filtro de resolvidos | aprovado |
| T17  | Saída sem escolher a pastilha                             | Bloqueado no campo Pastilha: "Selecione um item da lista."                              | aprovado |
| T18  | Saída de pastilha com saldo zero                          | `400`, "Saldo insuficiente: há 0 un em estoque"                                         | aprovado |
| T19  | Quantidade negativa                                       | Bloqueado: "O valor deve ser maior ou igual a 1."                                       | aprovado |
| T20  | Quantidade vazia                                          | Bloqueado: "Preencha este campo."                                                       | aprovado |

**Casos aprovados: 20 de 20.**

## O que a sessão mostrou

- As validações do formulário evitam a maior parte dos erros antes de chegar à API: 7 dos 20 casos param no navegador, com a mensagem do próprio campo.
- As regras que dependem do estado do estoque, como saldo insuficiente, são decididas no servidor e voltam como `400`, com a quantidade disponível na mensagem.
- O ciclo do alerta funciona de ponta a ponta na tela: a saída que leva ao mínimo abre o alerta, e a entrada que repõe acima do mínimo o fecha, com a resolução registrada como automática.
- O limite do perfil aparece na interface, e não só na API: para o COMPRADOR, o campo Tipo só oferece a entrada.
