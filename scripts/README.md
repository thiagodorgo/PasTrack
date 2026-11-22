# Scripts do repositório

Scripts em Node.js que apoiam o desenvolvimento e a entrega. Eles não fazem parte do sistema em produção. Todos rodam a partir da raiz do repositório, pelos comandos do [package.json](../package.json) da raiz.

| Script                                                 | Comando                         | Para que serve                                                                          |
| ------------------------------------------------------ | ------------------------------- | --------------------------------------------------------------------------------------- |
| [relatorio-testes.mjs](relatorio-testes.mjs)           | `npm run test:relatorio`        | Roda as suítes e grava a evidência versionada em `tests/results/`.                      |
| [gerar-doc-perfis.mjs](gerar-doc-perfis.mjs)           | `npm run docs:perfis`           | Gera a matriz de perfis em `docs/perfis-e-permissoes.md` a partir do código do backend. |
| [verificar-implantacao.mjs](verificar-implantacao.mjs) | `npm run verificar:implantacao` | Confere uma instalação recém-criada pelo mesmo caminho que o navegador usa.             |
| [lib/relatorio.mjs](lib/relatorio.mjs)                 | usado pelo relatório            | Funções puras do relatório de testes.                                                   |
| `*.test.mjs`                                           | `npm run test:scripts`          | Testes dos próprios scripts.                                                            |

Para passar opções por um comando `npm run`, separe-as com `--`, como em `npm run test:relatorio -- --ajuda`.

## relatorio-testes.mjs

Roda as suítes de teste, junta as saídas de `tests/results/latest/`, sanitiza os arquivos e grava um snapshot em `tests/results/<AAAA-MM-DD>_<sha7>/`. Depois regenera o [HISTORICO.md](../tests/results/HISTORICO.md). O protocolo completo está em [tests/results/README.md](../tests/results/README.md) e a decisão no [ADR-0007](../docs/decisoes/ADR-0007-resultados-de-testes-versionados.md).

```bash
npm run test:relatorio                                   # backend e frontend
npm run test:relatorio -- --suites=backend,frontend,e2e  # inclui o ponta a ponta
npm run test:relatorio -- --sem-executar                 # só consolida o que já está em latest/
```

| Opção             | Efeito                                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| `--suites=LISTA`  | Suítes separadas por vírgula entre `backend`, `frontend` e `e2e`. Padrão: `backend,frontend`.               |
| `--sem-executar`  | Não roda testes nem `npm audit`. Só consolida os arquivos de `latest/` das suítes pedidas.                  |
| `--permitir-sujo` | Aceita alterações não commitadas. O resumo registra "árvore suja". Serve para ensaio, nunca para evidência. |
| `--ajuda`, `-h`   | Mostra a ajuda.                                                                                             |

O que cada suíte executa:

- `backend`: `docker compose -f docker-compose.test.yml up -d --wait`, `npm run test:cov --prefix backend` e, sempre no fim, `docker compose -f docker-compose.test.yml down -v`;
- `frontend`: `npm run test:cov --prefix frontend`;
- `e2e`: sobe o ambiente com `.env.e2e`, `docker-compose.yml` e `docker-compose.e2e.yml`, roda `npm run e2e` e, sempre no fim, executa o `down -v` correspondente.

A falha de uma suíte não interrompe as outras. No fim, o script coleta `npm audit --omit=dev --json` do backend e do frontend e guarda a contagem por severidade.

| Código | Significado                                                                                       |
| -----: | ------------------------------------------------------------------------------------------------- |
|    `0` | Todas as suítes consideradas passaram.                                                            |
|    `1` | Alguma suíte falhou. O snapshot é gravado mesmo assim, marcado como FALHA.                        |
|    `2` | Nada foi gravado: opção inválida, árvore suja ou sanitização reprovada.                           |
|  `130` | A execução foi interrompida com Ctrl+C. Nada foi gravado, e o script ainda derruba os containers. |

Cuidados:

- **O script derruba as pilhas de teste.** O `down -v` no fim da suíte `backend` apaga o banco de teste compartilhado (projeto `pastrack-teste`, porta 5433). Com `e2e`, o mesmo acontece com o ambiente `pastrack-e2e`. Não rode o relatório enquanto outra pessoa ou outro terminal usa essas pilhas.
- **A árvore precisa estar limpa.** Sem `--permitir-sujo`, o script recusa alterações não commitadas, fora de `tests/results/latest/`.
- **Pré-requisitos:** Docker ligado para `backend` e `e2e`, dependências instaladas (`npm run instalar` e `npm ci --prefix e2e`) e acesso à rede para o `npm audit`.
- **Termos proibidos:** a verificação usa um arquivo local, fora do repositório, indicado por `PASTRACK_PADROES` ou, na falta dela, `~/.pastrack-local/padroes.txt`. Sem o arquivo, ela é pulada com um aviso. O formato está no [protocolo de resultados](../tests/results/README.md).

