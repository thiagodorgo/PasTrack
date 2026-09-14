# Contrato da API do PasTrack

Este documento descreve a API REST do backend: o que já funciona hoje e as mudanças aprovadas para esta semana. O frontend e os testes se guiam por ele.

Itens marcados com **(em implementação)** fazem parte do contrato, mas ainda não foram entregues. O resto descreve o comportamento atual do código em `backend/src`.

## 1. Convenções

- **Base:** todas as rotas ficam sob `/api`, e a API responde em `http://localhost:3333/api`. O frontend chama o caminho relativo `/api`: em desenvolvimento o Vite encaminha para a porta 3333, e no Docker Compose o nginx de `http://localhost:8080` encaminha para o container da API.
- **Formato:** requisições e respostas em JSON (`Content-Type: application/json`). O corpo aceita até 100 kB.
- **Autenticação:** fora `GET /api/health` e `POST /api/auth/login`, toda rota exige o cabeçalho `Authorization: Bearer <token>`, com o token devolvido pelo login. O token vale pelo tempo de `JWT_EXPIRES_IN` (padrão `8h`) e deve ser tratado como opaco.
- **Identificadores:** `id` e os campos terminados em `Id` são inteiros.
- **Datas:** texto ISO 8601 em UTC, como `"2026-09-14T13:05:00.000Z"`. Pastilhas, fabricantes e fornecedores trazem `criadoEm` e `atualizadoEm`.
- **Perfis:** `ADMINISTRADOR`, `GESTOR`, `OPERADOR` e `COMPRADOR`. Quem pode fazer o quê vem da matriz de `backend/src/config/permissoes.ts`, e cada rota cita a ação correspondente. As rotas de consulta exigem só o login, o que equivale à ação `consultar` (os quatro perfis).
- **CORS:** só as origens listadas em `CORS_ORIGINS` recebem liberação. Pelo nginx do Docker Compose, o site e a API ficam na mesma origem.
- **Rota inexistente:** `404` com `{ "erro": "Rota não encontrada" }`. Dentro de `/api` o token é verificado antes, então uma rota inexistente chamada sem token responde `401`.
- **Sessão no frontend:** o frontend trata qualquer `401` fora da tela de login como sessão encerrada e volta para o login.
- **Auditoria:** a abertura e o fechamento automático de alertas ficam registrados na trilha de auditoria do banco, que não tem rota na API e nunca guarda senhas.

### Envelope de erro

Toda resposta de erro é um objeto JSON com a chave `erro`, que o frontend exibe.

| Campo       | Tipo   | Presença | Descrição                                                                                                  |
| ----------- | ------ | -------- | ---------------------------------------------------------------------------------------------------------- |
| `erro`      | string | sempre   | Mensagem para exibir ao usuário.                                                                           |
| `codigo`    | string | opcional | Código estável para o frontend reagir sem depender do texto. Veja a tabela de códigos abaixo.              |
| `campos`    | array  | opcional | Vem com `DADOS_INVALIDOS`: `[{ "caminho": string, "mensagem": string }]`, com `caminho` apontando o campo. |
| `requestId` | string | opcional | **(em implementação)** Identificador da requisição, para localizar o erro nos logs do servidor.            |

O tratador de erros já responde às falhas de validação com `400`, `codigo: "DADOS_INVALIDOS"` e `campos`. As rotas passam a validar a entrada com ele **(em implementação)**; até lá, parte dos valores de tipo errado ainda cai no `500`.

```json
{
  "erro": "Dados inválidos",
  "codigo": "DADOS_INVALIDOS",
  "campos": [{ "caminho": "quantidade", "mensagem": "deve ser um inteiro entre 1 e 1000000" }],
  "requestId": "3f6c1a9e-8b2d-4c1e-9a7f-2d5b8e0c4a11"
}
```

### Códigos

| Código                    | Status | Quando                                                                                   | Situação         |
| ------------------------- | ------ | ---------------------------------------------------------------------------------------- | ---------------- |
| `DADOS_INVALIDOS`         | `400`  | Falha de validação, com `campos`.                                                        | existente        |
| `REFERENCIA_INVALIDA`     | `400`  | O registro relacionado não existe, como um `fabricanteId` ou `fornecedorId` inexistente. | existente        |
| `SESSAO_INVALIDA`         | `401`  | Token de usuário desativado, com versão de token antiga ou de usuário apagado.           | em implementação |
| `TROCA_SENHA_OBRIGATORIA` | `403`  | Troca de senha pendente.                                                                 | em implementação |
| `NAO_ENCONTRADO`          | `404`  | O banco não achou o registro a alterar, como ao resolver um alerta inexistente.          | existente        |
| `DUPLICADO`               | `409`  | Valor único já cadastrado: e-mail, nome do fabricante, CNPJ ou código da pastilha.       | existente        |
| `ALERTA_JA_RESOLVIDO`     | `409`  | Resolver um alerta que já está resolvido.                                                | em implementação |
| `MUITAS_TENTATIVAS`       | `429`  | Excesso de tentativas de login.                                                          | em implementação |

