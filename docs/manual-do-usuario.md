# Manual do usuário

Como usar o PasTrack no dia a dia. Quem instala o sistema deve ler o [guia de implantação](deploy.md); quem cuida dele no servidor, o [manual de operação](operacao.md).

## O que o sistema faz

O PasTrack controla o estoque de pastilhas de corte. Ele guarda:

- o **cadastro** de cada pastilha, com o fabricante e o estoque mínimo;
- toda **entrada** e toda **saída**, com quem registrou, quando e para qual documento;
- o **saldo** de cada pastilha, calculado a partir das movimentações;
- um **alerta** quando o saldo chega ao estoque mínimo.

O saldo nunca é digitado. Ele muda só quando alguém registra uma movimentação, e é isso que mantém o número confiável.

## Entrar

1. Abra o endereço do sistema no navegador. Na máquina servidora é `http://localhost:8080`; nos outros computadores, `http://<ip-do-servidor>:8080`. Peça o endereço a quem instalou.
2. Informe o e-mail e a senha.
3. Clique em **Entrar**.

Se errar a senha cinco vezes seguidas, o sistema bloqueia novas tentativas por alguns minutos. É proteção contra tentativa de adivinhação: espere e tente de novo.

### Primeiro acesso

No primeiro acesso, e sempre que um administrador redefinir a sua senha, o sistema pede uma senha nova antes de liberar o resto.

A senha precisa:

- ter 12 caracteres ou mais, com pelo menos uma letra e um número;
- não conter a parte do seu e-mail antes do `@`;
- não ser uma senha óbvia, como `admin123456`.

A tela mostra o que ainda falta enquanto você digita. Guarde a senha num gerenciador de senhas; ninguém no sistema consegue vê-la depois.

### Sair

O botão **Sair**, no alto da tela, encerra a sessão. A sessão também cai sozinha depois de 8 horas, e na hora em que um administrador desativa a sua conta ou muda o seu perfil.

## O que cada perfil pode

| Ação                            | Administrador | Gestor | Operador | Comprador |
| ------------------------------- | :-----------: | :----: | :------: | :-------: |
| Consultar tudo                  |      sim      |  sim   |   sim    |    sim    |
| Registrar entrada               |      sim      |  sim   |   sim    |    sim    |
| Registrar saída                 |      sim      |  sim   |   sim    |    não    |
| Cadastrar pastilha e fabricante |      sim      |  sim   |   não    |    não    |
| Cadastrar fornecedor            |      sim      |  sim   |   não    |    sim    |
| Resolver alerta à mão           |      sim      |  sim   |   não    |    não    |
| Gerenciar usuários              |      sim      |  não   |   não    |    não    |

O menu esconde o que o seu perfil não pode fazer. Se você abrir um endereço direto sem ter permissão, o sistema mostra a tela "Sem permissão".

## Painel

É a primeira tela depois de entrar. Ela mostra:

- o total de pastilhas cadastradas;
- quantos alertas estão abertos;
- os **itens críticos**, isto é, as pastilhas que estão no estoque mínimo ou abaixo dele;
- as últimas movimentações registradas.

Use o painel no começo do turno: ele responde em um olhar o que está faltando.

## Pastilhas

### Consultar

A tela lista as pastilhas com saldo, mínimo e situação. A situação pode ser:

| Selo           | O que quer dizer                                                                                   |
| -------------- | -------------------------------------------------------------------------------------------------- |
| **Normal**     | O saldo está acima do estoque mínimo.                                                              |
| **Crítico**    | O saldo chegou ao mínimo ou está abaixo dele.                                                      |
| **Sem mínimo** | A pastilha não tem estoque mínimo definido (zero), então o sistema não acompanha a reposição dela. |

O campo **Buscar por código ou descrição** filtra a lista. Ele não diferencia maiúsculas: procurar por `wnmg` acha `WNMG 080408-TF`.

### Cadastrar

Só Administrador e Gestor. Clique em **Nova pastilha** e preencha:

- **Código:** como a pastilha é chamada na fábrica. É gravado em maiúsculas e não pode repetir.
- **Descrição:** o que é a pastilha, em palavras.
- **Modelo** e **Aplicação:** opcionais, ajudam a identificar.
- **Unidade:** `un`, `cx`, o que fizer sentido.
- **Estoque mínimo:** a partir de quanto o sistema deve avisar. **Zero desliga o aviso.**
- **Fabricante:** escolhido da lista. Se o fabricante ainda não existe, cadastre-o primeiro.

O saldo começa em zero. Para ter estoque, registre uma entrada.

### Editar

O botão **Editar** abre a mesma ficha preenchida. Dá para mudar a descrição, o modelo, a aplicação, a unidade, o estoque mínimo e o fabricante.

O **código não muda** depois do cadastro, e o **saldo não é editável**: ele só muda por movimentação. Os dois aparecem na ficha como texto, para conferência.

Mudar o estoque mínimo vale na hora: se o saldo já estiver no novo mínimo, o alerta abre; se passar a estar acima, o alerta aberto se resolve sozinho.

## Movimentações

É a tela do dia a dia de quem trabalha no chão de fábrica.

### Registrar uma entrada

Use quando chega pastilha nova.

1. Escolha o tipo **Entrada**.
2. Escolha a **pastilha**.
3. Informe a **quantidade**, de 1 a 1.000.000.
4. Escolha o **fornecedor**. Na entrada ele é obrigatório: é o que permite saber de quem veio cada lote.
5. Preencha, se quiser, o **documento** (nota fiscal, ordem de compra) e a **observação**.
6. Clique em **Registrar**.

