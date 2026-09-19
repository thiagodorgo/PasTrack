# Requisitos do PasTrack

O que o sistema precisa fazer e sob quais condições. Cada requisito tem um código, usado no [plano de testes](testes/plano-de-testes.md) para mostrar o que prova o quê.

## Contexto

A DDA Usinagem Industrial controla em planilha o estoque de pastilhas de corte. A planilha fica num computador, é editada por várias pessoas e não avisa quando um item chega ao fim. As consequências são a parada de máquina por falta de pastilha, a compra em duplicidade e a dificuldade de saber quem deu baixa em quê.

O PasTrack substitui essa planilha por um sistema web instalado na rede da empresa, com acesso por perfil, saldo calculado a partir das movimentações e alerta automático de reposição.

## Escopo

**Dentro:** cadastro de pastilhas, fabricantes, fornecedores e usuários; entradas e saídas com validação de saldo; alerta de estoque mínimo; painel; histórico de movimentações; trilha de auditoria; instalação com Docker Compose na rede local.

**Fora:** compra e cotação com fornecedor, integração com ERP, leitura de código de barras, controle por lote ou por número de série, custo e valorização de estoque, aplicativo para celular e acesso pela internet.

## Atores

| Ator              | Quem é na fábrica                          | O que faz no sistema                               |
| ----------------- | ------------------------------------------ | -------------------------------------------------- |
| **ADMINISTRADOR** | responsável pelo sistema                   | tudo, mais a gestão de usuários                    |
| **GESTOR**        | encarregado da produção ou do almoxarifado | cadastros, entradas, saídas e resolução de alertas |
| **OPERADOR**      | operador de máquina                        | entradas e saídas; consulta o resto                |
| **COMPRADOR**     | responsável pelas compras                  | cadastro de fornecedores e entradas; não dá baixa  |

A matriz completa, gerada a partir do código, está em [perfis-e-permissoes.md](perfis-e-permissoes.md).

## Requisitos funcionais

### Acesso e contas

| Código | Requisito                                                                                     | Perfis        |
| ------ | --------------------------------------------------------------------------------------------- | ------------- |
| RF-01  | Entrar no sistema com e-mail e senha, e sair quando quiser                                    | todos         |
| RF-02  | Trocar a própria senha                                                                        | todos         |
| RF-03  | Ser obrigado a trocar a senha no primeiro acesso e depois de uma redefinição                  | todos         |
| RF-04  | Cadastrar usuário, escolhendo o perfil, e receber uma senha temporária mostrada uma única vez | ADMINISTRADOR |
| RF-05  | Alterar o nome e o perfil de um usuário                                                       | ADMINISTRADOR |
| RF-06  | Ativar e desativar um usuário, sem apagá-lo                                                   | ADMINISTRADOR |
| RF-07  | Redefinir a senha de outro usuário                                                            | ADMINISTRADOR |
| RF-08  | Recuperar o acesso do administrador pelo servidor, quando ninguém mais consegue entrar        | ADMINISTRADOR |

### Cadastros

| Código | Requisito                                                                                               | Perfis                           |
| ------ | ------------------------------------------------------------------------------------------------------- | -------------------------------- |
| RF-09  | Cadastrar e alterar fabricante, com nome único                                                          | ADMINISTRADOR, GESTOR            |
| RF-10  | Cadastrar e alterar fornecedor, com CNPJ validado e único, e contato                                    | ADMINISTRADOR, GESTOR, COMPRADOR |
| RF-11  | Cadastrar pastilha com código único, descrição, modelo, aplicação, unidade, estoque mínimo e fabricante | ADMINISTRADOR, GESTOR            |
| RF-12  | Alterar a pastilha, inclusive o estoque mínimo, sem poder editar o saldo                                | ADMINISTRADOR, GESTOR            |
| RF-13  | Consultar pastilhas com busca por código ou descrição e filtro de itens críticos                        | todos                            |

### Movimentação de estoque

| Código | Requisito                                                                                     | Perfis                          |
| ------ | --------------------------------------------------------------------------------------------- | ------------------------------- |
| RF-14  | Registrar entrada, informando o fornecedor, a quantidade e, se quiser, documento e observação | todos                           |
| RF-15  | Registrar saída, informando a quantidade e, se quiser, documento e observação                 | ADMINISTRADOR, GESTOR, OPERADOR |
| RF-16  | Ver o histórico de movimentações com filtro por pastilha, tipo e período, e com paginação     | todos                           |
| RF-17  | Corrigir um lançamento errado por um lançamento inverso, com observação citando o original    | conforme RF-14 e RF-15          |

### Alertas