Mensagens atuais: `REFERENCIA_INVALIDA` usa `"Referência inválida: o registro relacionado não existe"`; `NAO_ENCONTRADO` usa `"Registro não encontrado"`; `DUPLICADO` usa `"Já existe um usuário com este e-mail"`, `"Já existe um fabricante com este nome"`, `"Já existe um fornecedor com este CNPJ"` ou `"Já existe uma pastilha com este código"`, e `"Registro duplicado"` nos demais casos.

Os outros erros das rotas existentes vêm só com `erro`, sem `codigo`, como `"Pastilha não encontrada"` (`404`) e `"Saldo insuficiente: ..."` (`400`).

### Status

| Status | Quando                                                                                                                                                                                                                                                                                           |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `400`  | Dados inválidos (`DADOS_INVALIDOS`), referência inexistente (`REFERENCIA_INVALIDA`), JSON malformado (`"JSON malformado"`) ou saldo insuficiente.                                                                                                                                                |
| `401`  | Sem token (`"Token não informado"`) ou token inválido ou expirado (`"Token inválido ou expirado"`), sem `codigo`. **(em implementação)** `SESSAO_INVALIDA` para usuário desativado, versão de token antiga ou usuário apagado. No login, credenciais recusadas, inclusive de usuário desativado. |
| `403`  | Perfil sem permissão (`"Acesso negado para este perfil"`) ou, **(em implementação)**, `TROCA_SENHA_OBRIGATORIA`.                                                                                                                                                                                 |
| `404`  | Recurso ou rota inexistente; `NAO_ENCONTRADO` quando a falta é detectada pelo banco.                                                                                                                                                                                                             |
| `409`  | Duplicidade (`DUPLICADO`). **(em implementação)** Alerta já resolvido (`ALERTA_JA_RESOLVIDO`) e as regras de proteção dos usuários.                                                                                                                                                              |
| `413`  | Corpo acima de 100 kB (`"Corpo da requisição grande demais"`).                                                                                                                                                                                                                                   |
| `429`  | **(em implementação)** `MUITAS_TENTATIVAS`, com o cabeçalho `Retry-After`.                                                                                                                                                                                                                       |
| `500`  | Erro interno, sempre `{ "erro": "Erro interno no servidor" }`, sem detalhes internos. Por ora inclui as violações das restrições do banco (saldo ou estoque mínimo negativos) e os tipos que as rotas ainda não validam.                                                                         |
| `503`  | Health check com o banco indisponível.                                                                                                                                                                                                                                                           |

As mensagens citadas entre aspas nas partes existentes são os textos atuais do código. Nas partes em implementação, os textos dos exemplos são ilustrativos: trate o erro pelo status e por `codigo`.

## 2. Resumo das rotas

"Todos" são os quatro perfis, com login. "Público" dispensa o token. Uma rota "existente" pode ter regras novas, marcadas na seção do recurso. Enquanto a troca de senha estiver pendente, só o login, o health check, `GET /api/auth/me` e `PATCH /api/auth/senha` respondem normalmente.

