# ADR-0007: Resultados de testes versionados

## Situação

Aceita, 14/09/2026.

## Contexto

O projeto é avaliado na UC Projeto Aplicado IV e precisa mostrar que os testes rodaram sobre o código entregue.

O CI guarda os relatórios como artefato por 30 dias, e depois eles somem. Os artefatos também não ficam amarrados a uma versão.

Os relatórios brutos (JUnit e cobertura) trazem caminhos absolutos da máquina e o hostname. Esses dados não devem ir para o repositório.

## Decisão

O script `npm run test:relatorio` roda as suítes e grava um snapshot versionado em `tests/results/<AAAA-MM-DD>_<sha7>/`, em que `<sha7>` é o commit testado.

- **`latest/` fica ignorado.** Os reporters escrevem em `tests/results/latest/`, que está no `.gitignore`. Só as pastas datadas são versionadas, junto com o `HISTORICO.md`, regenerado a cada execução.
- **Roda só na `main` limpa.** O script recusa árvore com alterações não commitadas. A opção `--permitir-sujo` serve só para ensaio, nunca para evidência oficial.
- **A evidência entra por um PR próprio**, só com `tests/results/`. A branch sai do commit testado, e o PR é mesclado com merge commit, sem squash e sem rebase.
- **A tag aponta para o commit de evidência**, cujo pai é o código testado. `git rev-parse vX.Y.Z^` deve ser igual ao campo `sha` do `resumo.json`.
- **Caminhos absolutos e hostname são removidos.** Os caminhos viram relativos, e o atributo `hostname` sai do JUnit. Se ainda sobrar caminho absoluto ou termo proibido, o script aborta sem gravar nada.

O protocolo completo está em [tests/results/README.md](../../tests/results/README.md).

## Alternativas consideradas

- **Só os artefatos do CI.** Expiram em 30 dias e não ficam ligados a uma tag.
- **Comitar os resultados junto com o código testado.** O resumo teria de citar o próprio commit que o contém, e o `sha` só existe depois do commit.
- **Guardar os relatórios fora do repositório.** Separaria a evidência do histórico do código e dependeria de outro lugar para continuar existindo.

## Consequências

- Cada versão tem evidência auditável: quais testes rodaram, em que commit, com que cobertura e com qual resultado do `npm audit`.
- O repositório cresce um pouco a cada snapshot, com arquivos de texto pequenos.
- O processo exige disciplina: `main` limpa, PR só de evidência e merge commit.
- Nenhum dado da máquina de quem rodou os testes vai para o repositório.
- Situação em 14/09/2026: o script e o protocolo entraram na `main` com o PR #13. O primeiro snapshot, `tests/results/2026-09-14_fb30118/`, e o `HISTORICO.md` entraram com o PR #17.