| Código | Requisito                                                                       | Perfis                |
| ------ | ------------------------------------------------------------------------------- | --------------------- |
| RF-18  | Abrir alerta sozinho quando o saldo chega ao estoque mínimo ou fica abaixo dele | automático            |
| RF-19  | Fechar o alerta sozinho quando a reposição leva o saldo acima do mínimo         | automático            |
| RF-20  | Consultar os alertas por situação: abertos, resolvidos ou todos                 | todos                 |
| RF-21  | Resolver um alerta à mão, com confirmação                                       | ADMINISTRADOR, GESTOR |

### Painel e rastreabilidade

| Código | Requisito                                                                                            | Perfis |
| ------ | ---------------------------------------------------------------------------------------------------- | ------ |
| RF-22  | Ver no painel o total de pastilhas, os alertas abertos, os itens críticos e as últimas movimentações | todos  |
| RF-23  | Saber, em cada movimentação, quem registrou, quando, de qual pastilha e com qual documento           | todos  |
| RF-24  | Ter registro de quem criou ou alterou cadastros, senhas e alertas, guardado no banco                 | —      |

## Regras de negócio

| Código | Regra                                                                                                        |
| ------ | ------------------------------------------------------------------------------------------------------------ |
| RN-01  | O saldo nunca fica negativo: a saída maior que o saldo é recusada, mesmo com dois lançamentos ao mesmo tempo |
| RN-02  | O saldo só muda por movimentação; nenhum cadastro edita o saldo direto                                       |
| RN-03  | A entrada exige um fornecedor existente; a saída não aceita fornecedor                                       |
| RN-04  | O estoque mínimo zero desliga o alerta: a pastilha não gera alerta nem entra nos itens críticos              |
| RN-05  | Cada pastilha tem no máximo um alerta aberto por vez                                                         |
| RN-06  | Mudar o estoque mínimo reavalia o alerta da pastilha na hora                                                 |
| RN-07  | Movimentação não é apagada nem editada; a correção é um lançamento inverso                                   |
| RN-08  | O sistema nunca fica sem administrador ativo: não se desativa nem se rebaixa o último                        |
| RN-09  | A senha tem no mínimo 12 caracteres, com letra e número, e não pode conter o e-mail nem ser uma senha comum  |
| RN-10  | Trocar a senha, redefini-la, mudar o perfil ou desativar o usuário derruba na hora as sessões abertas dele   |
| RN-11  | O usuário que sai da empresa é desativado, não apagado, porque o nome dele aparece no histórico              |

## Requisitos não funcionais

| Código | Requisito                                                                                                                                  | Como é verificado                                                                 |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| RNF-01 | Rodar numa máquina da empresa com Docker Compose, servindo os outros computadores pela rede local                                          | [evidência da implantação](testes/evidencias/2026-09-19-implantacao.md)           |
| RNF-02 | Subir numa máquina nova com um comando, depois de preencher o `.env`                                                                       | mesma evidência, e o `compose-smoke` do CI                                        |
| RNF-03 | Ter backup e restauração documentados e testados                                                                                           | mesma evidência                                                                   |
| RNF-04 | Acesso por perfil, aplicado no servidor                                                                                                    | [segurança](seguranca.md) e os testes de permissão                                |
| RNF-05 | Atender o ASVS 4.0.3 nível 1 nos itens aplicáveis, com cada desvio registrado                                                              | [autoavaliação](seguranca/asvs-l1-checklist.md)                                   |
| RNF-06 | Guardar senha só em hash, e nunca registrar senha ou token em log                                                                          | testes de política de senha e do logger                                           |
| RNF-07 | Responder em até 2 segundos nas telas de uso diário, na rede local, com o volume da DDA: centenas de pastilhas e milhares de movimentações | [medição de 19/09](testes/evidencias/2026-09-19-desempenho.md): pior p95 de 22 ms |
| RNF-08 | Funcionar no Chrome, no Edge e no Firefox atuais, em tela de 1366 px ou mais                                                               | uso manual; o vídeo dos testes mostra a navegação                                 |
| RNF-09 | Ser operável pelo teclado, com rótulo em cada campo e aviso em região viva                                                                 | os testes de tela consultam por papel e por rótulo acessível                      |
| RNF-10 | Ter interface e mensagens em português do Brasil                                                                                           | revisão de código e testes que fixam as mensagens                                 |
| RNF-11 | Manter as suítes automatizadas verdes a cada mudança, com evidência versionada                                                             | CI obrigatório e [tests/results/](../tests/results/README.md)                     |
| RNF-12 | Registrar as decisões de arquitetura                                                                                                       | [ADRs](decisoes/README.md)                                                        |

## O que fica para depois

Itens levantados e deixados de fora desta entrega, para não atrasar o essencial:

- exportação do histórico em CSV ou Excel;
- estorno formal de movimentação, com aprovação;
- controle por lote e por vida útil da pastilha;
- indicadores de consumo por máquina ou por ordem de serviço;
- acesso pela internet, com TLS e segundo fator;
- aviso de reposição por e-mail.