| Método  | Caminho                             | Perfis                                         | Situação         |
| ------- | ----------------------------------- | ---------------------------------------------- | ---------------- |
| `GET`   | `/api/health`                       | Público                                        | existente        |
| `POST`  | `/api/auth/login`                   | Público                                        | existente        |
| `GET`   | `/api/auth/me`                      | Todos                                          | em implementação |
| `PATCH` | `/api/auth/senha`                   | Todos                                          | em implementação |
| `GET`   | `/api/usuarios`                     | ADMINISTRADOR                                  | em implementação |
| `POST`  | `/api/usuarios`                     | ADMINISTRADOR                                  | em implementação |
| `PUT`   | `/api/usuarios/:id`                 | ADMINISTRADOR                                  | em implementação |
| `PATCH` | `/api/usuarios/:id/ativo`           | ADMINISTRADOR                                  | em implementação |
| `POST`  | `/api/usuarios/:id/redefinir-senha` | ADMINISTRADOR                                  | em implementação |
| `GET`   | `/api/painel/resumo`                | Todos                                          | existente        |
| `GET`   | `/api/pastilhas`                    | Todos                                          | existente        |
| `GET`   | `/api/pastilhas/:id`                | Todos                                          | existente        |
| `POST`  | `/api/pastilhas`                    | ADMINISTRADOR, GESTOR                          | existente        |
| `PUT`   | `/api/pastilhas/:id`                | ADMINISTRADOR, GESTOR                          | existente        |
| `GET`   | `/api/fabricantes`                  | Todos                                          | existente        |
| `POST`  | `/api/fabricantes`                  | ADMINISTRADOR, GESTOR                          | existente        |
| `PUT`   | `/api/fabricantes/:id`              | ADMINISTRADOR, GESTOR                          | em implementação |
| `GET`   | `/api/fornecedores`                 | Todos                                          | existente        |
| `POST`  | `/api/fornecedores`                 | ADMINISTRADOR, GESTOR, COMPRADOR               | existente        |
| `PUT`   | `/api/fornecedores/:id`             | ADMINISTRADOR, GESTOR, COMPRADOR               | em implementação |
| `GET`   | `/api/movimentacoes`                | Todos                                          | existente        |
| `POST`  | `/api/movimentacoes`                | Todos (SAIDA: ADMINISTRADOR, GESTOR, OPERADOR) | existente        |
| `GET`   | `/api/alertas`                      | Todos                                          | existente        |
| `PATCH` | `/api/alertas/:id/resolver`         | ADMINISTRADOR, GESTOR                          | existente        |

São 24 rotas: 15 existentes e 9 em implementação.

## 3. Saúde

### `GET /api/health`

Público. Existente. Usado pelo Docker, pelo CI e pelo monitoramento; não traz dados sensíveis.

Resposta `200`:

```json
{ "status": "ok", "banco": "ok", "versao": "0.2.0", "uptimeSegundos": 3600 }
```

Erro `503`, quando o banco não responde. Segue o envelope de erro e mantém os campos de diagnóstico:

```json
{
  "erro": "Banco de dados indisponível",
  "status": "erro",
  "banco": "indisponivel",
  "versao": "0.2.0",
  "uptimeSegundos": 3600
}
```

## 4. Autenticação

### `POST /api/auth/login`

Público. Existente.

Corpo: `{ email, senha }`, ambos obrigatórios. O e-mail não diferencia maiúsculas e ignora espaços nas pontas.

Resposta `200`: `{ token, usuario: { id, nome, email, perfil, deveTrocarSenha } }`. O `deveTrocarSenha` já existe no banco, mas o login ainda não o devolve **(em implementação)**; hoje `usuario` traz só `id`, `nome`, `email` e `perfil`.

Erros:

- `400` `"Informe e-mail e senha"`, quando falta um dos campos.
- `401` `"E-mail ou senha inválidos"`, para senha errada, e-mail inexistente ou usuário desativado. A mensagem é a mesma nos três casos.
- `429` **(em implementação)** com `codigo: "MUITAS_TENTATIVAS"`, depois de 5 falhas em 15 minutos para o mesmo IP + e-mail, com o cabeçalho `Retry-After` em segundos. O IP segue a configuração de `TRUST_PROXY` (`1` no Docker Compose, atrás do nginx).

