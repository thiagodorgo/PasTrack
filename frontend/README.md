# Front-end do PasTrack

SPA em React do PasTrack. Por ela, o usuário consulta o estoque de pastilhas, registra entradas e saídas, acompanha os alertas de reposição e mantém os cadastros, conforme o que o perfil dele permite. A interface não guarda regra de negócio: ela chama a API e mostra o que a API devolve. Quem decide se uma ação vale é sempre o backend.

Como usar cada tela está no [manual do usuário](../docs/manual-do-usuario.md). Este documento explica como o pacote é organizado e como trabalhar nele.

## Stack

Versões declaradas em [package.json](package.json). O pacote exige Node 20 ou mais novo.

| Uso                 | Pacote                                                                               | Versão                            |
| ------------------- | ------------------------------------------------------------------------------------ | --------------------------------- |
| Interface           | `react`, `react-dom`                                                                 | ^18.3.0                           |
| Rotas               | `react-router-dom`                                                                   | ^7.18.3                           |
| Chamadas à API      | `axios`                                                                              | ^1.12.2                           |
| Ícones              | `lucide-react`                                                                       | ^0.460.0                          |
| Fontes              | `@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono`                  | ^5.1.1, ^5.1.2                    |
| Linguagem           | `typescript`                                                                         | ~5.9.3                            |
| Servidor e build    | `vite`, `@vitejs/plugin-react`                                                       | ^6.4.3, ^4.7.0                    |
| Testes              | `vitest`, `@vitest/coverage-v8`, `jsdom`                                             | ^4.1.11, ^4.1.11, ^27.4.0         |
| Testes de interface | `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` | ^16.3.3, ^14.6.7, ^6.6.0          |
| API simulada        | `msw`                                                                                | ^2.15.0                           |
| Lint                | `eslint`, `typescript-eslint`, `eslint-plugin-jsx-a11y`, `eslint-plugin-react-hooks` | ^9.39.5, ^8.70.0, ^6.10.2, ^7.1.1 |
| Formatação          | `prettier`                                                                           | ^3.9.6                            |

As fontes Inter e JetBrains Mono são importadas em `main.tsx` e entram no próprio build, sem serviço externo.

Em produção, os arquivos gerados pelo Vite são servidos por nginx 1.27 (imagem `nginxinc/nginx-unprivileged:1.27-alpine`).

## Estrutura de pastas

```text
frontend/
  src/
    main.tsx           ponto de entrada: StrictMode, limite de erro e App
    App.tsx            rotas e carregamento sob demanda das páginas
    styles.css         estilos de todas as telas, com o ajuste para telas estreitas
    types.ts           tipos dos dados trocados com a API
    pages/             uma página por rota
    components/        peças reaproveitadas pelas páginas
    contexts/          AuthContext: sessão do usuário
    services/          uma camada por recurso da API, sobre a instância do axios
    utils/             permissões, formatação e regras de senha
  public/              favicon.svg e apple-touch-icon.png, copiados sem mudança para a raiz do build
  tests/               testes com Vitest, Testing Library e MSW
  nginx.conf           servidor da imagem de produção
  Dockerfile           build com Node e imagem final com nginx
  vite.config.ts       proxy de /api em desenvolvimento
  vitest.config.ts     ambiente jsdom, cobertura e relatório JUnit
  eslint.config.js     regras de lint, incluindo acessibilidade
```

### Páginas (`src/pages`)

