# Segurança do PasTrack

Como o sistema se protege, o que ele deliberadamente não protege e onde está a prova de cada controle.

Para relatar uma vulnerabilidade, veja o [SECURITY.md](../SECURITY.md). Os documentos que sustentam este aqui são o [modelo de ameaças](seguranca/modelo-de-ameacas.md) e a [autoavaliação ASVS 4.0.3 nível 1](seguranca/asvs-l1-checklist.md).

## Onde o sistema roda

O PasTrack é instalado num computador da empresa, com Docker Compose, e usado pelos outros computadores da rede local. Não é um serviço publicado na internet. Três decisões vêm daí:

- o transporte é HTTP, porque a rede é interna e não há certificado;
- não há segundo fator de autenticação;
- a instalação não fala com serviços externos: nada de e-mail, de consulta a bases de senhas vazadas ou de telemetria.

Essas escolhas aparecem como desvios na autoavaliação. Cada uma está justificada abaixo, com o que fazer se o cenário mudar.

## O que está protegido

### Quem entra

- A senha tem no mínimo 12 caracteres, com letra e número, até 72 bytes. Ela não pode conter a parte do e-mail antes do `@` nem estar na lista de senhas comuns.
- O hash é bcrypt, com custo mínimo de 12 em produção, exigido na subida. Quando o custo muda, o hash é regravado no próximo login certo.
- O login recusado responde sempre a mesma mensagem e leva o mesmo tempo, com ou sem usuário: a comparação roda contra um hash fictício quando o e-mail não existe.
- Cinco senhas erradas para o mesmo IP e e-mail em 15 minutos bloqueiam novas tentativas por um tempo, com `429` e `Retry-After`. Só a credencial recusada conta.
- A senha inicial do administrador vem do `.env` e é temporária: enquanto não for trocada, o resto do sistema responde `403`.

### A sessão

- O token é um JWT assinado em HS256, com emissor e público próprios, e validade de 8 horas por padrão.
- **Cada requisição revalida a sessão no banco.** O usuário precisa existir, estar ativo e ter a mesma versão de token. Trocar a senha, redefini-la, mudar o perfil ou desativar o usuário invalida na hora todos os tokens emitidos antes.
- O token viaja no cabeçalho `Authorization`, nunca na URL, e as respostas da API saem com `Cache-Control: no-store`.

### Quem pode o quê

- A matriz de permissões fica num lugar só, em `backend/src/config/permissoes.ts`, e é aplicada no servidor. A tela esconde o que o perfil não pode, mas quem chamar a API direto recebe `403`.
- A documentação da matriz é [gerada a partir do código](perfis-e-permissoes.md), e o CI falha se as duas divergirem.
- Há travas para o sistema não ficar sem dono: ninguém desativa ou rebaixa o último administrador ativo, nem redefine a própria senha pela gestão de usuários.

### Os dados

- Toda entrada passa por um esquema Zod que só aceita os campos previstos. Campo desconhecido, tipo errado ou valor fora do limite responde `400`, com o nome do campo.
- O saldo não é campo de cadastro: ele só muda por movimentação, numa transação com atualização condicional, que impede saldo negativo mesmo com dois lançamentos ao mesmo tempo.
- O banco reforça as mesmas regras com restrições `CHECK` e com um índice único parcial que impede dois alertas abertos para a mesma pastilha.
- Criações e alterações de pastilhas, fabricantes, fornecedores e usuários, trocas e redefinições de senha e o ciclo dos alertas ficam na trilha de auditoria, gravada na mesma transação da mudança e sem guardar senha.

### O transporte e o navegador