```json
{ "email": "maria@pastrack.local", "senha": "Torno2026seguro" }
```

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "usuario": {
    "id": 2,
    "nome": "Maria Souza",
    "email": "maria@pastrack.local",
    "perfil": "GESTOR",
    "deveTrocarSenha": false
  }
}
```

### `GET /api/auth/me`

Todos os perfis, inclusive com a troca de senha pendente. **(em implementação)**

Resposta `200`: o usuário logado, no mesmo formato de `usuario` do login.

Erros: `401`.

```json
{
  "id": 2,
  "nome": "Maria Souza",
  "email": "maria@pastrack.local",
  "perfil": "GESTOR",
  "deveTrocarSenha": false
}
```

### `PATCH /api/auth/senha`

Todos os perfis, inclusive com a troca de senha pendente. **(em implementação)**

Corpo: `{ senhaAtual, novaSenha }`. A `novaSenha` segue a política de senha abaixo.

Resposta `200`: `{ token }`. É um token novo: os emitidos antes, inclusive o usado nesta chamada, deixam de valer, e o frontend deve substituir o token guardado. Depois da troca, `deveTrocarSenha` passa a `false`.

Erros:

- `400` para dados inválidos, senha atual incorreta ou nova senha fora da política, com `campos` apontando o campo. A senha atual incorreta não usa `401`, reservado aos problemas de sessão, que levariam o frontend de volta ao login.
- `401` para token ausente, inválido ou expirado, ou sessão invalidada.

```json
{ "senhaAtual": "Provisoria7k2m9x", "novaSenha": "Fresa2026retifica" }
```

```json
{ "token": "eyJhbGciOiJIUzI1NiJ9..." }
```

### Política de senha

Vale para a `novaSenha` de `PATCH /api/auth/senha` **(em implementação)**. As regras já existem em `backend/src/services/politica-senha.ts`:

- de 10 caracteres a 72 bytes em UTF-8 (letras acentuadas ocupam 2 bytes);
- pelo menos uma letra e um número;
- sem conter o e-mail: a parte antes do `@`, quando tem 3 caracteres ou mais, sem diferenciar maiúsculas;
- fora da lista de senhas comuns, também sem diferenciar maiúsculas.

### Troca obrigatória de senha

**(em implementação)** Enquanto o usuário tiver `deveTrocarSenha = true`, qualquer rota responde `403` com `codigo: "TROCA_SENHA_OBRIGATORIA"`. As exceções são `POST /api/auth/login`, `GET /api/auth/me`, `PATCH /api/auth/senha` e `GET /api/health`. O usuário criado por `POST /api/usuarios` ou com a senha redefinida fica com `deveTrocarSenha = true`.

O campo já existe no banco, com padrão `true`: o administrador inicial criado pelo seed também começa com a troca pendente, e só os usuários de demonstração começam com `false`.

```json
{ "erro": "Troque a sua senha para continuar", "codigo": "TROCA_SENHA_OBRIGATORIA" }
```

### Sessão

- Hoje o token vale até expirar, mesmo que o usuário seja desativado ou mude de perfil nesse meio-tempo.
- **(em implementação)** Desativar, rebaixar ou trocar a senha de um usuário invalida os tokens emitidos antes da mudança. O token de usuário desativado, com versão de token antiga ou de usuário apagado recebe `401` com `codigo: "SESSAO_INVALIDA"`.
- O `versaoToken`, que sustenta esse controle, já existe no banco e é interno: não aparece em nenhuma resposta.
- O `senhaHash` nunca aparece em nenhuma resposta.

```json
{ "erro": "Sessão encerrada. Entre novamente.", "codigo": "SESSAO_INVALIDA" }
```

## 5. Usuários

**(em implementação)** Todas as rotas exigem ADMINISTRADOR (ação `gerenciarUsuarios`); os demais perfis recebem `403`. Hoje `/api/usuarios` só faz essa verificação de perfil, e um administrador recebe `404`.

O usuário nas respostas é `{ id, nome, email, perfil, ativo, deveTrocarSenha }`. O `senhaHash` e o `versaoToken` nunca aparecem.

Ninguém desativa ou rebaixa a si mesmo, nem o último administrador ativo: essas tentativas respondem `409`.

### `GET /api/usuarios`

Resposta `200`: array de usuários.

```json
[
  {
    "id": 1,
    "nome": "Administrador",
    "email": "admin@pastrack.local",
    "perfil": "ADMINISTRADOR",
    "ativo": true,
    "deveTrocarSenha": false
  }
]
```

### `POST /api/usuarios`

Corpo: `{ nome, email, perfil }`.

Resposta `201`: o usuário mais `senhaTemporaria`, exibida uma única vez: a API não a devolve de novo.

Erros: `400` para dados inválidos; `409` com `codigo: "DUPLICADO"` (`"Já existe um usuário com este e-mail"`) para e-mail já cadastrado.

```json
{ "nome": "João Lima", "email": "joao@pastrack.local", "perfil": "OPERADOR" }
```

```json
{
  "id": 7,
  "nome": "João Lima",
  "email": "joao@pastrack.local",
  "perfil": "OPERADOR",
  "ativo": true,
  "deveTrocarSenha": true,
  "senhaTemporaria": "Provisoria7k2m9x"
}
```

### `PUT /api/usuarios/:id`

Corpo: `{ nome?, perfil? }`.

Resposta `200`: o usuário atualizado. Rebaixar o perfil invalida os tokens anteriores do usuário.

Erros: `400`; `404` para usuário inexistente; `409` ao rebaixar a si mesmo ou o último administrador ativo.

```json
{ "perfil": "GESTOR" }
```

### `PATCH /api/usuarios/:id/ativo`

Corpo: `{ ativo }`, booleano.

Resposta `200`: o usuário atualizado. Desativar invalida os tokens anteriores do usuário.

Erros: `400`; `404`; `409` ao desativar a si mesmo ou o último administrador ativo.

```json
{ "ativo": false }
```

### `POST /api/usuarios/:id/redefinir-senha`

Sem corpo.

Resposta `200`: `{ senhaTemporaria }`, exibida uma única vez. Os tokens anteriores do usuário deixam de valer, e ele volta a `deveTrocarSenha = true`.

Erros: `404`.

```json
{ "senhaTemporaria": "Provisoria3q8w1z" }
```

## 6. Painel

### `GET /api/painel/resumo`

Todos os perfis. Existente.

Resposta `200`:

- `totalPastilhas`: quantidade de pastilhas cadastradas;
- `alertasAbertos`: quantidade de alertas `ABERTO`;
- `itensCriticos`: pastilhas com `saldoAtual <= estoqueMinimo`, do menor saldo para o maior, cada uma com `{ id, codigo, descricao, saldoAtual, estoqueMinimo }`;
- `ultimasMovimentacoes`: as 5 movimentações mais recentes, no formato de `GET /api/movimentacoes`.

```json
{
  "totalPastilhas": 42,
  "alertasAbertos": 1,
  "itensCriticos": [
    {
      "id": 3,
      "codigo": "CNMG120408",
      "descricao": "Pastilha CNMG 120408",
      "saldoAtual": 4,
      "estoqueMinimo": 10
    }
  ],
  "ultimasMovimentacoes": []
}
```

## 7. Pastilhas

A pastilha nas respostas é `{ id, codigo, descricao, modelo, aplicacao, unidade, estoqueMinimo, saldoAtual, fabricanteId, criadoEm, atualizadoEm, fabricante }`, com `fabricante` no formato da seção de fabricantes. `modelo` e `aplicacao` podem ser `null`, e `codigo` é único. O banco recusa `saldoAtual` e `estoqueMinimo` negativos.

### `GET /api/pastilhas`

Todos os perfis. Existente.

Query:

- `busca`: filtra por trecho de `codigo` ou de `descricao`, sem diferenciar maiúsculas;
- `criticas=true` **(em implementação)**: só as pastilhas com `saldoAtual <= estoqueMinimo`, o mesmo critério do painel.

Resposta `200`: array de pastilhas em ordem alfabética de `descricao`, sem paginação.

```json
[
  {
    "id": 3,
    "codigo": "CNMG120408",
    "descricao": "Pastilha CNMG 120408",
    "modelo": "CNMG 120408-PM",
    "aplicacao": "Torneamento de aço",
    "unidade": "un",
    "estoqueMinimo": 10,
    "saldoAtual": 4,
    "fabricanteId": 1,
    "criadoEm": "2026-09-10T12:00:00.000Z",
    "atualizadoEm": "2026-09-14T13:05:00.000Z",
    "fabricante": {
      "id": 1,
      "nome": "Sandvik",
      "criadoEm": "2026-09-10T11:00:00.000Z",
      "atualizadoEm": "2026-09-10T11:00:00.000Z"
    }
  }
]
```

### `GET /api/pastilhas/:id`

Todos os perfis. Existente.

Resposta `200`: a pastilha, no formato acima.

Erros: `404` `"Pastilha não encontrada"`, sem `codigo`.

```json
{ "erro": "Pastilha não encontrada" }
```

### `POST /api/pastilhas`

ADMINISTRADOR e GESTOR (ação `gerenciarPastilhas`). Existente.

Corpo: `codigo`, `descricao` e `fabricanteId` obrigatórios; `modelo`, `aplicacao`, `unidade` (padrão `"un"`) e `estoqueMinimo` (padrão `0`) opcionais. Outros campos, inclusive `saldoAtual`, são ignorados: a pastilha nasce com saldo `0`.

Resposta `201`: a pastilha criada.

Erros:

- `400` `"Código, descrição e fabricante são obrigatórios"`;
- `400` com `codigo: "REFERENCIA_INVALIDA"` para `fabricanteId` inexistente;
- `403`;
- `409` com `codigo: "DUPLICADO"` (`"Já existe uma pastilha com este código"`);
- `500` para `estoqueMinimo` negativo, barrado pelo banco.

```json
{
  "codigo": "CNMG120408",
  "descricao": "Pastilha CNMG 120408",
  "unidade": "un",
  "estoqueMinimo": 10,
  "fabricanteId": 1
}
```

### `PUT /api/pastilhas/:id`

ADMINISTRADOR e GESTOR (ação `gerenciarPastilhas`). Existente, com as regras novas marcadas.

Corpo **(em implementação)**: só `descricao`, `modelo`, `aplicacao`, `unidade`, `estoqueMinimo` e `fabricanteId`, todos opcionais. O `saldoAtual` nunca é aceito: o saldo só muda por movimentação. Qualquer outro campo, inclusive `saldoAtual` e `codigo`, responde `400`.

Hoje a rota repassa o corpo sem filtro, inclusive `saldoAtual`. É um defeito conhecido, registrado em `backend/tests/security/pendencias.spec.ts`.

**(em implementação)** Mudar `estoqueMinimo` abre o alerta quando o saldo fica menor ou igual ao novo mínimo, e fecha o alerta aberto quando o saldo fica acima dele.

Resposta `200`: a pastilha atualizada.

Erros: `400`, inclusive `REFERENCIA_INVALIDA` para `fabricanteId` inexistente; `403`; `404` `"Pastilha não encontrada"`.

```json
{ "descricao": "Pastilha CNMG 120408 para aço", "estoqueMinimo": 12 }
```

## 8. Fabricantes

O fabricante nas respostas é `{ id, nome, criadoEm, atualizadoEm }`, com `nome` único.

### `GET /api/fabricantes`

Todos os perfis. Existente.

Resposta `200`: array em ordem alfabética de `nome`.

```json
[
  {
    "id": 1,
    "nome": "Sandvik",
    "criadoEm": "2026-09-10T11:00:00.000Z",
    "atualizadoEm": "2026-09-10T11:00:00.000Z"
  }
]
```

### `POST /api/fabricantes`

ADMINISTRADOR e GESTOR (ação `gerenciarFabricantes`). Existente.

Corpo: `{ nome }`, obrigatório.

Resposta `201`: o fabricante criado.

Erros: `400` `"Informe o nome do fabricante"`; `403`; `409` com `codigo: "DUPLICADO"` (`"Já existe um fabricante com este nome"`).

```json
{ "nome": "Sandvik" }
```

### `PUT /api/fabricantes/:id`

ADMINISTRADOR e GESTOR (ação `gerenciarFabricantes`). **(em implementação)**

Corpo: `{ nome }`.

Resposta `200`: o fabricante atualizado.

Erros: `400`; `403`; `404` para fabricante inexistente; `409` com `codigo: "DUPLICADO"` para nome já cadastrado.

```json
{ "nome": "Sandvik Coromant" }
```

## 9. Fornecedores

O fornecedor nas respostas é `{ id, nome, cnpj, contato, criadoEm, atualizadoEm }`. `cnpj` e `contato` podem ser `null`, e `cnpj` é único.

**(em implementação)** O CNPJ é aceito com ou sem máscara, validado pelos dígitos verificadores e devolvido sempre formatado como `00.000.000/0000-00`. Hoje ele é gravado e devolvido como foi enviado, sem validação, e a duplicidade só é detectada quando o texto é idêntico.

### `GET /api/fornecedores`

Todos os perfis. Existente.

Resposta `200`: array em ordem alfabética de `nome`.

```json
[
  {
    "id": 1,
    "nome": "Distribuidora Alfa",
    "cnpj": "11.222.333/0001-81",
    "contato": "compras@alfa.local",
    "criadoEm": "2026-09-10T11:00:00.000Z",
    "atualizadoEm": "2026-09-10T11:00:00.000Z"
  }
]
```

### `POST /api/fornecedores`

ADMINISTRADOR, GESTOR e COMPRADOR (ação `gerenciarFornecedores`). Existente.

Corpo: `{ nome, cnpj?, contato? }`, com `nome` obrigatório.

Resposta `201`: o fornecedor criado.

Erros:

- `400` `"Informe o nome do fornecedor"`;
- `400` **(em implementação)** para CNPJ com dígitos verificadores inválidos;
- `403`;
- `409` com `codigo: "DUPLICADO"` (`"Já existe um fornecedor com este CNPJ"`).

```json
{ "nome": "Distribuidora Alfa", "cnpj": "11222333000181", "contato": "compras@alfa.local" }
```

### `PUT /api/fornecedores/:id`

ADMINISTRADOR, GESTOR e COMPRADOR (ação `gerenciarFornecedores`). **(em implementação)**

Corpo: os mesmos campos e regras do `POST`, com o CNPJ aceito com ou sem máscara.

Resposta `200`: o fornecedor atualizado, com o CNPJ formatado.

Erros: `400`; `403`; `404` para fornecedor inexistente; `409` com `codigo: "DUPLICADO"` para CNPJ já cadastrado.

```json
{ "nome": "Distribuidora Alfa Ltda", "cnpj": "11.222.333/0001-81", "contato": "(47) 3333-0000" }
```

## 10. Movimentações

A movimentação nas listagens é `{ id, tipo, quantidade, dataHora, documento, observacao, pastilhaId, usuarioId, fornecedorId, pastilha: { codigo, descricao, unidade }, usuario: { nome }, fornecedor: { nome } }`. `tipo` é `ENTRADA` ou `SAIDA`; `usuario` é quem registrou; `documento`, `observacao`, `fornecedorId` e `fornecedor` podem ser `null`.

### `GET /api/movimentacoes`

Todos os perfis. Existente.

Query:

- `pastilhaId`: só as movimentações da pastilha;
- `tipo` (`ENTRADA` ou `SAIDA`), `de` e `ate` **(em implementação)**: `de` e `ate` são datas ISO 8601 aplicadas a `dataHora`, com as duas pontas incluídas;
- `pagina` e `tamanho` **(em implementação)**: `pagina` começa em `1`; `tamanho` tem padrão `20`, mínimo `1` e máximo `100`.

Resposta `200`:

- sem `pagina`: array com as 100 movimentações mais recentes, da mais nova para a mais antiga, como hoje;
- com `pagina` **(em implementação)**: `{ dados, total, pagina, tamanho }`, em que `dados` traz as movimentações da página, na mesma ordem, e `total` a quantidade que atende aos filtros.

Erros **(em implementação)**: `400` com `codigo: "DADOS_INVALIDOS"` para filtros inválidos, inclusive `tamanho` acima de `100`.

```json
{
  "dados": [
    {
      "id": 15,
      "tipo": "ENTRADA",
      "quantidade": 20,
      "dataHora": "2026-09-14T13:05:00.000Z",
      "documento": "NF 123",
      "observacao": null,
      "pastilhaId": 3,
      "usuarioId": 2,
      "fornecedorId": 1,
      "pastilha": { "codigo": "CNMG120408", "descricao": "Pastilha CNMG 120408", "unidade": "un" },
      "usuario": { "nome": "Maria Souza" },
      "fornecedor": { "nome": "Distribuidora Alfa" }
    }
  ],
  "total": 1,
  "pagina": 1,
  "tamanho": 20
}
```

### `POST /api/movimentacoes`

ENTRADA: todos os perfis (ação `registrarEntrada`). SAIDA: ADMINISTRADOR, GESTOR e OPERADOR (ação `registrarSaida`); o COMPRADOR só registra ENTRADA. Existente.

Corpo:

| Campo          | Regra                                                                                                                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tipo`         | Obrigatório: `ENTRADA` ou `SAIDA`.                                                                                                                                                                                       |
| `pastilhaId`   | Obrigatório; a pastilha precisa existir.                                                                                                                                                                                 |
| `quantidade`   | Obrigatório e maior que zero. **(em implementação)** Inteiro de 1 a 1.000.000.                                                                                                                                           |
| `fornecedorId` | Na ENTRADA, precisa existir: se não existir, responde `400` com `codigo: "REFERENCIA_INVALIDA"`. Hoje é opcional e é ignorado na SAIDA. **(em implementação)** Obrigatório na ENTRADA; enviado na SAIDA, responde `400`. |
| `documento`    | Opcional, texto, como o número da nota fiscal.                                                                                                                                                                           |
| `observacao`   | Opcional, texto.                                                                                                                                                                                                         |

