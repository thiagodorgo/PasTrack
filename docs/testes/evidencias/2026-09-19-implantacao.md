# Implantação em clone limpo, backup e restauração — 19/09/2026

Execução única do [guia de implantação](../../deploy.md) num clone novo do repositório, seguida do backup e da restauração descritos no mesmo guia. Serve de evidência de que o caminho documentado funciona de ponta a ponta.

## Ambiente

| Item              | Valor                                                        |
| ----------------- | ------------------------------------------------------------ |
| Commit implantado | `018474e`                                                    |
| Máquina           | Windows 11 Pro (build 10.0.22631, x64)                       |
| Docker            | Engine 29.6.1, com Docker Compose v2                         |
| Clone             | `git clone` do repositório público, em pasta nova            |
| Instalação        | `.env` gerado a partir do `.env.example`, com segredos novos |

## Implantação

| Passo                                             | Tempo |
| ------------------------------------------------- | ----- |
| `docker compose build --no-cache`                 | 41 s  |
| `docker compose up -d --wait` (primeira subida)   | 10 s  |
| `docker compose up -d --wait` (com o banco vazio) | 9 s   |

Os três containers subiram `healthy` e `GET /api/health` respondeu `{"status":"ok","banco":"ok","versao":"0.2.0"}`.

A meta do plano era subir em até 10 minutos no primeiro build. As imagens base já estavam no cache do Docker desta máquina; numa máquina sem elas, o tempo do download se soma.

## Conferência funcional

`scripts/verificar-implantacao.mjs`, rodado das duas formas documentadas: pelo container da API, sem Node na máquina, e pelo `npm run verificar:implantacao`. As duas terminaram em **20/20 conferências ok**:

- login do administrador, senha do `.env` reconhecida como temporária e rotas comuns respondendo `403` enquanto ela não é trocada;
- troca obrigatória de senha, com o token anterior recusado depois dela;
- cadastro de fabricante, de fornecedor com CNPJ e de pastilha;
- entrada de 10 unidades, saída de 5 levando o saldo ao mínimo e alerta aberto;
- saída acima do saldo recusada com `400`;
- reposição acima do mínimo fechando o alerta sozinha;
- criação de operador com senha temporária, login dele, troca de senha e `403` ao tentar cadastrar pastilha;
- painel respondendo, sem itens críticos depois da reposição.

A proteção do próprio script também foi conferida: rodando de novo na mesma instalação, ele recusa e termina com código 2; sem `--senha`, mostra a ajuda; com o site fora do ar, avisa e termina com código 2.

## Backup e restauração

Seguindo a seção "Backup e restauração" do guia:

1. `pg_dump` dentro do container e cópia para `backups/`: arquivo de 23.737 bytes, terminado corretamente.
2. Depois do backup, uma pastilha nova foi cadastrada pela API, para marcar o estado posterior.
3. Restauração com `docker compose stop web api`, cópia do arquivo, `psql` com `ON_ERROR_STOP=1` e `--single-transaction`, e `docker compose up -d --wait`. Levou 8 s.
4. Conferência depois da restauração:

| O que                             | Resultado                                                           |
| --------------------------------- | ------------------------------------------------------------------- |
| Pastilha cadastrada após o backup | sumiu, como esperado                                                |
| Demais pastilhas                  | voltaram                                                            |
| Movimentações                     | 3, as mesmas do backup                                              |
| Alertas resolvidos                | 2                                                                   |
| Usuários                          | administrador e operador                                            |
| Login                             | funciona com a senha trocada depois da instalação, não com a antiga |
| `GET /api/health`                 | `ok`                                                                |

## Observação

Uma primeira tentativa falhou com `Authentication failed against database server`, porque a máquina ainda tinha o volume `pastrack_dados-banco` de uma instalação anterior, criado com outra `POSTGRES_PASSWORD`. O guia já trata esse caso na tabela de [problemas comuns](../../deploy.md#problemas-comuns). A instalação foi repetida com um volume próprio, e o volume antigo ficou intacto.
