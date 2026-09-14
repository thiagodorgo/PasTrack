# ADR-0005: Token JWT no localStorage como risco aceito

## Situação

Aceita, 14/09/2026.

## Contexto

O login devolve um token JWT. O frontend guarda o token no `localStorage`, na chave `pastrack:token`, e o envia no cabeçalho `Authorization: Bearer`.

Qualquer script que rode na página consegue ler o `localStorage`. Se houver uma falha de XSS, o token pode ser roubado e usado até expirar.

No MVP, a API confiava no conteúdo do token até ele expirar. Um usuário desativado continuava com acesso. Esse defeito está registrado como `it.fails` em `backend/tests/security/pendencias.spec.ts`.

O sistema roda por HTTP numa rede local, e o prazo de 18/09/2026 não comporta trocar o modelo de sessão.

## Decisão

Manter o token no `localStorage` e aceitar o risco, com estas mitigações:

| Mitigação                    | Como funciona                                                                                                                                       |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Expiração de 8 h             | `JWT_EXPIRES_IN=8h` por padrão. Um token roubado vale no máximo 8 h.                                                                                |
| CSP no nginx                 | `script-src 'self'`, `object-src 'none'`, `base-uri 'self'` e `frame-ancestors 'none'`. Script inline ou de outra origem não roda.                  |
| Nenhum sink de XSS no código | O frontend não usa `dangerouslySetInnerHTML`, `innerHTML`, `eval` nem `new Function`. O React escapa o texto exibido.                               |
| Usuário recarregado do banco | A cada requisição, a API busca o usuário pelo `id` do token e confere se ele está ativo. O perfil que vale é o do banco, não o do token.            |
| `versaoToken`                | O token carrega a versão do usuário. A versão sobe na troca de senha, na desativação e na mudança de perfil. Um token com versão antiga recebe 401. |

A alternativa, cookie `httpOnly` com proteção contra CSRF, fica registrada como evolução.

## Alternativas consideradas

- **Cookie `httpOnly` com `SameSite` e token anti-CSRF.** O script da página deixa de enxergar o token. Exige mudar o login, a API, o frontend e os testes, e acrescenta a proteção contra CSRF. Fica como evolução.
- **Manter como no MVP, sem mitigações.** Um token roubado, ou de um usuário desativado, valeria até expirar.

## Consequências

- Uma falha de XSS ainda permitiria usar o token por até 8 h. Por isso a CSP e a regra de nenhum sink são obrigatórias. Um PR que enfraqueça qualquer uma delas precisa revisar este ADR.
- A CSP ainda permite estilos inline (`style-src 'unsafe-inline'`). Scripts inline continuam bloqueados.
- Desativar um usuário, trocar a senha dele ou mudar o perfil derruba as sessões dele na hora.
- Trocar o `JWT_SECRET` derruba as sessões de todos ([operacao.md](../operacao.md#trocar-o-jwt_secret)).
- Cada requisição autenticada faz uma consulta a mais no banco.
- Situação em 14/09/2026: a expiração de 8 h, a CSP e a coluna `versao_token` já estão na `main`. O recarregamento do usuário e a conferência da versão entram na próxima entrega de autenticação, e o `it.fails` do usuário desativado vira teste normal.