Tudo acontece numa única transação: grava a movimentação com o usuário do token como responsável, soma a ENTRADA ou desconta a SAIDA do `saldoAtual` e reavalia o alerta da pastilha:

- saldo menor ou igual ao `estoqueMinimo` e nenhum alerta aberto: abre um alerta;
- saldo acima do `estoqueMinimo` e alerta aberto, como na ENTRADA que repõe o estoque: fecha o alerta automaticamente, com `dataResolucao` preenchida e `resolvidoPorId` nulo.

O banco garante que o saldo nunca fica negativo e que há no máximo um alerta aberto por pastilha. Hoje, se duas saídas simultâneas passam juntas pela verificação de saldo, a que deixaria o saldo negativo é barrada pelo banco e responde `500`. **(em implementação)** A SAIDA é atômica: nunca deixa o saldo negativo, nem com requisições simultâneas, e a que não tiver saldo recebe o `400` de saldo insuficiente.

Resposta `201`: `{ movimentacao, saldoAtual }`, com a movimentação gravada (`{ id, tipo, quantidade, dataHora, documento, observacao, pastilhaId, usuarioId, fornecedorId }`, sem os objetos relacionados) e o saldo da pastilha depois do lançamento.

Erros:

- `400` `"Tipo de movimentação inválido"`;
- `400` `"Informe a pastilha e a quantidade"`, quando falta um dos dois ou a quantidade é `0`;
- `400` `"A quantidade deve ser maior que zero"`, para quantidade negativa;
- `400` `"Saldo insuficiente: há 3 un em estoque"`, com o saldo e a unidade da pastilha;
- `400` com `codigo: "REFERENCIA_INVALIDA"` para `fornecedorId` inexistente na ENTRADA;
- `400` **(em implementação)** para quantidade não inteira ou fora de 1 a 1.000.000 (hoje texto ou decimal podem cair no `500`), para `fornecedorId` ausente na ENTRADA e para `fornecedorId` enviado na SAIDA;
- `403` `"Seu perfil só pode registrar entradas"`, para SAIDA registrada pelo COMPRADOR;
- `404` `"Pastilha não encontrada"`, sem `codigo`.