O saldo sobe na hora, e a movimentação aparece no histórico logo abaixo.

### Registrar uma saída

Use quando a pastilha vai para a máquina.

1. Escolha o tipo **Saída**. O perfil Comprador não tem essa opção.
2. Escolha a pastilha e a quantidade.
3. Informe o documento, normalmente a ordem de serviço, e a observação, se ajudar.
4. Clique em **Registrar**.

A saída não tem fornecedor. Se a quantidade for maior que o saldo, o sistema recusa e diz quanto há em estoque: **o saldo nunca fica negativo**.

### Consultar o histórico

O histórico mostra data, tipo, pastilha, quantidade, fornecedor, responsável, documento e observação. Dá para filtrar por pastilha, por tipo e por período, e a lista é paginada.

### Corrigir um lançamento errado

Movimentação registrada **não é apagada nem editada**. Isso é de propósito: o histórico precisa refletir o que aconteceu, inclusive o erro e a correção.

Para corrigir, registre o movimento contrário, com a mesma quantidade, e escreva na observação o que aconteceu. Por exemplo:

> Estorno da saída 128, registrada em dobro por engano.

O mesmo vale para ajuste de inventário: se a contagem física não bate, registre a diferença com a observação explicando.

## Alertas

Um alerta abre **sozinho** quando o saldo de uma pastilha chega ao estoque mínimo ou fica abaixo dele. E fecha **sozinho** quando uma entrada leva o saldo acima do mínimo.

Na tela, os botões **Abertos**, **Resolvidos** e **Todos** filtram a lista. Cada linha mostra a pastilha, o saldo, o mínimo, quando o alerta abriu e como foi resolvido: a data com o nome de quem resolveu, ou "automaticamente pela reposição".

Administrador e Gestor podem **resolver um alerta à mão**, com confirmação. Use isso quando a reposição já está encaminhada, por exemplo a compra já foi feita, e o alerta não deve mais aparecer como pendente. Resolver o alerta **não muda o saldo**.

Pastilha com estoque mínimo zero nunca gera alerta.

## Fabricantes e fornecedores

**Fabricantes** são as marcas das pastilhas. Cada pastilha pertence a um. O nome não pode repetir.

**Fornecedores** são de quem você compra. O CNPJ é opcional, pode ser digitado com ou sem pontuação, e o sistema confere os dígitos verificadores; o contato é um telefone ou e-mail. O CNPJ também não pode repetir.

Nas duas telas, o botão **Editar** abre a ficha preenchida. Cadastrar fabricante é coisa de Administrador e Gestor; fornecedor, também do Comprador.

## Usuários

Só o Administrador vê esta tela.

### Criar um usuário

Clique em **Novo usuário**, informe nome, e-mail e perfil. O sistema gera uma **senha temporária e a mostra uma única vez**, num aviso com botão de copiar.

Entregue a senha à pessoa. Ela vai trocá-la no primeiro acesso. Se a senha se perder antes disso, use **Redefinir senha** e gere outra.

### Editar, desativar e reativar

- **Editar** muda o nome e o perfil. O e-mail não muda depois do cadastro.
- **Desativar** tira o acesso na hora, inclusive de quem já está logado. O histórico da pessoa continua no sistema.
- **Reativar** devolve o acesso com a mesma senha de antes.
- **Redefinir senha** gera uma senha temporária nova e derruba as sessões abertas daquela pessoa.

O usuário de quem sai da empresa deve ser **desativado, não apagado**: o nome dele aparece nas movimentações que registrou, e apagar quebraria o histórico.

O sistema não deixa você desativar a si mesmo, rebaixar o próprio perfil nem deixar o sistema sem nenhum administrador ativo.

## Quando alguma coisa dá errado

| O que aparece                                   | O que aconteceu e o que fazer                                                                                  |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| "Saldo insuficiente: há 3 un em estoque"        | A saída é maior que o saldo. Confira a contagem física: se houver diferença, registre o ajuste com observação. |
| "Selecione um item da lista"                    | Falta escolher a pastilha ou o fornecedor.                                                                     |
| "Já existe um fabricante com este nome"         | O cadastro já existe. Procure na lista antes de criar outro.                                                   |
| "CNPJ inválido"                                 | Os dígitos verificadores não batem. Confira o número na nota fiscal.                                           |
| "Acesso negado para este perfil"                | A ação não é do seu perfil. Peça a um gestor ou administrador.                                                 |
| "Sessão expirada. Entre novamente."             | Passaram-se mais de 8 horas, ou a sua conta mudou. Entre de novo.                                              |
| "Muitas tentativas de login"                    | Cinco senhas erradas em 15 minutos. Espere alguns minutos.                                                     |
| A tela não carrega, ou aparece erro do servidor | Avise quem cuida do servidor: o [manual de operação](operacao.md) tem o passo a passo de diagnóstico.          |

## Boas práticas

- **Uma conta por pessoa.** Conta compartilhada apaga a rastreabilidade: o sistema passa a dizer que "o turno" deu baixa, e não quem deu.
- **Registre na hora.** Anotar para lançar depois é como o controle em planilha se perdia.
- **Use o documento.** A ordem de serviço na saída e a nota na entrada são o que liga o estoque ao resto da fábrica.
- **Revise o estoque mínimo.** Ele é o que faz o alerta valer alguma coisa. Se uma pastilha vive em alerta, o mínimo provavelmente está alto demais; se acaba sem avisar, está baixo demais.
