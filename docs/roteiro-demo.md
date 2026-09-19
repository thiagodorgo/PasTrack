# Roteiro da demonstração

Demonstração de 10 minutos do PasTrack, para a banca e para a DDA Usinagem. O roteiro mostra o ciclo completo do estoque e termina pela qualidade da entrega.

Ensaie pelo menos duas vezes a partir de uma instalação zerada. Quem apresenta deve conseguir seguir o roteiro sem ler.

Os fatos deste roteiro foram conferidos numa instalação real, passo a passo: veja o [ensaio de 19/09](testes/evidencias/2026-09-19-ensaio-demo.md).

## Preparo, antes de começar

1. **Instalação limpa, com dados de demonstração.** No `.env`, use `SEED_DEMO=true` e preencha `SEED_DEMO_SENHA` e `SEED_ADMIN_SENHA` com senhas de 12 caracteres ou mais, com letra e número.

   ```bash
   docker compose down -v
   docker compose up -d --build --wait
   ```

   A instalação nasce com: 2 fabricantes (Sandvik Coromant e Iscar), 2 fornecedores, 3 pastilhas e 3 usuários de demonstração, um por perfil. A pastilha **WNMG 080408-TF** nasce com saldo 6 e mínimo 8, ou seja, **já em alerta**. É ela que conduz a demonstração.

2. **Duas janelas do navegador**, lado a lado ou em abas separadas, em janelas anônimas diferentes para as sessões não se misturarem:
   - **Janela A:** administrador, ainda **sem entrar**. O primeiro acesso é parte da demonstração.
   - **Janela B:** já logada como `operador@pastrack.local`, na tela de Movimentações.

3. **Tenha à mão**, num bloco de notas: o e-mail e a senha do administrador, a senha dos usuários de demonstração e o endereço do sistema.

4. **Plano B:** se o Docker falhar na hora, use a gravação dos testes e as telas do relatório. Diga que é gravação, não esconda.

## Roteiro

### 1. O problema, em 45 segundos

Sem tela. Conte o que a DDA vive hoje:

> O controle é uma planilha num computador. Várias pessoas editam, ninguém sabe quem deu baixa, e o sistema não avisa quando a pastilha está acabando. O resultado é máquina parada por falta de pastilha, e compra em duplicidade.

Diga o que o PasTrack faz em uma frase: **o saldo deixa de ser digitado e passa a ser consequência das entradas e saídas, com alerta automático de reposição.**

### 2. Primeiro acesso, 1 minuto — janela A

1. Entre com o e-mail e a senha do administrador, a mesma que está no arquivo de configuração.
2. O sistema **exige a troca da senha** antes de liberar qualquer coisa. Mostre a lista de regras marcando o que falta enquanto você digita.
3. Troque a senha e entre.

Diga por quê:

> A senha que nasce com a instalação é temporária de propósito. Nenhum sistema deve ficar com senha padrão, e aqui ela não serve para nada além do primeiro acesso.

### 3. Painel, 45 segundos

Mostre os quatro blocos: total de pastilhas, alertas abertos, itens críticos e últimas movimentações.

> O encarregado abre isto no começo do turno e já sabe o que está faltando.

Aponte a **WNMG 080408-TF** entre os itens críticos.

### 4. Cadastro de pastilha, 1 minuto — janela A

1. Vá em **Pastilhas**. Mostre a busca: digite `wnmg`.
2. Mostre os selos: **Normal**, **Crítico** e, se houver, **Sem mínimo**.
3. Clique em **Editar** na WNMG. Mostre que **código e saldo aparecem como texto, não como campo**.

> O saldo não é editável em lugar nenhum do sistema. Ele só muda por movimentação, e é isso que faz o número valer alguma coisa numa auditoria.

### 5. O ciclo do estoque, 2 minutos — janela B, como operador

Esta é a parte central. Faça tudo na WNMG, que está com saldo 6 e mínimo 8.