```json
{ "tipo": "ENTRADA", "pastilhaId": 3, "quantidade": 20, "fornecedorId": 1, "documento": "NF 123" }
```

```json
{
  "movimentacao": {
    "id": 15,
    "tipo": "ENTRADA",
    "quantidade": 20,
    "dataHora": "2026-09-14T13:05:00.000Z",
    "documento": "NF 123",
    "observacao": null,
    "pastilhaId": 3,
    "usuarioId": 2,
    "fornecedorId": 1
  },
  "saldoAtual": 24
}
```

## 11. Alertas

O alerta nas listagens é `{ id, dataGeracao, situacao, dataResolucao, pastilhaId, resolvidoPorId, pastilha: { codigo, descricao, saldoAtual, estoqueMinimo } }`, com `situacao` `ABERTO` ou `RESOLVIDO`. `dataResolucao` e `resolvidoPorId` ficam `null` enquanto o alerta está aberto. No fechamento automático, `dataResolucao` é preenchida e `resolvidoPorId` fica `null`.

**(em implementação)** Cada alerta traz também `resolvidoPor`: `{ id, nome }` de quem resolveu manualmente, ou `null` quando o alerta está aberto ou foi fechado automaticamente.

Um alerta abre quando, depois de uma movimentação, o saldo fica menor ou igual ao `estoqueMinimo` e não há alerta aberto para a pastilha. Se alguém resolver o alerta com o saldo ainda baixo, a próxima movimentação abre outro.