| Arquivo             | Rota             | O que faz                                                                                                                                                                                                                                                     |
| ------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Login.tsx`         | `/login`         | Formulário de e-mail e senha. Avisa quando a sessão expirou. Com senha temporária, leva direto à troca de senha.                                                                                                                                              |
| `AlterarSenha.tsx`  | `/alterar-senha` | Troca voluntária (pelo menu do usuário, no rodapé do menu lateral) ou obrigatória (senha temporária). Valida o formato antes do envio e grava o token novo devolvido pela API.                                                                                |
| `Painel.tsx`        | `/`              | Cartões com o total de pastilhas, os itens críticos e os alertas abertos; os itens críticos do mais urgente ao menos, cada um com uma barra de nível em CSS (saldo x mínimo) e o botão "Repor" para quem pode `registrarEntrada`; e as últimas movimentações. |
| `Pastilhas.tsx`     | `/pastilhas`     | Lista com busca por código ou descrição e situação de cada item (Normal, Crítico ou Sem mínimo). Cadastro e edição para quem pode `gerenciarPastilhas`.                                                                                                       |
| `Movimentacoes.tsx` | `/movimentacoes` | Registro de entrada (com fornecedor) e de saída, e o histórico das movimentações. O COMPRADOR só vê a opção de entrada.                                                                                                                                       |
| `Alertas.tsx`       | `/alertas`       | Alertas de reposição filtrados por situação (abertos, resolvidos, todos). Quem pode `resolverAlerta` resolve um alerta depois de confirmar.                                                                                                                   |
| `Fabricantes.tsx`   | `/fabricantes`   | Lista de fabricantes. Cadastro e edição para quem pode `gerenciarFabricantes`.                                                                                                                                                                                |
| `Fornecedores.tsx`  | `/fornecedores`  | Lista de fornecedores. Cadastro e edição, com validação do CNPJ no cliente, para quem pode `gerenciarFornecedores`.                                                                                                                                           |
| `Usuarios.tsx`      | `/usuarios`      | Só para o ADMINISTRADOR: criar, editar, desativar, reativar e redefinir a senha. A senha temporária aparece uma única vez, com botão para copiar.                                                                                                             |
| `SemPermissao.tsx`  | `/sem-permissao` | Destino de quem abre uma rota que o perfil não pode ver.                                                                                                                                                                                                      |
| `NaoEncontrado.tsx` | qualquer outra   | Página não encontrada, dentro do layout.                                                                                                                                                                                                                      |

### Componentes (`src/components`)

| Arquivo                   | Para que serve                                                                                                                                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Layout.tsx`              | Estrutura das telas logadas: link para pular ao conteúdo, menu lateral com a marca, filtrado por perfil (recolhido atrás de um botão em telas estreitas), contador de alertas abertos e, no rodapé, o usuário com "Alterar senha" e "Sair". |
| `Logo.tsx`                | Marca do PasTrack: `SimboloPastilha` (a pastilha isométrica em SVG) e `Logo` (símbolo e nome, com o subtítulo opcional). Tema `claro` no menu lateral, `escuro` no login. O guia está em [docs/marca](../docs/marca/README.md).             |
| `Protegido.tsx`           | Guarda de rota. Sem sessão válida vai ao login, com senha temporária vai a `/alterar-senha`, sem permissão para a ação vai a `/sem-permissao`.                                                                                              |
| `SePerfil.tsx`            | Mostra o conteúdo só a quem pode executar uma ação. As páginas atuais usam `pode()` do contexto, que faz a mesma conferência.                                                                                                               |
| `LimiteDeErro.tsx`        | Limite de erro do React: troca a tela em branco por uma mensagem com o botão "Tentar de novo".                                                                                                                                              |
| `Mensagem.tsx`            | Mensagem de erro, sucesso ou informação, anunciada aos leitores de tela.                                                                                                                                                                    |
| `Carregando.tsx`          | Aviso de carregamento com `role="status"`.                                                                                                                                                                                                  |
| `MostrarSenha.tsx`        | Botão que mostra e esconde a senha digitada (ASVS V2.1.12).                                                                                                                                                                                 |
| `TabelaRolavel.tsx`       | Moldura das tabelas largas: rola na horizontal e recebe foco pelo teclado.                                                                                                                                                                  |
| `TabelaMovimentacoes.tsx` | Tabela do histórico na tela de movimentações, com a coluna de documento e fornecedor no modo detalhado.                                                                                                                                     |

### Contexto, serviços, utilitários e tipos

- `contexts/AuthContext.tsx`: o `AuthProvider` e o hook `useAuth`, com `usuario`, `entrar`, `sair`, `atualizarSessao` e `pode`.
- `services/api.ts`: a instância do axios, os interceptadores e as funções que leem o envelope de erro da API.
- `services/sessao.ts`: leitura e gravação da sessão no `localStorage`.
- `services/auth.ts`: login, troca de senha, usuário gravado e a conta de validade do token.
- `services/painel.ts`, `pastilhas.ts`, `movimentacoes.ts`, `alertas.ts`, `cadastros.ts` (fabricantes e fornecedores) e `usuarios.ts`: uma função por rota da API usada pela interface.
- `utils/permissoes.ts`: espelho da matriz de permissões, os perfis e o nome de cada perfil na tela.
- `utils/formato.ts`: CNPJ (normalizar, validar, formatar), data e hora, quantidade com unidade.
- `utils/senha.ts`: regras de formato da política de senha, para avisar antes do envio.
- `types.ts`: tipos dos dados da API, como `Usuario`, `Pastilha`, `Movimentacao`, `Alerta` e `ErroApi`.

