# Marca do PasTrack

O símbolo é uma pastilha de corte vista em perspectiva isométrica: a face de cima, as duas laterais que mostram a espessura, o rebaixo do quebra-cavaco e o furo central de fixação. Ao lado vem o nome, com "Pas" na cor do texto e "Track" em destaque.

A fonte de verdade é o componente [`Logo.tsx`](../../frontend/src/components/Logo.tsx), usado no menu lateral e na tela de login. Os arquivos desta pasta reproduzem o mesmo desenho para usos fora do sistema, como documentos, slides e vídeos. Nos SVG, o nome está convertido em contornos, então eles abrem iguais em qualquer computador, sem depender da fonte instalada.

## Arquivos

| Arquivo                                                  | Uso                                                                  |
| -------------------------------------------------------- | -------------------------------------------------------------------- |
| [pastrack-logo.svg](pastrack-logo.svg)                   | Símbolo e nome sobre fundo claro (documentos, README, slides).       |
| [pastrack-logo-claro.svg](pastrack-logo-claro.svg)       | Símbolo e nome sobre o azul do menu ou outro fundo escuro.           |
| [pastrack-simbolo.svg](pastrack-simbolo.svg)             | Só o símbolo, sobre fundo claro.                                     |
| [pastrack-simbolo-claro.svg](pastrack-simbolo-claro.svg) | Só o símbolo, sobre fundo escuro.                                    |
| [pastrack-icone.svg](pastrack-icone.svg)                 | Ícone quadrado: símbolo claro sobre o azul, com cantos arredondados. |
| `pastrack-logo.png`, `pastrack-logo-claro.png`           | As duas versões do logo em PNG, para onde SVG não é aceito.          |
| `pastrack-icone-512.png`                                 | O ícone em 512 × 512 px.                                             |

No sistema, o ícone fica em [`frontend/public/`](../../frontend/public/): `favicon.svg` é o ícone da aba do navegador e `apple-touch-icon.png` (180 × 180 px) é o atalho na tela inicial do celular. Os dois são declarados no [`index.html`](../../frontend/index.html), junto com a cor do tema.

## Cores

| Cor              | Hex                   | Onde aparece                                                      |
| ---------------- | --------------------- | ----------------------------------------------------------------- |
| Azul PasTrack    | `#1E3A8A`             | Menu lateral, botões principais, furo do símbolo, fundo do ícone. |
| Azul destaque    | `#A5BDFC`             | "Track" sobre fundo escuro.                                       |
| Texto            | `#0F172A`             | "Pas" sobre fundo claro.                                          |
| Face clara       | `#FFFFFF`             | Face de cima do símbolo sobre fundo escuro.                       |
| Laterais claras  | `#A9C2FF` e `#7C9EF0` | Espessura do símbolo sobre fundo escuro.                          |
| Face escura      | `#E0E7FF`             | Face de cima do símbolo sobre fundo claro.                        |
| Laterais escuras | `#3B5BBF` e `#1E3A8A` | Espessura do símbolo sobre fundo claro.                           |

## Tipografia

O sistema usa a [Inter](https://rsms.me/inter/) para textos e a [JetBrains Mono](https://www.jetbrains.com/lp/mono/) para códigos de pastilha e números de documento. As duas vêm no próprio pacote do front-end (`@fontsource-variable`), sem depender de serviço externo. No nome da marca, a Inter vai em negrito (700) com espaçamento de −0,02 em.

## Cuidados

- Use a versão clara sobre fundos escuros e a versão escura sobre fundos claros. Não troque as cores das partes do símbolo.
- Mantenha a proporção. Para mudar o tamanho, mude só a largura ou só a altura.
- Deixe em volta do logo um espaço livre de pelo menos a altura do furo central do símbolo.
- Quando o desenho mudar no `Logo.tsx`, gere de novo os arquivos desta pasta e os ícones de `frontend/public/`.
