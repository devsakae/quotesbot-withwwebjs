# Quotes Bot com wwebjs

Bot de WhatsApp para que as frases inesquecíveis de seus amigos não se percam nunca
## 🔗 Links
[![portfolio](https://img.shields.io/badge/my_portfolio-000?style=for-the-badge&logo=ko-fi&logoColor=white)](http://portfolio.sakae.social)
[![linkedin](https://img.shields.io/badge/linkedin-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/rodrigosakae)
[![twitter](https://img.shields.io/badge/twitter-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white)](https://twitter.com/Sakae)

## Documentação
Você vai precisar de um número de WhatsApp (pode ser o seu mesmo), e um servidor Node.js (existem diversas opções gratuitas na internet).

Depois de instalado e configurado, use o bot escrevendo os seguintes comandos no grupo que você configurou:

#### Salvar quotes
```!addquote Nome, data: Frase que ele(a) disse```

Exemplo: ```!addquote Rodrigo Sakae, julho de 2023: Vou fazer um bot que grava tudo o que vocês falam````

#### Pesquisar quotes
```!quote critério de pesquisa```

#### Pedir uma quote aleatória
```!quote```

#### Deletar quotes (apenas admin)
```!delquote id```

## Stacks utilizadas

Javascript, Node.js, Venom e MongoDB

## Licença
[MIT](https://choosealicense.com/licenses/mit/)

## Instalação

#### 1 - Faça o clone do repositório e instale com npm install

```bash
  npm install
```

#### 2 - Criando um banco de dados no MongoDB

Crie um banco de dados no MongoDB e pegue a URI (já configurada com a sua senha) fornecida na opção de Connect com Node.js para gravar nas variáveis de ambiente (próximo passo)

#### 3 - Configure as variáveis de ambiente

Já disponibilizamos um .env.example para você renomear para .env e preencher usando os seguintes critérios.

O nome do grupo precisa ser um slug, porque vamos salvar como uma collection na database "quotes" do MongoDB:

```bash
MONGODB_URI = mongodb+srv://**********
BOT_OWNER = seunumerodowhatsapp@c.us
GROUP_1_ID = numerodogrupodafamilia@c.us
GROUP_1_NAME = grupodafamilia
GROUP_2_ID = numerodogrupodevs@c.us
GROUP_2_NAME = devs
GROUP_3_ID = ...
GROUP_3_NAME = ...
(pode colocar mais e acrescentar no index.js)
```

Esta é a parte mais complicada da instalação, pois você precisa saber qual é o id da família.

Pra verificar isso, sugiro colocar um ```console.log(message)``` dentro da função start (e dentro da client.onAnyMessage), e escrever algo no grupo onde o bot está.

O id está na chave ```groupId```.

#### 4 - Rode a aplicação

Utiliza ```npm start``` para rodar a aplicação.

#### 5 - Autorize acesso no aplicativo

Acesse 'Aparelhos Conectados' no seu WhatsApp e tire uma foto do QR Code que vai aparecer no terminal.