### `GET /api/alertas`

Todos os perfis. Existente.

Query **(em implementação)**: `situacao` = `ABERTO` (padrão), `RESOLVIDO` ou `TODAS`. Hoje a rota devolve só os alertas abertos.

Resposta `200`: array do alerta mais novo para o mais antigo, por `dataGeracao`.

```json
[
  {
    "id": 5,
    "dataGeracao": "2026-09-14T11:40:00.000Z",
    "situacao": "RESOLVIDO",
    "dataResolucao": "2026-09-14T13:05:00.000Z",
    "pastilhaId": 3,
    "resolvidoPorId": 2,
    "resolvidoPor": { "id": 2, "nome": "Maria Souza" },
    "pastilha": {
      "codigo": "CNMG120408",
      "descricao": "Pastilha CNMG 120408",
      "saldoAtual": 4,
      "estoqueMinimo": 10
    }
  }
]
```

### `PATCH /api/alertas/:id/resolver`

ADMINISTRADOR e GESTOR (ação `resolverAlerta`). Existente.

Sem corpo. Marca o alerta como `RESOLVIDO`. Hoje a resolução manual não preenche `dataResolucao` nem `resolvidoPorId`; **(em implementação)** ela grava a data e o usuário logado em `resolvidoPorId`.

Resposta `200`: o alerta atualizado, sem os objetos `pastilha` e `resolvidoPor`: `{ id, dataGeracao, situacao, dataResolucao, pastilhaId, resolvidoPorId }`.

Erros:

- `403`;
- `404` com `codigo: "NAO_ENCONTRADO"` (`"Registro não encontrado"`) para alerta inexistente;
- `409` **(em implementação)** com `codigo: "ALERTA_JA_RESOLVIDO"` para alerta já resolvido. Hoje responde `200` e o alerta continua resolvido.

```json
{
  "id": 5,
  "dataGeracao": "2026-09-14T11:40:00.000Z",
  "situacao": "RESOLVIDO",
  "dataResolucao": "2026-09-14T13:05:00.000Z",
  "pastilhaId": 3,
  "resolvidoPorId": 2
}
```
