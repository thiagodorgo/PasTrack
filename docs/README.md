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
| [arquitetura.md](arquitetura.md)                            | Arquitetura: camadas da API, caminho de uma requisição, registro de movimentação e organização das pastas.          |
| [arquitetura.png](arquitetura.png)                          | Arquitetura da aplicação em três camadas.                                                                           |
| [banco-de-dados.md](banco-de-dados.md)                      | Banco de dados: relações, dicionário de dados, restrições, índices e política de migrations.                        |
| [perfis-e-permissoes.md](perfis-e-permissoes.md)            | Matriz de perfis por ação, gerada a partir de `backend/src/config/permissoes.ts` com `npm run docs:perfis`.         |
| [mer_conceitual.png](mer_conceitual.png)                    | Modelo conceitual do banco, na notação de Peter Chen.                                                               |
| [mer_logico.png](mer_logico.png)                            | Modelo lógico do banco, com as chaves primárias e estrangeiras.                                                     |
| [api.md](api.md)                                            | Contrato da API REST: convenções, envelope de erro, códigos e as 24 rotas, com as partes em implementação marcadas. |
| [deploy.md](deploy.md)                                      | Implantação com Docker Compose: pré-requisitos, `.env`, rede local, backup, atualização e problemas comuns.         |
| [operacao.md](operacao.md)                                  | Operação: saúde, logs, acesso do administrador, troca de segredos, restauração, atualização e migrations.           |
| [decisoes/](decisoes/README.md)                             | Decisões de arquitetura, do ADR-0001 ao ADR-0008.                                                                   |
| [tests/results/README.md](../tests/results/README.md)       | Estrutura e protocolo dos resultados de testes versionados.                                                         |
| [tests/results/HISTORICO.md](../tests/results/HISTORICO.md) | Histórico das execuções registradas. A primeira é a `2026-09-14_fb30118`.                                           |
| [CHANGELOG.md](../CHANGELOG.md)                             | Registro de mudanças por versão.                                                                                    |
| [CONTRIBUTING.md](../CONTRIBUTING.md)                       | Como contribuir: ambiente, testes, fluxo de branches e commits, migrations e estilo.                                |
| [SECURITY.md](../SECURITY.md)                               | Como relatar uma vulnerabilidade, versões suportadas, controles em uso e riscos aceitos.                            |

## Em elaboração

Estes documentos ainda não existem:

- `seguranca.md`: segurança do sistema;
- `testes.md`: testes automatizados;
- `manual-do-usuario.md`: uso do sistema;
- `requisitos.md`: requisitos do sistema;
- `roteiro-demo.md`: roteiro da demonstração.
