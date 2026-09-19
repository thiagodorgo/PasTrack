# Tempo de resposta com volume — 19/09/2026

Medição do RNF-07 dos [requisitos](../../requisitos.md): responder em até 2 segundos nas telas de uso diário, na rede local, com o volume esperado na DDA.

A medição foi feita contra uma instalação com Docker Compose, pelo nginx, no mesmo caminho que o navegador usa.

## Massa usada

Maior que o volume esperado na DDA, de propósito:

| O quê                      | Quantidade                             |
| -------------------------- | -------------------------------------- |
| Pastilhas                  | 400, sendo 30 no mínimo ou abaixo dele |
| Movimentações              | 30.000, espalhadas por dois anos       |
| Alertas                    | 137, sendo 37 abertos                  |
| Fabricantes e fornecedores | 8 e 15                                 |

## Ambiente

| Item    | Valor                                                                   |
| ------- | ----------------------------------------------------------------------- |
| Commit  | `f8c93d5`                                                               |
| Máquina | Windows 11 Pro, com Docker Desktop; cliente e servidor na mesma máquina |
| Caminho | `http://localhost:8080`, passando pelo nginx                            |
| Método  | 20 repetições de cada consulta, medindo o tempo total da requisição     |

Cliente e servidor na mesma máquina tiram a rede da conta. Na fábrica, soma-se o tempo da rede local, que numa rede cabeada fica na casa de poucos milissegundos.

## Resultado

Tempos em milissegundos. "Tamanho" é o tamanho da resposta em JSON.

| Consulta                                   | Mediana | p95 | Maior | Tamanho |
| ------------------------------------------ | ------: | --: | ----: | ------: |
| Painel                                     |      10 |  22 |    22 |    4 kB |
| Lista de pastilhas, sem filtro             |      17 |  19 |    19 |  151 kB |
| Busca de pastilha por descrição            |       9 |  11 |    11 |   31 kB |
| Pastilhas críticas                         |       7 |   8 |     8 |   14 kB |
| Histórico recente                          |       9 |  12 |    12 |   32 kB |
| Histórico paginado, 20 por página          |       9 |  11 |    11 |    7 kB |
| Histórico filtrado por pastilha e período  |       8 |   9 |     9 |   12 kB |
| Alertas abertos                            |       7 |  11 |    11 |    9 kB |
| Todos os alertas                           |       9 |  10 |    10 |   27 kB |
| Registrar entrada, com avaliação do alerta |      13 |  18 |    18 |       — |

**Pior p95: 22 ms**, no painel. O alvo do RNF-07 é 2.000 ms, então sobra uma folga de quase cem vezes.

## O que a medição mostrou

- **O RNF-07 está atendido com folga** nesta escala. Nenhuma consulta passou de 22 ms.
- **A lista de pastilhas sem filtro é a resposta mais pesada**, com 151 kB para 400 itens. O tempo do servidor continua baixo, mas essa é a consulta que mais cresce com o cadastro. Se a DDA passar de alguns milhares de pastilhas, ela é a primeira candidata a ganhar paginação.
- **O registro de uma entrada custa pouco mais que uma consulta**, mesmo abrindo transação, travando a linha da pastilha e avaliando o alerta: 13 ms na mediana.
- **O limite por usuário funciona.** A primeira tentativa de medição, com 30 repetições de cada consulta, passou de 300 requisições em um minuto e recebeu `429`, como manda a configuração. A medição foi refeita dentro do limite.

## Como repetir

1. Suba uma instalação limpa e carregue a massa de volume com um `INSERT` em lote, usando `generate_series`.
2. Entre como administrador, troque a senha e meça cada consulta várias vezes, guardando a mediana e o p95.
3. Mantenha cada rodada abaixo de 300 requisições por minuto, por causa do limite por usuário.
