# Contrato da API do PasTrack

Este documento descreve a API REST do backend: o que já funciona hoje e as mudanças aprovadas para esta semana. O frontend e os testes se guiam por ele.

Itens marcados com **(em implementação)** fazem parte do contrato, mas ainda não foram entregues. O resto descreve o comportamento atual do código em `backend/src`.

## 1. Convenções

- **Base:** todas as rotas ficam sob `/api`. Em desenvolvimento, `http://localhost:3333/api`.
- **Formato:** requisições e respostas em JSON (`Content-Type: application/json`). O corpo aceita até 100 kB.
- **Autenticação:** fora `GET /api/health` e `POST /api/auth/login`, toda rota exige o cabeçalho `Authorization: Bearer <token>`, com o token devolvido pelo login. O token vale pelo tempo de `JWT_EXPIRES_IN` (padrão `8h`) e deve ser tratado como opaco.
- **Identificadores:** `id` e os campos terminados em `Id` são inteiros.
- **Datas:** texto ISO 8601 em UTC, como `"2026-09-14T13:05:00.000Z"`.
- **Perfis:** `ADMINISTRADOR`, `GESTOR`, `OPERADOR` e `COMPRADOR`. Quem pode fazer o quê vem da matriz de `backend/src/config/permissoes.ts`, e cada rota cita a ação correspondente. As rotas de consulta exigem só o login, o que equivale à ação `consultar` (os quatro perfis).
- **CORS:** só as origens listadas em `CORS_ORIGINS` recebem liberação.
- **Rota inexistente:** `404` com `{ "erro": "Rota não encontrada" }`. Dentro de `/api` o token é verificado antes, então uma rota inexistente chamada sem token responde `401`.
- **Sessão no frontend:** o frontend trata qualquer `401` fora da tela de login como sessão encerrada e volta para o login.

### Envelope de erro

Toda resposta de erro é um objeto JSON com a chave `erro`, que o frontend exibe.

| Campo       | Tipo   | Presença | Descrição                                                                                                  |
| ----------- | ------ | -------- | ---------------------------------------------------------------------------------------------------------- |
| `erro`      | string | sempre   | Mensagem para exibir ao usuário.                                                                           |
| `codigo`    | string | opcional | **(em implementação)** Código estável para casos específicos. Por ora só existe `TROCA_SENHA_OBRIGATORIA`. |
| `campos`    | array  | opcional | Falhas de validação: `[{ "caminho": string, "mensagem": string }]`, com `caminho` apontando o campo.       |
| `requestId` | string | opcional | **(em implementação)** Identificador da requisição, para localizar o erro nos logs do servidor.            |

Hoje o tratador de erros já monta `campos` para falhas de validação, mas nenhuma rota usa essa validação ainda. As rotas passam a usá-la **(em implementação)**.

```json
{
  "erro": "Dados inválidos",
  "campos": [{ "caminho": "quantidade", "mensagem": "deve ser um inteiro entre 1 e 1000000" }],
  "requestId": "3f6c1a9e-8b2d-4c1e-9a7f-2d5b8e0c4a11"
}
```

| Status | Quando                                                                                                                                                                                                                                      |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `400`  | Dados inválidos, JSON malformado (`"JSON malformado"`) ou saldo insuficiente.                                                                                                                                                               |
| `401`  | Sem token (`"Token não informado"`), token inválido ou expirado (`"Token inválido ou expirado"`) ou, **(em implementação)**, usuário desativado com token ainda no prazo. No login, credenciais recusadas, inclusive de usuário desativado. |
| `403`  | Perfil sem permissão (`"Acesso negado para este perfil"`) ou, **(em implementação)**, `codigo: "TROCA_SENHA_OBRIGATORIA"`.                                                                                                                  |
| `404`  | Recurso ou rota inexistente.                                                                                                                                                                                                                |
| `409`  | **(em implementação)** Duplicidade (e-mail, nome, CNPJ ou código já cadastrados) e conflitos de estado, como resolver um alerta já resolvido. Hoje as duplicidades caem no `500`.                                                           |
| `413`  | Corpo acima de 100 kB (`"Corpo da requisição grande demais"`).                                                                                                                                                                              |
| `429`  | **(em implementação)** Excesso de tentativas de login, com o cabeçalho `Retry-After`.                                                                                                                                                       |
| `500`  | Erro interno, sempre `{ "erro": "Erro interno no servidor" }`, sem detalhes internos.                                                                                                                                                       |
| `503`  | Health check com o banco indisponível.                                                                                                                                                                                                      |