## Rotas e carregamento sob demanda

As rotas ficam em [src/App.tsx](src/App.tsx). Cada página é importada com `lazy()` e vira um pacote próprio, baixado só quando a rota abre. Assim o login não baixa o código das telas internas.

Há dois `Suspense`. O de `App.tsx` cobre o login, a troca de senha e o próprio layout. O de `Layout.tsx` cobre as páginas internas, de modo que o menu lateral continua na tela enquanto a página carrega. Nesse ponto, o `LimiteDeErro` recebe a rota como `key`: um erro em uma página some quando o usuário navega para outra.

`/login` é a única rota pública. `/alterar-senha` e o layout ficam dentro de `<Protegido>`. A rota `/usuarios` usa `<Protegido acao="gerenciarUsuarios">`. As demais páginas internas são abertas a todos os perfis, porque todos podem `consultar`; os botões de alteração aparecem conforme o perfil.

O `AuthProvider` fica dentro do `BrowserRouter`, porque ele navega até o login quando a sessão expira.

## Sessão

A sessão fica no `localStorage`, em três chaves: `pastrack:token`, `pastrack:token-recebido-em` e `pastrack:usuario`. O motivo da escolha e o risco aceito estão no [ADR-0005](../docs/decisoes/ADR-0005-token-jwt-no-localstorage-como-risco-aceito.md).

- **Validade do token.** `tokenExpirado` (em `services/auth.ts`) conta a duração do token (`exp - iat`) a partir do instante local em que ele chegou. Um relógio adiantado ou atrasado no posto não encurta nem estica a sessão. A assinatura não é conferida no navegador: quem encerra a sessão de fato é o 401 da API.
- **Sessão recusada pela API.** O interceptador de resposta, ao receber 401 fora do login, limpa a sessão e dispara o evento `pastrack:sessao-expirada`. O `AuthContext` ouve o evento e leva ao login com o aviso "Sua sessão expirou", sem recarregar a página.
- **Troca de senha exigida.** Um 403 com o código `TROCA_SENHA_OBRIGATORIA` dispara `pastrack:troca-senha-obrigatoria`. O contexto marca o usuário e leva a `/alterar-senha`.
- **Outras abas.** O contexto ouve o evento `storage`. Se outra aba sair, esta também sai. Se outra aba entrar com outro usuário ou receber um token novo, esta segue a sessão nova a partir do painel.
- **Dado gravado inválido.** Um usuário gravado ilegível ou fora do formato esperado não derruba a tela: a sessão é limpa e o usuário volta ao login.

## Permissões na interface

[src/utils/permissoes.ts](src/utils/permissoes.ts) é um espelho da matriz do backend ([backend/src/config/permissoes.ts](../backend/src/config/permissoes.ts)). Ele tem as mesmas oito ações: `consultar`, `gerenciarPastilhas`, `gerenciarFabricantes`, `gerenciarFornecedores`, `registrarEntrada`, `registrarSaida`, `resolverAlerta` e `gerenciarUsuarios`. A matriz completa, por perfil, está em [docs/perfis-e-permissoes.md](../docs/perfis-e-permissoes.md).

O espelho serve só para esconder o que o perfil não pode fazer. Ele é usado em três lugares:

- no menu de `Layout.tsx`, onde cada item tem uma ação;
- em `<Protegido acao="...">`, nas rotas restritas;
- nas páginas, por `pode("acao")` do `useAuth`, para mostrar ou esconder botões e opções.

Esconder um botão não protege nada. A API confere o perfil em toda rota e responde 403 a quem não pode. Para o espelho não se afastar da matriz real, [tests/utils/permissoes.spec.ts](tests/utils/permissoes.spec.ts) guarda uma cópia da matriz do backend, feita à mão, e falha quando o espelho difere dela. Uma mudança feita só em `backend/src/config/permissoes.ts` não é detectada por esse teste, por isso a cópia precisa mudar junto.

