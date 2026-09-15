# ADR-0007: Resultados de testes versionados

## Situação

Aceita, 14/09/2026. Revisada em 15/09/2026.

O snapshot `2026-09-14_fb30118` testou o commit `fb30118`, do PR #15, mas entrou na `main` pelo PR #17, depois do PR #16. Por isso, o commit de evidência na `main` (`0593d42`) tem como pai o `de33f29`, do PR #16, e não o código testado. A conferência `git rev-parse <tag>^` falharia nesse commit.

O snapshot continua valendo como registro dos testes de `fb30118`. A regra de merge da Decisão foi revisada para que o desvio não se repita.

## Contexto

O projeto é avaliado na UC Projeto Aplicado IV e precisa mostrar que os testes rodaram sobre o código entregue.

O CI guarda os relatórios como artefato por 30 dias, e depois eles somem. Os artefatos também não ficam amarrados a uma versão.

Os relatórios brutos (JUnit e cobertura) trazem caminhos absolutos da máquina e o hostname. Esses dados não devem ir para o repositório.

## Decisão

O script `npm run test:relatorio` roda as suítes e grava um snapshot versionado em `tests/results/<AAAA-MM-DD>_<sha7>/`, em que `<sha7>` é o commit testado.

- **`latest/` fica ignorado.** Os reporters escrevem em `tests/results/latest/`, que está no `.gitignore`. Só as pastas datadas são versionadas, junto com o `HISTORICO.md`, regenerado a cada execução.
- **Roda só na `main` limpa.** O script recusa árvore com alterações não commitadas. A opção `--permitir-sujo` serve só para ensaio, nunca para evidência oficial.
- **A evidência entra por um PR próprio**, só com `tests/results/`, criado a partir do commit testado.
- **Merge só por squash, logo depois de gerar.** O PR de evidência é mesclado assim que o snapshot fica pronto, sem nenhum outro merge na `main` no meio. Assim, o commit do squash tem como pai o código testado. Se a `main` andar antes do merge, o snapshot é gerado de novo sobre a `main` nova.
- **A tag aponta para o commit de evidência**, cujo pai é o código testado. `git rev-parse vX.Y.Z^` deve ser igual ao campo `sha` do `resumo.json`.
- **Caminhos absolutos e hostname são removidos.** Os caminhos viram relativos, e o atributo `hostname` sai do JUnit. Se ainda sobrar caminho absoluto ou termo proibido, o script aborta sem gravar nada.

O script e a estrutura das pastas estão em [tests/results/README.md](../../tests/results/README.md). A regra de merge deste ADR substitui a orientação de merge commit do passo 3 daquele protocolo.

## Alternativas consideradas

- **Só os artefatos do CI.** Expiram em 30 dias e não ficam ligados a uma tag.
- **Comitar os resultados junto com o código testado.** O resumo teria de citar o próprio commit que o contém, e o `sha` só existe depois do commit.
- **Guardar os relatórios fora do repositório.** Separaria a evidência do histórico do código e dependeria de outro lugar para continuar existindo.
- **Merge commit no PR de evidência.** Manteria o commit testado como pai mesmo com outros merges no meio, mas o repositório só mescla por squash.

## Consequências

- Cada versão tem evidência auditável: quais testes rodaram, em que commit, com que cobertura e com qual resultado do `npm audit`.
- O repositório cresce um pouco a cada snapshot, com arquivos de texto pequenos.
- O processo exige disciplina: `main` limpa, PR só de evidência, merge por squash logo em seguida e nenhum outro merge no meio.
- Um snapshot que perdeu a vez, porque a `main` andou antes do merge, é descartado e gerado de novo.
- Nenhum dado da máquina de quem rodou os testes vai para o repositório.
- Situação em 15/09/2026: o script e o protocolo entraram na `main` com o PR #13. O primeiro snapshot, `tests/results/2026-09-14_fb30118/`, e o `HISTORICO.md` entraram com o PR #17, com o desvio descrito na Situação.