As mensagens citadas entre aspas nas rotas existentes são os textos atuais do código. Nas partes em implementação, os textos dos exemplos são ilustrativos: trate o erro pelo status e por `codigo`.

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

Erro `503`, quando o banco não responde: `{ "status": "erro", "banco": "indisponivel", "versao": "0.2.0", "uptimeSegundos": 3600 }`. Hoje esse corpo não traz a chave `erro`; pelo envelope, ela passa a vir também **(em implementação)**.

## 4. Autenticação

### `POST /api/auth/login`

Público. Existente.

Corpo: `{ email, senha }`, ambos obrigatórios. O e-mail não diferencia maiúsculas e ignora espaços nas pontas.

Resposta `200`: `{ token, usuario: { id, nome, email, perfil, deveTrocarSenha } }`. O campo `deveTrocarSenha` é novo **(em implementação)**; hoje `usuario` traz só `id`, `nome`, `email` e `perfil`.

Erros:

- `400` `"Informe e-mail e senha"`, quando falta um dos campos.
- `401` `"E-mail ou senha inválidos"`, para senha errada, e-mail inexistente ou usuário desativado. A mensagem é a mesma nos três casos.
- `429` **(em implementação)** depois de 5 falhas em 15 minutos para o mesmo IP + e-mail, com o cabeçalho `Retry-After` em segundos. O IP segue a configuração de `TRUST_PROXY`.

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
- `401` para token ausente, inválido ou expirado.

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

```json
{ "erro": "Troque a sua senha para continuar", "codigo": "TROCA_SENHA_OBRIGATORIA" }
```

### Sessão

- Hoje o token vale até expirar, mesmo que o usuário seja desativado ou mude de perfil nesse meio-tempo.
- **(em implementação)** Desativar, rebaixar ou trocar a senha de um usuário invalida os tokens emitidos antes da mudança: eles passam a receber `401`. O usuário desativado também recebe `401` em qualquer rota.
- **(em implementação)** O campo `versaoToken`, usado nesse controle, é interno e não aparece em nenhuma resposta.
- O `senhaHash` nunca aparece em nenhuma resposta.

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

Erros: `400` para dados inválidos; `409` para e-mail já cadastrado.

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

