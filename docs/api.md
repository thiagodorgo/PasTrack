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
- `itensCriticos`: até 20 pastilhas com `saldoAtual <= estoqueMinimo`, do menor saldo para o maior (o `id` desempata), cada uma com `{ id, codigo, descricao, saldoAtual, estoqueMinimo }`;
- `ultimasMovimentacoes`: as 5 movimentações mais recentes, no formato de `GET /api/movimentacoes`.

Os limites de 20 itens críticos e 5 movimentações são aplicados na consulta ao banco.

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

A pastilha nas respostas é `{ id, codigo, descricao, modelo, aplicacao, unidade, estoqueMinimo, saldoAtual, fabricanteId, criadoEm, atualizadoEm, fabricante }`, com `fabricante` no formato da seção de fabricantes. `modelo` e `aplicacao` podem ser `null`, e `codigo` é único e gravado em maiúsculas. O `saldoAtual` só muda por movimentação, e o banco recusa `saldoAtual` e `estoqueMinimo` negativos.

Nas rotas de pastilha, os textos chegam sem os espaços das pontas, e texto com o caractere nulo (U+0000), inclusive na `busca`, responde `400`. Qualquer campo fora dos listados em cada rota, na query ou no corpo, responde `400` com `codigo: "DADOS_INVALIDOS"`. O `:id` precisa ser um inteiro positivo de até 2147483647; fora disso, `400`. A criação e a edição ficam registradas na auditoria (`pastilha.criada` e `pastilha.atualizada`), com o estado anterior e o novo.

### `GET /api/pastilhas`

Todos os perfis. Existente.

Query, toda opcional:

- `busca`: até 100 caracteres; filtra por trecho de `codigo` ou de `descricao`, sem diferenciar maiúsculas;
- `criticas`: `true` devolve só as pastilhas com `saldoAtual <= estoqueMinimo`, o mesmo critério do painel; `false` equivale a não enviar o filtro.

`busca` e `criticas` podem ser combinados. Outro valor de `criticas`, parâmetro repetido ou parâmetro desconhecido responde `400`.

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

Erros: `400` para `:id` inválido; `404` com `codigo: "NAO_ENCONTRADO"` (`"Pastilha não encontrada"`).

```json
{ "erro": "Pastilha não encontrada", "codigo": "NAO_ENCONTRADO" }
```

### `POST /api/pastilhas`

ADMINISTRADOR e GESTOR (ação `gerenciarPastilhas`). Existente.

Corpo:

- `codigo`: obrigatório, de 1 a 40 caracteres, gravado em maiúsculas;
- `descricao`: obrigatória, de 1 a 200 caracteres;
- `fabricanteId`: obrigatório, inteiro positivo;
- `modelo`: opcional, até 60 caracteres;
- `aplicacao`: opcional, até 200 caracteres;
- `unidade`: opcional, de 1 a 10 caracteres, padrão `"un"`;
- `estoqueMinimo`: opcional, inteiro de 0 a 1.000.000, padrão `0`.

Em `modelo` e `aplicacao`, `null` e texto vazio (ou só com espaços) gravam `null`. Qualquer outro campo, inclusive `saldoAtual`, `id` e relações como `movimentacoes`, responde `400`: a pastilha sempre nasce com saldo `0`.

A criação grava a auditoria e avalia o alerta na mesma transação. Como o saldo nasce `0` e o `estoqueMinimo` nunca é negativo, a pastilha nasce com um alerta `ABERTO`, que fecha sozinho quando uma entrada leva o saldo acima do mínimo.

Resposta `201`: a pastilha criada.

Erros:

- `400` com `codigo: "DADOS_INVALIDOS"` e `campos` para campo ausente, inválido ou não permitido;
- `400` com `codigo: "REFERENCIA_INVALIDA"` para `fabricanteId` inexistente;
- `403`;
- `409` com `codigo: "DUPLICADO"` (`"Já existe uma pastilha com este código"`). O código é comparado já normalizado, sem os espaços das pontas e em maiúsculas: `cnmg 120408` e `CNMG 120408` colidem.

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

ADMINISTRADOR e GESTOR (ação `gerenciarPastilhas`). Existente.