## gerar-doc-perfis.mjs

Lê o objeto `PERMISSOES` de [backend/src/config/permissoes.ts](../backend/src/config/permissoes.ts) e gera a tabela de [docs/perfis-e-permissoes.md](../docs/perfis-e-permissoes.md), com uma linha por ação e uma coluna por perfil. O script lê o texto do arquivo e nunca executa o código TypeScript.

```bash
npm run docs:perfis                   # regrava docs/perfis-e-permissoes.md
npm run docs:perfis -- --verificar    # só confere se o documento está em dia
```

Com `--verificar`, o script não grava nada. Ele sai com código `1` e a mensagem "Documento desatualizado" quando o arquivo difere do que seria gerado. O job `backend` do [workflow de integração](../.github/workflows/ci.yml) roda essa verificação, então quem muda uma permissão precisa rodar `npm run docs:perfis` e commitar o documento junto.

Uma ação nova em `PERMISSOES` também precisa de uma descrição na constante `DESCRICOES` do script. Sem ela, o script recusa gerar o documento.

## verificar-implantacao.mjs

Confere uma instalação recém-criada, pela API, no mesmo caminho que o navegador usa: login do administrador, troca obrigatória de senha, cadastros de fabricante, fornecedor e pastilha, entrada e saída, alerta abrindo e fechando, criação de um operador e o limite do perfil dele. Cada conferência aparece como `ok` ou `FALHA`. O passo a passo está no [guia de implantação](../docs/deploy.md#conferir-a-instalação).

```bash
npm run verificar:implantacao -- --senha <senha do SEED_ADMIN_SENHA>
```

| Opção              | Efeito                                                                |
| ------------------ | --------------------------------------------------------------------- |
| `--senha <senha>`  | Senha do administrador inicial, a do `SEED_ADMIN_SENHA`. Obrigatória. |
| `--url <endereço>` | Endereço do site. Padrão: `http://localhost:8080`.                    |
| `--email <e-mail>` | E-mail do administrador. Padrão: `admin@pastrack.local`.              |
| `--ajuda`, `-h`    | Mostra a ajuda.                                                       |

| Código | Significado                                                                                                  |
| -----: | ------------------------------------------------------------------------------------------------------------ |
|    `0` | Todas as conferências passaram.                                                                              |
|    `1` | Alguma conferência falhou.                                                                                   |
|    `2` | A conferência não começou: falta a senha, o site não respondeu, o login falhou ou a instalação já tem dados. |

Cuidados:

- **Só numa instalação vazia.** O script cadastra dados de conferência e recusa rodar quando já existem pastilhas ou outros usuários além do administrador.
- **A senha do administrador muda.** Se a senha ainda for temporária, o script a troca por `ConfereInstala2026` e avisa no terminal. Troque-a ao terminar.
- **Apague os dados de conferência depois.** Quando tudo passa, o script lembra o comando: `docker compose down -v && docker compose up -d --wait`. Ele apaga o banco inteiro, então só serve antes de cadastrar os dados da empresa.

## lib/relatorio.mjs

Funções puras usadas pelo `relatorio-testes.mjs`: leitura do JUnit e do resumo de cobertura, contagem do `npm audit`, sanitização de caminhos, busca de termos proibidos, leitura das opções, montagem do `resumo.json` e geração do `RESUMO.md` e do `HISTORICO.md`. Nenhuma delas lê disco, rede, relógio ou variáveis de ambiente: tudo chega por parâmetro. Por isso elas são testadas sem Docker e sem banco.

## Testes dos scripts

| Arquivo                                                      | O que testa                                                                                                            |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| [relatorio.test.mjs](relatorio.test.mjs)                     | As funções de `lib/relatorio.mjs`, com saídas reais reduzidas do Vitest e do Playwright.                               |
| [relatorio-seguranca.test.mjs](relatorio-seguranca.test.mjs) | A leitura do JUnit diante de comentários e CDATA montados para enganar a contagem, e o escape das células do Markdown. |
| [gerar-doc-perfis.test.mjs](gerar-doc-perfis.test.mjs)       | A leitura de `PERMISSOES` sem executar o TypeScript, a geração da tabela e a opção `--verificar`.                      |

```bash
npm run test:scripts
```

Os testes usam o executor nativo do Node (`node:test`), sem dependências. O comando roda `node --test scripts/`, que funciona no Node 20, a versão do [.nvmrc](../.nvmrc) e do CI. Em versões mais novas do Node, como a 24, o argumento de pasta não é aceito e o comando falha. Nesse caso, passe o padrão dos arquivos: `node --test "scripts/*.test.mjs"`.