A pastilha nas respostas é `{ id, codigo, descricao, modelo, aplicacao, unidade, estoqueMinimo, saldoAtual, fabricanteId, fabricante: { id, nome } }`. `modelo` e `aplicacao` podem ser `null`, e `codigo` é único.

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
    "fabricante": { "id": 1, "nome": "Sandvik" }
  }
]
```

### `GET /api/pastilhas/:id`

Todos os perfis. Existente.

Resposta `200`: a pastilha, no formato acima.

Erros: `404` `"Pastilha não encontrada"`.

```json
{ "erro": "Pastilha não encontrada" }
```

### `POST /api/pastilhas`

ADMINISTRADOR e GESTOR (ação `gerenciarPastilhas`). Existente.

Corpo: `codigo`, `descricao` e `fabricanteId` obrigatórios; `modelo`, `aplicacao`, `unidade` (padrão `"un"`) e `estoqueMinimo` (padrão `0`) opcionais. Outros campos, inclusive `saldoAtual`, são ignorados: a pastilha nasce com saldo `0`.

Resposta `201`: a pastilha criada.

Erros:

- `400` `"Código, descrição e fabricante são obrigatórios"`;
- `403`;
- `409` **(em implementação)** para `codigo` já cadastrado. Hoje responde `500`, assim como um `fabricanteId` inexistente.

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

Erros: `400`; `403`; `404` `"Pastilha não encontrada"`.

```json
{ "descricao": "Pastilha CNMG 120408 para aço", "estoqueMinimo": 12 }
```

## 8. Fabricantes

O fabricante nas respostas é `{ id, nome }`, com `nome` único.

### `GET /api/fabricantes`

Todos os perfis. Existente.

Resposta `200`: array em ordem alfabética de `nome`.

```json
[{ "id": 1, "nome": "Sandvik" }]
```

### `POST /api/fabricantes`

ADMINISTRADOR e GESTOR (ação `gerenciarFabricantes`). Existente.

Corpo: `{ nome }`, obrigatório.

Resposta `201`: o fabricante criado.

Erros: `400` `"Informe o nome do fabricante"`; `403`; `409` **(em implementação)** para nome já cadastrado, que hoje responde `500`.

```json
{ "nome": "Sandvik" }
```

### `PUT /api/fabricantes/:id`

ADMINISTRADOR e GESTOR (ação `gerenciarFabricantes`). **(em implementação)**

Corpo: `{ nome }`.

Resposta `200`: o fabricante atualizado.

Erros: `400`; `403`; `404` para fabricante inexistente; `409` para nome já cadastrado.

```json
{ "nome": "Sandvik Coromant" }
```

## 9. Fornecedores

O fornecedor nas respostas é `{ id, nome, cnpj, contato }`. `cnpj` e `contato` podem ser `null`, e `cnpj` é único.

### `GET /api/fornecedores`

Todos os perfis. Existente.

Resposta `200`: array em ordem alfabética de `nome`.

```json
[{ "id": 1, "nome": "Distribuidora Alfa", "cnpj": "11222333000181", "contato": "compras@alfa.local" }]
```

### `POST /api/fornecedores`

ADMINISTRADOR, GESTOR e COMPRADOR (ação `gerenciarFornecedores`). Existente.

Corpo: `{ nome, cnpj?, contato? }`, com `nome` obrigatório.

Resposta `201`: o fornecedor criado.

Erros:

- `400` `"Informe o nome do fornecedor"`;
- `400` **(em implementação)** para CNPJ com dígitos verificadores inválidos. Hoje o CNPJ não é validado;
- `403`;
- `409` **(em implementação)** para CNPJ já cadastrado, que hoje responde `500`.

```json
{ "nome": "Distribuidora Alfa", "cnpj": "11222333000181", "contato": "compras@alfa.local" }
```

### `PUT /api/fornecedores/:id`

ADMINISTRADOR, GESTOR e COMPRADOR (ação `gerenciarFornecedores`). **(em implementação)**

Corpo: os mesmos campos e regras do `POST`, com o CNPJ validado pelos dígitos verificadores.

Resposta `200`: o fornecedor atualizado.

Erros: `400`; `403`; `404` para fornecedor inexistente; `409` para CNPJ já cadastrado.

```json
{ "nome": "Distribuidora Alfa Ltda", "cnpj": "11222333000181", "contato": "(47) 3333-0000" }
```

## 10. Movimentações

A movimentação nas listagens é `{ id, tipo, quantidade, dataHora, documento, observacao, pastilhaId, usuarioId, fornecedorId, pastilha: { codigo, descricao, unidade }, usuario: { nome }, fornecedor: { nome } }`. `tipo` é `ENTRADA` ou `SAIDA`; `usuario` é quem registrou; `documento`, `observacao`, `fornecedorId` e `fornecedor` podem ser `null`.

### `GET /api/movimentacoes`

Todos os perfis. Existente.

Query:

- `pastilhaId`: só as movimentações da pastilha;
- `tipo` (`ENTRADA` ou `SAIDA`), `de` e `ate` (datas ISO 8601 aplicadas a `dataHora`) **(em implementação)**;
- `pagina` e `tamanho` **(em implementação)**.

Resposta `200`:

- sem `pagina`: array com as 100 movimentações mais recentes, da mais nova para a mais antiga, como hoje;
- com `pagina` **(em implementação)**: `{ dados, total, pagina, tamanho }`, em que `dados` traz as movimentações da página, `total` a quantidade que atende aos filtros e `tamanho` vai até 100.

Erros: `400` **(em implementação)** para filtros inválidos.

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

| Campo          | Regra                                                                                                                                               |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tipo`         | Obrigatório: `ENTRADA` ou `SAIDA`.                                                                                                                  |
| `pastilhaId`   | Obrigatório; a pastilha precisa existir.                                                                                                            |
| `quantidade`   | Obrigatório e maior que zero. **(em implementação)** Inteiro de 1 a 1.000.000.                                                                      |
| `fornecedorId` | Hoje opcional e ignorado na SAIDA. **(em implementação)** Obrigatório na ENTRADA, e o fornecedor precisa existir; enviado na SAIDA, responde `400`. |
| `documento`    | Opcional, texto, como o número da nota fiscal.                                                                                                      |
| `observacao`   | Opcional, texto.                                                                                                                                    |