- O nginx envia CSP, `nosniff`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy` e `charset=utf-8`, e não revela a própria versão.
- A API envia os próprios cabeçalhos, sem HSTS e sem `upgrade-insecure-requests`, que quebrariam o acesso por HTTP na rede local.
- O CORS libera só as origens configuradas. Pelo nginx, o site e a API ficam na mesma origem.
- A API não é publicada pelo Compose: só o nginx aceita conexão da rede. A porta do banco fica restrita ao próprio servidor.
- Os containers não rodam como root: a API roda como `node` e o nginx usa a imagem sem privilégio.

### Erros e registros

- O `500` responde com uma mensagem genérica e um `requestId`, que também vai no cabeçalho `X-Request-Id`. O detalhe fica no log do servidor.
- O logger redige cabeçalho de autorização e campos de senha. A auditoria remove campos sensíveis antes de gravar o antes e o depois.

### A cadeia de dependências

- As versões ficam travadas nos `package-lock.json`, e a instalação usa `npm ci`.
- O CI roda `npm audit --omit=dev --audit-level=high` no backend e no frontend, e a análise de código do GitHub roda a cada PR.
- Os alertas de dependência ficam ligados, mas os PRs automáticos não: as correções entram pelos nossos PRs, com teste.

## Riscos aceitos

| Risco                                                 | Por quê                                                                                                                                   | O que reduz o dano                                                                                                  | Quando revisar                                                         |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **HTTP sem TLS na rede local**                        | Não há certificado nem domínio interno; a rede é da própria fábrica                                                                       | Rede local isolada; o guia explica como pôr um proxy com TLS na frente                                              | Antes de qualquer acesso de fora da fábrica                            |
| **Token no `localStorage`**                           | Sem cookie, a API fica simples e sem CSRF; a decisão está no [ADR-0005](decisoes/ADR-0005-token-jwt-no-localstorage-como-risco-aceito.md) | CSP sem origem externa, ausência de injeção de HTML no código, expiração de 8 horas e revogação por versão de token | Se o sistema for publicado, ou ao surgir conteúdo de terceiros na tela |
| **Sem segundo fator, inclusive para o administrador** | Sistema interno, com poucos usuários e sem canal de e-mail                                                                                | Senha forte obrigatória, limite de tentativas e trilha de auditoria                                                 | Se o sistema for publicado, ou ao passar de uma dezena de usuários     |
| **Sem aviso ao usuário quando a senha muda**          | A instalação não envia e-mail                                                                                                             | A mudança fica na auditoria, e o administrador vê                                                                   | Quando a empresa tiver um servidor de e-mail disponível                |
| **Senha conferida só contra uma lista local**         | A instalação não acessa a internet para consultar bases de vazamento                                                                      | Lista de senhas comuns, mínimo de 12 caracteres e proibição do e-mail na senha                                      | Se a máquina passar a ter acesso à internet                            |
| **Exige letra e número**                              | O ASVS desaconselha regra de composição, mas ela evita senhas triviais de 12 dígitos                                                      | Nenhuma outra regra de composição, e nenhuma troca periódica                                                        | Se um dia houver medidor de força de verdade                           |
| **Consulta ampla para todos os perfis**               | O estoque é da empresa inteira; separar por dono não faz sentido aqui                                                                     | Escrita restrita por perfil e trilha de auditoria                                                                   | Se o sistema atender mais de uma unidade                               |

## Dados pessoais e LGPD

O sistema guarda, de pessoa física, apenas **nome e e-mail dos usuários** e o **hash da senha**. Não há CPF, endereço, telefone nem dado de cliente. O e-mail pode ser o corporativo.

- **Finalidade:** identificar quem registra cada movimentação, o que é exigência de controle interno do estoque.
- **Retenção:** o usuário que sai da empresa é desativado, não apagado, porque o nome dele aparece no histórico das movimentações e na auditoria. Apagar o registro quebraria a rastreabilidade.
- **Acesso:** só o ADMINISTRADOR vê e gerencia a lista de usuários.
- **Backup:** o arquivo de backup contém esses dados e os hashes. Ele precisa do mesmo cuidado do `.env`.

Duas obrigações dependem da empresa, não do software, e por isso aparecem como pendências na autoavaliação:

1. **Avisar o funcionário** de que o nome e o e-mail dele ficam registrados no sistema, para que finalidade e por quanto tempo. Um aviso curto, entregue na abertura da conta, resolve.
2. **Atender um pedido de cópia ou exclusão.** Hoje isso é feito à mão, pelo administrador, consultando o banco. Uma rota de exportação entra como evolução, se a empresa precisar.

## Como conferir

| Controle                                  | Prova                                                                                                           |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Limite de tentativas de login             | `backend/tests/security/bruteforce.spec.ts`                                                                     |
| Sessão revalidada e revogação de token    | `backend/tests/security/usuario-inativo.spec.ts`, `auth-tokens.spec.ts`                                         |
| Troca obrigatória no primeiro acesso      | `backend/tests/security/primeiro-acesso.spec.ts`                                                                |
| Política de senha                         | `backend/tests/unit/politica-senha.spec.ts`                                                                     |
| Permissões por perfil                     | `backend/tests/security/rbac.spec.ts`: as 26 rotas pelos 4 perfis e sem token                                   |
| Travas dos administradores                | `backend/tests/security/travas-administradores.spec.ts`                                                         |
| Campo desconhecido e atribuição em massa  | `backend/tests/integration/campos-nao-permitidos.spec.ts`                                                       |
| Saldo sob concorrência                    | `backend/tests/security/concorrencia.spec.ts`                                                                   |
| Cabeçalhos e CORS                         | `backend/tests/security/headers.spec.ts` e o `compose-smoke` do CI                                              |
| Erro sem vazamento e log redigido         | `backend/tests/unit/erros-banco.spec.ts`, `unit/logger.spec.ts`                                                 |
| Instalação nova funcionando ponta a ponta | `scripts/verificar-implantacao.mjs` e a [evidência da implantação](testes/evidencias/2026-09-19-implantacao.md) |

A execução mais recente das suítes fica em [tests/results/](../tests/results/README.md).

## O que ainda falta

| Item                                                                 | Situação                                   |
| -------------------------------------------------------------------- | ------------------------------------------ |
| Aviso de privacidade ao funcionário e atendimento a pedidos de dados | Dependem da empresa; modelo sugerido acima |