Corpo: só `descricao`, `modelo`, `aplicacao`, `unidade`, `estoqueMinimo` e `fabricanteId`, com as mesmas regras do `POST`. Todos são opcionais, mas pelo menos um precisa vir. Campo ausente mantém o valor atual; em `modelo` e `aplicacao`, `null` e texto vazio limpam o valor. `codigo` e `saldoAtual` nunca são aceitos: o saldo só muda por movimentação. Qualquer outro campo, inclusive `saldoAtual`, `codigo`, `id` e escritas aninhadas como `{ "movimentacoes": { "deleteMany": {} } }`, responde `400` sem alterar nada.

Mudar `estoqueMinimo` reavalia o alerta na mesma transação: abre o alerta quando o saldo fica menor ou igual ao novo mínimo e fecha o alerta aberto quando o saldo fica acima dele.

Resposta `200`: a pastilha atualizada.

Erros:

- `400` com `codigo: "DADOS_INVALIDOS"` para corpo vazio (`"Informe ao menos um campo para atualizar"`), campo inválido ou não permitido, ou `:id` inválido;
- `400` com `codigo: "REFERENCIA_INVALIDA"` para `fabricanteId` inexistente;
- `403`, verificado antes do corpo;
- `404` com `codigo: "NAO_ENCONTRADO"` (`"Pastilha não encontrada"`).

```json
{ "descricao": "Pastilha CNMG 120408 para aço", "estoqueMinimo": 12 }
```

## 8. Fabricantes

O fabricante nas respostas é `{ id, nome, criadoEm, atualizadoEm }`, com `nome` único. O `nome` tem de 2 a 100 caracteres, chega sem os espaços das pontas e não pode ter o caractere nulo (U+0000), e a unicidade vale para o nome já sem esses espaços. A criação e a edição ficam registradas na auditoria (`fabricante.criado` e `fabricante.atualizado`).

Qualquer campo não listado, na query ou no corpo, responde `400` com `codigo: "DADOS_INVALIDOS"`. O `:id` precisa ser um inteiro positivo de até 2147483647.

### `GET /api/fabricantes`

Todos os perfis. Existente.

Sem query: qualquer parâmetro responde `400`.

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

### `GET /api/fabricantes/:id`

Todos os perfis. Existente.

Resposta `200`: o fabricante.

Erros: `400` para `:id` inválido; `404` com `codigo: "NAO_ENCONTRADO"` (`"Fabricante não encontrado"`).

```json
{ "erro": "Fabricante não encontrado", "codigo": "NAO_ENCONTRADO" }
```

### `POST /api/fabricantes`

ADMINISTRADOR e GESTOR (ação `gerenciarFabricantes`). Existente.

Corpo: `{ nome }`, obrigatório. Qualquer outro campo, inclusive `id` e relações como `pastilhas`, responde `400`.

Resposta `201`: o fabricante criado.

Erros:

- `400` com `codigo: "DADOS_INVALIDOS"` e `campos` para nome ausente, fora do tamanho ou campo não permitido;
- `403`;
- `409` com `codigo: "DUPLICADO"` (`"Já existe um fabricante com este nome"`).

```json
{ "nome": "Sandvik" }
```

### `PUT /api/fabricantes/:id`

ADMINISTRADOR e GESTOR (ação `gerenciarFabricantes`). Existente.

Corpo: `{ nome }`, obrigatório, com as mesmas regras do `POST`. Qualquer outro campo, inclusive escritas aninhadas como `{ "pastilhas": { "deleteMany": {} } }`, responde `400` sem alterar nada.

Resposta `200`: o fabricante atualizado.

Erros:

- `400` com `codigo: "DADOS_INVALIDOS"`;
- `403`, verificado antes do corpo;
- `404` com `codigo: "NAO_ENCONTRADO"` (`"Fabricante não encontrado"`);
- `409` com `codigo: "DUPLICADO"` para nome já cadastrado.

```json
{ "nome": "Sandvik Coromant" }
```

## 9. Fornecedores

O fornecedor nas respostas é `{ id, nome, cnpj, contato, criadoEm, atualizadoEm }`. `cnpj` e `contato` podem ser `null`, e `cnpj` é único. A criação e a edição ficam registradas na auditoria (`fornecedor.criado` e `fornecedor.atualizado`).

Campos, com os textos sem os espaços das pontas e sem o caractere nulo (U+0000), que responde `400`:

- `nome`: de 2 a 150 caracteres;
- `cnpj`: opcional, numérico ou alfanumérico, com ou sem máscara;
- `contato`: opcional, até 150 caracteres.

No CNPJ, as 12 primeiras posições aceitam `0-9` e `A-Z`, em maiúsculas ou minúsculas, e os 2 dígitos verificadores são numéricos. Os dígitos são calculados pelo módulo 11, com os pesos de sempre e cada posição valendo o seu código ASCII menos 48. CNPJ com dígito verificador errado ou com todos os dígitos iguais responde `400` (`"CNPJ inválido"`). O CNPJ é gravado e devolvido em maiúsculas, no formato `XX.XXX.XXX/XXXX-XX`, e a duplicidade é conferida nesse formato: `11222333000181` e `11.222.333/0001-81` são o mesmo CNPJ, e `12abc34501de35` vira `12.ABC.345/01DE-35`.

Em `cnpj` e `contato`, `null` e texto vazio (ou só com espaços) gravam `null`. Qualquer campo não listado, na query ou no corpo, responde `400` com `codigo: "DADOS_INVALIDOS"`. O `:id` precisa ser um inteiro positivo de até 2147483647.

### `GET /api/fornecedores`

Todos os perfis. Existente.

Sem query: qualquer parâmetro responde `400`.

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

### `GET /api/fornecedores/:id`

Todos os perfis. Existente.

Resposta `200`: o fornecedor.

Erros: `400` para `:id` inválido; `404` com `codigo: "NAO_ENCONTRADO"` (`"Fornecedor não encontrado"`).

```json
{ "erro": "Fornecedor não encontrado", "codigo": "NAO_ENCONTRADO" }
```

### `POST /api/fornecedores`

ADMINISTRADOR, GESTOR e COMPRADOR (ação `gerenciarFornecedores`). Existente.

Corpo: `{ nome, cnpj?, contato? }`, com `nome` obrigatório. Qualquer outro campo, inclusive `id` e relações como `movimentacoes`, responde `400`.

Resposta `201`: o fornecedor criado, com o CNPJ formatado.

Erros:

- `400` com `codigo: "DADOS_INVALIDOS"` e `campos` para nome ausente ou fora do tamanho, CNPJ inválido, contato longo demais ou campo não permitido;
- `403`;
- `409` com `codigo: "DUPLICADO"` (`"Já existe um fornecedor com este CNPJ"`).

```json
{ "nome": "Distribuidora Alfa", "cnpj": "11222333000181", "contato": "compras@alfa.local" }
```

### `PUT /api/fornecedores/:id`

ADMINISTRADOR, GESTOR e COMPRADOR (ação `gerenciarFornecedores`). Existente.

Corpo: `nome`, `cnpj` e `contato`, com as mesmas regras do `POST`. Todos são opcionais, mas pelo menos um precisa vir. Campo ausente mantém o valor atual; em `cnpj` e `contato`, `null` e texto vazio limpam o valor. Qualquer outro campo, inclusive escritas aninhadas como `{ "movimentacoes": { "deleteMany": {} } }`, responde `400` sem alterar nada.

Resposta `200`: o fornecedor atualizado, com o CNPJ formatado.

Erros:

- `400` com `codigo: "DADOS_INVALIDOS"` para corpo vazio (`"Informe ao menos um campo para atualizar"`), campo inválido ou não permitido, ou `:id` inválido;
- `403`, verificado antes do corpo;
- `404` com `codigo: "NAO_ENCONTRADO"` (`"Fornecedor não encontrado"`);
- `409` com `codigo: "DUPLICADO"` para CNPJ já cadastrado.

```json
{ "nome": "Distribuidora Alfa Ltda", "cnpj": "11.222.333/0001-81", "contato": "(47) 3333-0000" }
```

## 10. Movimentações

A movimentação nas listagens é `{ id, tipo, quantidade, dataHora, documento, observacao, pastilhaId, usuarioId, fornecedorId, pastilha: { codigo, descricao, unidade }, usuario: { nome }, fornecedor: { nome } }`. `tipo` é `ENTRADA` ou `SAIDA`; `usuario` é quem registrou; `documento`, `observacao`, `fornecedorId` e `fornecedor` podem ser `null`.

### `GET /api/movimentacoes`

Todos os perfis. Existente.

Query, toda opcional:

- `pastilhaId`: só as movimentações da pastilha, inteiro de 1 a 2.147.483.647;
- `tipo`: `ENTRADA` ou `SAIDA`;
- `de` e `ate`: datas ISO 8601 aplicadas a `dataHora`, com as duas pontas incluídas. Aceitam só a data (`2026-09-14`), que vale do início ao fim do dia em UTC, ou data e hora com fuso (`2026-09-14T08:00:00Z` ou `2026-09-14T08:00:00-03:00`). Data e hora sem fuso é recusada, assim como a data que, convertida para UTC, cai fora dos anos 1 a 9999 e o `ate` anterior a `de`;
- `pagina` e `tamanho`: `pagina` começa em `1`; `tamanho` tem padrão `20`, mínimo `1` e máximo `100`. Sem `pagina`, `tamanho` é validado, mas não muda a resposta.

Resposta `200`, da mais nova para a mais antiga por `dataHora`, com o `id` desempatando as do mesmo instante:

- sem `pagina`: array com as 100 movimentações mais recentes que atendem aos filtros;
- com `pagina`: `{ dados, total, pagina, tamanho }`, em que `dados` traz as movimentações da página e `total` a quantidade que atende aos filtros. Uma página além do fim devolve `dados` vazio.

Erros: `400` com `codigo: "DADOS_INVALIDOS"` e `campos` para filtros inválidos, inclusive `tamanho` acima de `100`, `pagina` menor que `1` e parâmetros fora desta lista.

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

ENTRADA: todos os perfis (ação `registrarEntrada`). SAIDA: ADMINISTRADOR, GESTOR e OPERADOR (ação `registrarSaida`); o COMPRADOR só registra ENTRADA, e a SAIDA dele recebe `403` antes de o corpo ser validado. Existente.

Corpo:

| Campo          | Regra                                                                                                                                                                               |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tipo`         | Obrigatório: `ENTRADA` ou `SAIDA`.                                                                                                                                                  |
| `pastilhaId`   | Obrigatório, inteiro de 1 a 2.147.483.647; a pastilha precisa existir.                                                                                                              |
| `quantidade`   | Obrigatório, inteiro de 1 a 1.000.000. Texto e decimal são recusados.                                                                                                               |
| `fornecedorId` | Na ENTRADA, obrigatório, inteiro de 1 a 2.147.483.647, e o fornecedor precisa existir. Na SAIDA, não é aceito: enviado, responde `400`.                                             |
| `documento`    | Opcional, texto de até 100 caracteres, como o número da nota fiscal. Os espaços das pontas são removidos; `null` ou só espaços gravam `null`; o caractere nulo (U+0000) é recusado. |
| `observacao`   | Opcional, texto de até 500 caracteres, com as mesmas regras do `documento`.                                                                                                         |

Qualquer outro campo, como `saldoAtual` ou `usuarioId`, responde `400`.

Tudo acontece numa única transação: atualiza o `saldoAtual` (soma a ENTRADA ou desconta a SAIDA), grava a movimentação com o usuário do token como responsável e reavalia o alerta da pastilha:

- saldo menor ou igual ao `estoqueMinimo` e nenhum alerta aberto: abre um alerta;
- saldo acima do `estoqueMinimo` e alerta aberto, como na ENTRADA que repõe o estoque: fecha o alerta automaticamente, com `dataResolucao` preenchida e `resolvidoPorId` nulo.

A SAIDA é atômica: o desconto só acontece se ainda houver saldo, numa única instrução no banco, então o saldo nunca fica negativo, nem com requisições simultâneas. Entre saídas simultâneas, a que não encontrar saldo recebe o `400` de saldo insuficiente, com o saldo daquele momento, no lugar do `500` de antes. A atualização do saldo trava a pastilha até o fim da transação, então as movimentações da mesma pastilha são aplicadas uma de cada vez. O banco continua garantindo que o saldo nunca fica negativo e que há no máximo um alerta aberto por pastilha.

A ENTRADA também é condicional: só soma se o saldo continuar dentro de 2.147.483.647, o maior valor da coluna do banco.

Resposta `201`: `{ movimentacao, saldoAtual }`, com a movimentação gravada (`{ id, tipo, quantidade, dataHora, documento, observacao, pastilhaId, usuarioId, fornecedorId }`, sem os objetos relacionados) e o saldo da pastilha depois do lançamento.

Erros:

- `400` com `codigo: "DADOS_INVALIDOS"` e `campos` para corpo fora das regras acima: `tipo` ausente ou desconhecido, `pastilhaId` ou `quantidade` inválidos, `fornecedorId` ausente ou inválido na ENTRADA, `fornecedorId` enviado na SAIDA (`"A saída não tem fornecedor"`), texto longo demais ou com o caractere nulo, e campo extra (`"Campo não permitido: saldoAtual"`);
- `400` `"Saldo insuficiente: há 3 un em estoque"`, sem `codigo`, com o saldo e a unidade da pastilha, inclusive para a SAIDA que perde a disputa com outra simultânea;
- `400` `"Entrada acima do saldo máximo de 2147483647 un: há 2147483000 un em estoque"`, sem `codigo`, para a ENTRADA que passaria do limite do saldo;
- `400` `"Fornecedor não encontrado"` com `codigo: "REFERENCIA_INVALIDA"` para `fornecedorId` inexistente na ENTRADA;
- `403` `"Seu perfil só pode registrar entradas"`, para SAIDA registrada pelo COMPRADOR, antes da validação do corpo;
- `404` `"Pastilha não encontrada"`, sem `codigo`. A pastilha é conferida antes do fornecedor.

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

O alerta nas listagens é `{ id, dataGeracao, situacao, dataResolucao, pastilhaId, resolvidoPorId, pastilha: { codigo, descricao, saldoAtual, estoqueMinimo }, resolvidoPor }`, com `situacao` `ABERTO` ou `RESOLVIDO`. `dataResolucao` e `resolvidoPorId` ficam `null` enquanto o alerta está aberto. No fechamento automático, `dataResolucao` é preenchida e `resolvidoPorId` fica `null`.

`resolvidoPor` é `{ id, nome }` de quem resolveu manualmente, ou `null` quando o alerta está aberto ou foi fechado automaticamente. Do usuário saem só esses dois campos.

Um alerta abre quando, depois de uma movimentação, o saldo fica menor ou igual ao `estoqueMinimo` e não há alerta aberto para a pastilha. Se alguém resolver o alerta com o saldo ainda baixo, a próxima movimentação abre outro.

### `GET /api/alertas`

Todos os perfis. Existente.

Query, toda opcional:

- `situacao`: `ABERTO` (padrão), `RESOLVIDO` ou `TODAS`;
- `pagina` e `tamanho`: `pagina` começa em `1`; `tamanho` tem padrão `20`, mínimo `1` e máximo `100`. Sem `pagina`, `tamanho` é validado, mas não muda a resposta.

Outro valor ou outro parâmetro responde `400` com `codigo: "DADOS_INVALIDOS"`.

Resposta `200`, do alerta mais novo para o mais antigo por `dataGeracao`, com o `id` desempatando:

- sem `pagina`: array com os 100 alertas mais recentes da situação pedida;
- com `pagina`: `{ dados, total, pagina, tamanho }`, como na listagem de movimentações.

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

Sem corpo. Marca o alerta aberto como `RESOLVIDO`, grava em `dataResolucao` o momento da resolução e em `resolvidoPorId` o usuário logado, e registra `alerta.resolvido` na trilha de auditoria, tudo na mesma transação.

A resolução trava a pastilha do alerta, como as movimentações, e por isso não se sobrepõe ao fechamento automático por uma ENTRADA simultânea: se a ENTRADA fechar o alerta antes, a resolução manual recebe o `409`. De duas resoluções simultâneas, só uma vence, e a outra também recebe o `409`.

Resposta `200`: o alerta atualizado, sem os objetos `pastilha` e `resolvidoPor`: `{ id, dataGeracao, situacao, dataResolucao, pastilhaId, resolvidoPorId }`.

Erros:

- `400` com `codigo: "DADOS_INVALIDOS"` para `:id` que não é inteiro de 1 a 2.147.483.647;
- `403` para OPERADOR e COMPRADOR;
- `404` com `codigo: "NAO_ENCONTRADO"` (`"Registro não encontrado"`) para alerta inexistente;
- `409` `"Este alerta já foi resolvido"` com `codigo: "ALERTA_JA_RESOLVIDO"` para alerta já resolvido, manual ou automaticamente. Nada é alterado.

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
