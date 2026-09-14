# Documentação do PasTrack

Índice da documentação do projeto. A visão geral e o passo a passo de desenvolvimento estão no [README da raiz](../README.md).

## Por onde começar

| Se você quer...                    | Leia                                                |
| ---------------------------------- | --------------------------------------------------- |
| instalar o sistema na empresa      | [Guia de implantação](deploy.md)                    |
| cuidar do sistema no dia a dia     | [Manual de operação](operacao.md)                   |
| entender por que o sistema é assim | [Decisões de arquitetura](decisoes/README.md)       |
| integrar com a API                 | [Contrato da API](api.md)                           |
| conferir a evidência dos testes    | [Resultados dos testes](../tests/results/README.md) |
| saber o que mudou em cada versão   | [CHANGELOG](../CHANGELOG.md)                        |

## Disponível

| Documento                                                   | Conteúdo                                                                                                            |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [arquitetura.png](arquitetura.png)                          | Arquitetura da aplicação em três camadas.                                                                           |
| [mer_conceitual.png](mer_conceitual.png)                    | Modelo conceitual do banco, na notação de Peter Chen.                                                               |
| [mer_logico.png](mer_logico.png)                            | Modelo lógico do banco, com as chaves primárias e estrangeiras.                                                     |
| [api.md](api.md)                                            | Contrato da API REST: convenções, envelope de erro, códigos e as 24 rotas, com as partes em implementação marcadas. |
| [deploy.md](deploy.md)                                      | Implantação com Docker Compose: pré-requisitos, `.env`, rede local, backup, atualização e problemas comuns.         |
| [operacao.md](operacao.md)                                  | Operação: saúde, logs, acesso do administrador, troca de segredos, restauração, atualização e migrations.           |
| [decisoes/](decisoes/README.md)                             | Decisões de arquitetura, do ADR-0001 ao ADR-0008.                                                                   |
| [tests/results/README.md](../tests/results/README.md)       | Estrutura e protocolo dos resultados de testes versionados.                                                         |
| [tests/results/HISTORICO.md](../tests/results/HISTORICO.md) | Histórico das execuções registradas. A primeira é a `2026-09-14_fb30118`.                                           |
| [CHANGELOG.md](../CHANGELOG.md)                             | Registro de mudanças por versão.                                                                                    |

## Em elaboração

Estes documentos ainda não existem:

- `seguranca.md`: segurança do sistema;
- `testes.md`: testes automatizados;
- `banco-de-dados.md`: banco de dados;
- `perfis-e-permissoes.md`: perfis e permissões, a partir da matriz de `backend/src/config/permissoes.ts`;
- `manual-do-usuario.md`: uso do sistema;
- `requisitos.md`: requisitos do sistema;
- `roteiro-demo.md`: roteiro da demonstração.
