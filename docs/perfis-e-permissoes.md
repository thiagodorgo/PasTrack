# Perfis e permissões

Esta tabela reflete o objeto PERMISSOES em [config/permissoes.ts](../backend/src/config/permissoes.ts).

| Ação                    | ADMINISTRADOR | GESTOR | OPERADOR | COMPRADOR | Descrição                                      |
| ----------------------- | ------------- | ------ | -------- | --------- | ---------------------------------------------- |
| `consultar`             | ✔             | ✔      | ✔        | ✔         | Consulta os dados do sistema.                  |
| `gerenciarPastilhas`    | ✔             | ✔      | —        | —         | Cria e atualiza cadastros de pastilhas.        |
| `gerenciarFabricantes`  | ✔             | ✔      | —        | —         | Cria e atualiza cadastros de fabricantes.      |
| `gerenciarFornecedores` | ✔             | ✔      | —        | ✔         | Cria e atualiza cadastros de fornecedores.     |
| `registrarEntrada`      | ✔             | ✔      | ✔        | ✔         | Registra entradas no estoque.                  |
| `registrarSaida`        | ✔             | ✔      | ✔        | —         | Registra saídas do estoque.                    |
| `resolverAlerta`        | ✔             | ✔      | —        | —         | Resolve alertas de estoque manualmente.        |
| `gerenciarUsuarios`     | ✔             | —      | —        | —         | Gerencia os cadastros e o acesso dos usuários. |