Tudo acontece numa única transação: grava a movimentação com o usuário do token como responsável, soma a ENTRADA ou desconta a SAIDA do `saldoAtual` e abre um alerta se o saldo ficar menor ou igual ao `estoqueMinimo` e não houver alerta aberto para a pastilha.

- **(em implementação)** A ENTRADA que repõe o saldo acima do mínimo fecha o alerta aberto automaticamente, com `resolvidoPorId` nulo.
- **(em implementação)** A SAIDA é atômica: nunca deixa o saldo negativo, nem com requisições simultâneas. Hoje duas saídas simultâneas podem passar juntas pela verificação de saldo.

Resposta `201`: `{ movimentacao, saldoAtual }`, com a movimentação gravada (`{ id, tipo, quantidade, dataHora, documento, observacao, pastilhaId, usuarioId, fornecedorId }`, sem os objetos relacionados) e o saldo da pastilha depois do lançamento.

Erros:

- `400` `"Tipo de movimentação inválido"`;
- `400` `"Informe a pastilha e a quantidade"`, quando falta um dos dois ou a quantidade é `0`;
- `400` `"A quantidade deve ser maior que zero"`, para quantidade negativa;
- `400` `"Saldo insuficiente: há 3 un em estoque"`, com o saldo e a unidade da pastilha;
- `400` **(em implementação)** para quantidade não inteira ou fora de 1 a 1.000.000 (hoje texto ou decimal podem cair no `500`), para `fornecedorId` ausente na ENTRADA e para `fornecedorId` enviado na SAIDA;
- `403` `"Seu perfil só pode registrar entradas"`, para SAIDA registrada pelo COMPRADOR;
- `404` `"Pastilha não encontrada"`;
- `404` **(em implementação)** para `fornecedorId` inexistente na ENTRADA, que hoje responde `500`.

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

O alerta nas listagens é `{ id, dataGeracao, situacao, pastilhaId, pastilha: { codigo, descricao, saldoAtual, estoqueMinimo } }`, com `situacao` `ABERTO` ou `RESOLVIDO`. **(em implementação)** Cada alerta traz também `dataResolucao`, `resolvidoPorId` e `resolvidoPor` (`{ nome }` de quem resolveu). Os três ficam `null` enquanto o alerta está aberto, e `resolvidoPorId` e `resolvidoPor` ficam `null` no fechamento automático.

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
    "pastilhaId": 3,
    "dataResolucao": "2026-09-14T13:05:00.000Z",
    "resolvidoPorId": 2,
    "resolvidoPor": { "nome": "Maria Souza" },
    "pastilha": {
      "codigo": "CNMG120408",
      "descricao": "Pastilha CNMG 120408",
      "saldoAtual": 24,
      "estoqueMinimo": 10
    }
  }
]
```

### `PATCH /api/alertas/:id/resolver`

ADMINISTRADOR e GESTOR (ação `resolverAlerta`). Existente.

Sem corpo. Marca o alerta como `RESOLVIDO`; **(em implementação)** grava também `dataResolucao` e o usuário logado em `resolvidoPorId`.

Resposta `200`: o alerta atualizado, sem o objeto `pastilha`: `{ id, dataGeracao, situacao, pastilhaId }` e, **(em implementação)**, `dataResolucao` e `resolvidoPorId`.

Erros:

- `403`;
- `404` **(em implementação)** para alerta inexistente, que hoje responde `500`;
- `409` **(em implementação)** para alerta já resolvido. Hoje responde `200` e o alerta continua resolvido.

```json
{
  "id": 5,
  "dataGeracao": "2026-09-14T11:40:00.000Z",
  "situacao": "RESOLVIDO",
  "pastilhaId": 3,
  "dataResolucao": "2026-09-14T13:05:00.000Z",
  "resolvidoPorId": 2
}
```