1. **Entrada de 5 unidades**, com fornecedor e uma nota fiscal no campo documento. O saldo vai para 11.
   - Chame a atenção: o fornecedor é obrigatório na entrada, para saber de quem veio o lote.
   - **O alerta se resolve sozinho**, porque o saldo passou do mínimo.
2. **Saída de 3 unidades**, com a ordem de serviço no documento. O saldo volta para 8.
   - **O alerta abre de novo sozinho**, porque 8 é o mínimo.
3. **Tente uma saída de 100 unidades.** O sistema recusa e diz quanto há em estoque.

> O saldo nunca fica negativo, nem quando duas pessoas dão baixa ao mesmo tempo: quem decide é o banco de dados, numa operação só.

### 6. Alertas, 1 minuto — janela A

1. Vá em **Alertas**. Mostre o filtro **Abertos**, **Resolvidos** e **Todos**.
2. No filtro Resolvidos, mostre a linha da entrada que você acabou de fazer: ela diz **"automaticamente pela reposição"**.
3. No filtro Abertos, resolva o alerta da WNMG à mão, com a confirmação.

> Resolver à mão serve para quando a compra já foi feita e o alerta não deve mais aparecer como pendente. Isso não muda o saldo, e fica registrado quem resolveu.

### 7. Permissão por perfil, 1 minuto

Compare as duas janelas:

- Na **janela B**, como operador: não existe o botão **Nova pastilha**, e o menu não tem **Usuários**.
- Diga que o comprador, por sua vez, **não tem a opção de saída** no formulário: ele repõe, não dá baixa.

> Esconder o botão é só conforto. Quem chamar a API direto recebe recusa do mesmo jeito, porque a permissão é conferida no servidor.

### 8. Usuários e sessão, 1 minuto 30 — janela A

1. Vá em **Usuários**. Clique em **Novo usuário**, crie alguém como Operador.
2. Mostre a **senha temporária**, que aparece uma única vez, com o botão de copiar.
3. Agora **desative o usuário operador** que está logado na janela B, com a confirmação.
4. Volte para a **janela B** e tente qualquer ação: a sessão cai na hora, com o aviso de sessão encerrada.

> Desligar alguém não espera o token expirar. O acesso morre na hora, inclusive nas sessões já abertas.

### 9. Fechamento pela qualidade, 1 minuto

Sem tela, ou mostrando o repositório:

- **869 testes automatizados** rodam a cada alteração: 574 na API e 295 nas telas, com cobertura de linhas acima de 98% nos dois lados.
- **A integração contínua é obrigatória**: nada entra sem os testes, a análise de código e a subida completa em container passarem.
- **A segurança foi avaliada** contra o ASVS nível 1, com cada desvio registrado e justificado, e um modelo de ameaças escrito.
- **A instalação foi testada em clone limpo**, com backup e restauração comprovados.
- **O desempenho foi medido** com 400 pastilhas e 30 mil movimentações: a consulta mais lenta responde em 22 milissegundos.

Feche com o que interessa à empresa:

> Não é um protótipo de sala de aula. É um sistema instalável num computador da fábrica, com manual de instalação, de operação e do usuário, e com a evidência de tudo que foi testado.

## Perguntas prováveis

| Pergunta                                        | Resposta curta                                                                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| E se alguém lançar errado?                      | A movimentação não é apagada. Registra-se o movimento inverso com a observação, e o histórico mostra o erro e a correção. |
| Dá para acessar de casa?                        | Hoje não: o sistema roda na rede da fábrica, por HTTP. Publicar exige TLS na frente, e isso está documentado.             |
| E se o computador servidor queimar?             | O backup é um arquivo SQL, com procedimento testado de restauração. O guia ensina a agendar o backup diário.              |
| Quantas pessoas aguenta?                        | A escala da DDA cabe com folga: a medição usou volume maior que o esperado e ficou em milissegundos.                      |
| Por que o operador não pode cadastrar pastilha? | A matriz de perfis foi definida com a empresa. Ela está documentada e é conferida por teste automatizado.                 |
| O sistema controla custo?                       | Não nesta versão. O escopo é saldo e rastreabilidade; custo está na lista de evolução.                                    |