## Acesso à API

Toda chamada passa pela instância `api` de [src/services/api.ts](src/services/api.ts):

- `baseURL` vem de `VITE_API_URL`; sem valor, vale `/api`;
- tempo limite de 8 segundos por requisição;
- o interceptador de requisição envia `Authorization: Bearer <token>` quando há sessão;
- o interceptador de resposta trata o 401 e o 403 de troca de senha, como descrito em [Sessão](#sessão).

As páginas não chamam o axios direto. Elas usam as funções de `services/` e tratam o erro com três funções de `api.ts`:

- `mensagemDeErro(erro)`: o texto para mostrar, separando tempo esgotado, falta de conexão, mensagem do servidor e erro inesperado;
- `camposDoErro(erro)`: os erros por campo do 400 de validação, para mostrar cada um junto do campo;
- `codigoDoErro(erro)`: o código estável do erro, como `DUPLICADO`.

O formato das respostas e dos erros está no [contrato da API](../docs/api.md).

Em desenvolvimento, o Vite encaminha `/api` para `http://localhost:3333` ([vite.config.ts](vite.config.ts)). No Docker, quem faz esse papel é o nginx. Nos dois casos o navegador chama a API na mesma origem da página.

## Build de produção

O [Dockerfile](Dockerfile) tem duas etapas:

1. `node:20-bookworm-slim` roda `npm ci` e `VITE_API_URL=/api npm run build`, que gera `dist/`;
2. `nginxinc/nginx-unprivileged:1.27-alpine` recebe `dist/` e o [nginx.conf](nginx.conf), roda sem root e escuta na porta 8080.

No `docker-compose.yml` da raiz, o serviço `web` publica essa porta em `${WEB_PORTA:-8080}`. O [guia de implantação](../docs/deploy.md) descreve a subida completa.

O que o [nginx.conf](nginx.conf) faz:

- encaminha `/api/` para `http://api:3333`, o container da API, e resolve o nome `api` de novo a cada 10 segundos pelo DNS interno do Docker, para continuar funcionando quando o container é recriado;
- serve `/assets/` com `Cache-Control: public, max-age=31536000, immutable`, porque esses arquivos têm hash no nome, e devolve 404 para um arquivo ausente;
- serve `index.html` com `no-cache`, para uma versão nova chegar na próxima abertura;
- devolve `index.html` em qualquer outra rota, e o React Router assume;
- comprime com gzip, esconde a versão do nginx (`server_tokens off`) e limita o corpo da requisição a 1 MB.

Cabeçalhos de segurança enviados em toda resposta:

| Cabeçalho                 | Valor                                                                                                                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `X-Content-Type-Options`  | `nosniff`                                                                                                                                                                                                            |
| `Referrer-Policy`         | `strict-origin-when-cross-origin`                                                                                                                                                                                    |
| `X-Frame-Options`         | `DENY`                                                                                                                                                                                                               |
| `Permissions-Policy`      | `camera=(), microphone=(), geolocation=()`                                                                                                                                                                           |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'` |

O acesso é por HTTP na rede local, por isso não há HSTS nem `upgrade-insecure-requests`. Os controles e riscos de segurança estão em [docs/seguranca.md](../docs/seguranca.md).

## Scripts

Rodados dentro de `frontend/`, ou da raiz com `--prefix frontend`.

| Script                 | O que faz                                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| `npm run dev`          | Servidor do Vite em http://localhost:5173, com o proxy de `/api`.                                         |
| `npm run build`        | Gera os arquivos de produção em `dist/`.                                                                  |
| `npm run preview`      | Serve o conteúdo de `dist/` localmente, para conferir o build.                                            |
| `npm run typecheck`    | Confere os tipos com `tsconfig.json` (código e testes) e `tsconfig.node.json` (arquivos de configuração). |
| `npm run lint`         | ESLint em todo o pacote.                                                                                  |
| `npm run lint:fix`     | ESLint com correção automática do que for possível.                                                       |
| `npm run format`       | Formata os arquivos com o Prettier.                                                                       |
| `npm run format:check` | Confere a formatação sem alterar nada.                                                                    |
| `npm test`             | Roda os testes uma vez.                                                                                   |
| `npm run test:cov`     | Roda os testes com cobertura.                                                                             |

Na raiz, `npm run dev:frontend` sobe o Vite, e `npm run lint`, `npm run typecheck`, `npm run build` e `npm run test:tudo` rodam backend e frontend juntos.

## Variáveis de ambiente

Uma só, em [.env.example](.env.example):

| Variável       | Padrão | Uso                                                                                                              |
| -------------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| `VITE_API_URL` | `/api` | Endereço base da API. Com `/api`, as chamadas vão para a mesma origem e o proxy do Vite ou o nginx as encaminha. |

O Vite grava o valor no código durante o build, então ele não é segredo e mudar o `.env` exige um build novo. O `Dockerfile` já fixa `VITE_API_URL=/api`.

## Como rodar localmente

Com a API rodando em http://localhost:3333 (passo a passo no [README da raiz](../README.md#modo-de-desenvolvimento) e no [CONTRIBUTING](../CONTRIBUTING.md#desenvolvimento-local)):

```bash
cd frontend
cp .env.example .env
npm ci
npm run dev
```

A aplicação abre em http://localhost:5173. Para entrar, use o administrador criado pelo seed ou, com os dados de demonstração carregados, um dos usuários de cada perfil, listados em [Usuários de demonstração](../README.md#usuários-de-demonstração).

## Testes

Os testes não precisam de banco nem de API: o MSW intercepta as requisições e responde com dados simulados. Na última execução registrada (`2026-09-19_17e4380`, em [tests/results/HISTORICO.md](../tests/results/HISTORICO.md)), os 300 testes do frontend passaram, com cobertura de linhas de 97,14%.

```bash
npm test
npm run test:cov
```

O `vitest.config.ts` grava o relatório JUnit em `tests/results/latest/frontend-junit.xml` e a cobertura em `tests/results/latest/frontend-coverage/`, na raiz do repositório. O protocolo dessas evidências está em [tests/results/README.md](../tests/results/README.md), e a estratégia geral em [docs/testes.md](../docs/testes.md).

### Organização de `tests/`

| Caminho                                           | Conteúdo                                                                                                                                                                           |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `setup.ts`                                        | Liga o servidor do MSW (requisição sem handler falha o teste), limpa handlers, dados simulados e `localStorage` após cada teste, e simula o `ResizeObserver`, que o jsdom não tem. |
| `App.spec.tsx`                                    | Rotas: redirecionamentos sem sessão, sessão expirada, perfil sem permissão, página não encontrada.                                                                                 |
| `fluxos.spec.tsx`                                 | Fluxos que passam por mais de uma tela, como senha temporária até o painel e sessão que expira durante o uso.                                                                      |
| `pages/`, `components/`, `contexts/`, `services/` | Testes das páginas, dos componentes, do `AuthContext` e dos serviços, com o mesmo nome do arquivo testado.                                                                         |
| `utils/*.spec.ts`                                 | Testes de `permissoes`, `formato` e `senha`.                                                                                                                                       |
| `utils/renderizar.tsx`                            | `renderizar(ui, { initialEntries })`: renderiza dentro de `MemoryRouter` e `AuthProvider` e devolve o `userEvent`.                                                                 |
| `utils/sessao.ts`, `jwt.ts`                       | `iniciarSessao(usuario)` grava no `localStorage` a mesma sessão do login; `criarTokenValido` e `criarTokenExpirado` montam os tokens.                                              |
| `utils/requisicoes.ts`                            | `capturarErro`, `capturarUrls` e `capturarCorpos`, para conferir o que a tela enviou à API.                                                                                        |
| `utils/console.ts`                                | `silenciarErrosDeRenderizacao`, para os testes do limite de erro.                                                                                                                  |
| `mocks/handlers/`                                 | Um arquivo de handlers por recurso da API, reunidos em `index.ts`. Os usuários de exemplo de cada perfil ficam em `auth.ts`.                                                       |
| `mocks/acesso.ts`                                 | Envelope de erro da API e `recusarAcesso`, que responde 401 ou 403 usando a mesma matriz de `utils/permissoes.ts`.                                                                 |

### Convenções

- O nome do teste é uma frase em português que descreve o comportamento: "o OPERADOR não vê os botões de cadastro e edição".
- Os elementos são buscados por papel e nome acessível (`getByRole("button", { name: "Novo fabricante" })`, `getByLabelText`), nunca por classe de CSS. Assim o teste continua valendo quando o visual muda e também confere que a tela é acessível.
- As interações usam o `userEvent` devolvido por `renderizar`.
- O comportamento por perfil é testado com `it.each`, um caso para cada perfil.
- Para simular um erro da API num teste, use `server.use(...)` com o handler da situação; o `setup.ts` desfaz a troca ao final.

## Acessibilidade

- O `eslint-plugin-jsx-a11y` roda com as regras recomendadas em todo `npm run lint`.
- O `index.html` declara `lang="pt-BR"`.
- O layout tem o link "Pular para o conteúdo", que leva o foco ao `<main>`, e o menu é um `<nav>` com `aria-label`. O botão que abre o menu em telas estreitas usa `aria-expanded` e `aria-controls`.
- Toda tabela tem `<caption>` (visível só aos leitores de tela) e cabeçalhos com `scope="col"`. As tabelas largas ficam dentro de `TabelaRolavel`, uma região com nome e `tabIndex={0}`: sem isso, quem usa só o teclado não consegue rolar a tabela (WCAG 2.1.1).
- `Mensagem` usa `role="alert"` para erros, anunciados na hora, e `role="status"` com `aria-live="polite"` para sucesso e informação. `Carregando` usa `role="status"`.
- Os erros de validação ficam ligados ao campo por `aria-describedby`, o campo com erro recebe `aria-invalid` e o foco vai até ele.
- Ao abrir um formulário, uma confirmação ou o aviso de senha temporária, o foco vai até ele. Ao fechar um formulário, o foco volta ao botão que o abriu.
- `MostrarSenha` usa `aria-pressed` e `aria-controls`.

## Como adicionar uma nova tela

1. Crie `src/pages/NovaTela.tsx` exportando uma função com o mesmo nome (`export function NovaTela()`), com um `<h1>` no topo.
2. Se a tela chama a API, crie as funções em `src/services/` usando a instância `api`, e os tipos da resposta em `src/types.ts`. A página não importa o axios.
3. Em `src/App.tsx`, importe a página com `lazy()`, no mesmo formato das outras, e adicione a `<Route>` dentro da rota do `Layout`. Se só alguns perfis podem abrir a tela, envolva o elemento em `<Protegido acao="...">`.
4. Em `src/components/Layout.tsx`, adicione o item em `ITENS_DO_MENU` com a ação que libera a tela e um ícone do `lucide-react`.
5. Se a tela precisa de uma ação nova, ela nasce no backend (`backend/src/config/permissoes.ts`). Depois, copie para `PERMISSOES` em `src/utils/permissoes.ts`, atualize a cópia em `tests/utils/permissoes.spec.ts` e rode `npm run docs:perfis` na raiz para regenerar [docs/perfis-e-permissoes.md](../docs/perfis-e-permissoes.md).
6. Esconda os botões de alteração com `pode("acao")` do `useAuth` (ou `<SePerfil>`).
7. Use os componentes existentes: `Carregando` enquanto busca, `Mensagem` para o retorno, `TabelaRolavel` com `<caption>` para tabelas, `mensagemDeErro` e `camposDoErro` para os erros da API.
8. Nos testes, crie os handlers do recurso em `tests/mocks/handlers/` e registre em `index.ts`; se o handler guarda estado, inclua a função de reinício em `reiniciarDadosSimulados`. Nas alterações, chame `recusarAcesso` com a ação.
9. Escreva `tests/pages/NovaTela.spec.tsx`, cobrindo o que cada perfil vê, e o caso da rota em `tests/App.spec.tsx` se ela for restrita.
10. Rode `npm run lint`, `npm run typecheck` e `npm run test:cov`, e descreva a tela no [manual do usuário](../docs/manual-do-usuario.md).

## Veja também

- [Manual do usuário](../docs/manual-do-usuario.md): como usar cada tela.
- [Arquitetura](../docs/arquitetura.md): as camadas do sistema e o caminho de uma requisição.
- [Contrato da API](../docs/api.md): rotas, envelope de erro e códigos.
- [Testes](../docs/testes.md): estratégia e como rodar cada suíte.
- [CONTRIBUTING](../CONTRIBUTING.md): ambiente, fluxo de branches e commits.
