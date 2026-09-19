# Segurança

## Relatar uma vulnerabilidade

Abra a aba **Security** do repositório no GitHub e escolha **Report a vulnerability**. Descreva o comportamento, o impacto, a versão ou commit afetado e passos mínimos para reproduzir. Use esse canal privado para detalhes que possam facilitar a exploração. Não publique credenciais nem dados reais no relato ou em uma issue pública. A equipe analisa o relato e coordena a correção e a divulgação pelo próprio canal. Não há e-mail pessoal para receber relatos.

## Versão e escopo

| Versão             | Situação                                                                     |
| ------------------ | ---------------------------------------------------------------------------- |
| `main` / `0.2.x`   | Código em desenvolvimento, com correções de segurança avaliadas nesta linha. |
| `1.0.0`            | Entrega planejada; será a linha suportada após a publicação.                 |
| Versões anteriores | Sem manutenção.                                                              |

O escopo inclui a interface web, a API, o esquema de dados e a implantação descrita no [README](README.md). Ambientes locais e dados de demonstração não devem usar segredos de produção.

## Controles em uso

- A API exige token nas rotas protegidas e confere permissões por ação; veja [autenticação](backend/src/middlewares/auth.ts), [rotas](backend/src/routes/index.ts) e [matriz de perfis](docs/perfis-e-permissoes.md).
- Cada requisição revalida a sessão no banco. Trocar a senha, mudar o perfil ou desativar o usuário invalida os tokens emitidos antes. A senha inicial e a redefinida por um administrador [precisam ser trocadas](backend/src/middlewares/exigir-senha-atualizada.ts) no primeiro acesso.
- Os [limites de requisição](backend/src/middlewares/rate-limit.ts) respondem 429 com `Retry-After`: falhas de login por IP e e-mail, senha atual errada na troca de senha, total por IP e total por usuário.
- Senhas são comparadas com hash bcrypt. A [configuração](backend/src/config/env.ts) exige chave de assinatura adequada e custo bcrypt de pelo menos 12 em produção. As [variáveis de ambiente](.env.example) ficam fora do controle de versão.
- A entrada das rotas passa pelos [esquemas Zod](backend/src/middlewares/validar.ts). A [migration de integridade](backend/prisma/migrations/20260914130000_seguranca_integridade/migration.sql) protege saldo, quantidade e unicidade do alerta aberto.
- A [auditoria](backend/src/services/auditoria.service.ts) remove campos sensíveis antes de gravar estados. O [dicionário do banco](docs/banco-de-dados.md#auditoria) descreve a tabela.
- O [nginx](frontend/nginx.conf) define política de conteúdo e cabeçalhos de proteção. A [API](backend/src/app.ts) aplica os próprios cabeçalhos e impede o cache das respostas. O banco é publicado apenas no host, e a API não é publicada diretamente pelo [Compose](docker-compose.yml).

## Riscos aceitos

O token da sessão fica no `localStorage` do navegador. Isso exige atenção especial a injeção de script e ao acesso físico ao computador. A decisão está no [ADR-0005](docs/decisoes/ADR-0005-token-jwt-no-localstorage-como-risco-aceito.md).

A implantação padrão usa HTTP sem TLS na rede local. Quem controla a rede pode observar o tráfego, inclusive credenciais e tokens. Restrinja o acesso à rede confiável ou configure um proxy com TLS quando o ambiente exigir confidencialidade no transporte. O [README](README.md#como-rodar-com-docker) descreve a instalação.

## Dependências

Os pacotes têm versões travadas pelos arquivos `package-lock.json` de cada projeto. Instale com `npm ci`. O [workflow de integração](.github/workflows/ci.yml) executa `npm audit --omit=dev --audit-level=high` para backend e frontend. Revise alertas, atualize dependências em mudanças separadas e rode os testes e o build antes de incorporar a atualização.
