const qrcode = require('qrcode-terminal');
const { Client } = require('whatsapp-web.js');
const { MongoClient, ServerApiVersion } = require('mongodb');
const ranking = require('./bolao/functions');
const { config } = require('dotenv');
config();

const client = new Client();

// Configurações do MongoDB
const mongoclient = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
const db = mongoclient.db('quotes');
const tigrebot = mongoclient.db('tigrebot');
const bolaodb = mongoclient.db('bolao');

async function run() {
  try {
    await mongoclient.connect();
    await mongoclient
      .db('tigrebot')
      .command({ ping: 1 })
      .then((response) => {
        if (response) console.log('MongoDB: Conexão realizada!');
      });
  } catch (err) {
    console.error(err);
  }
}
run();

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('Bot rodando!');
});

client.initialize();

let botworking = true;

const formatQuote = (quote) => {
  return `"${quote.quote}"

💬 Postagem de *${quote.autor}*
${quote.gols > 0 ? `⚽️ ${quote.gols} ${quote.gols > 1 ? 'pessoas consideraram' : 'pessoa considerou'} essa mensagem um golaço` : 'Ninguém considerou essa mensagem um golaço'}
✅ Tópico: ${quote.titulo}
🗓 Data: ${quote.data}
🪪 Id: ${quote._id.toString()}`
}

const addStats = (array) => {
  const today = new Date();
  const thisYear = today.getFullYear();
  if (array.length === 1) {
    const { stats } = array[0];
    return `O CRAQUE, GÊNIO, LENDÁRIO *${array[0].nickname.toUpperCase()}* já jogou no Tigre! 🐯

${array[0].period}
Nome completo: ${array[0].name} (${array[0].position})
Nascimento: ${array[0].birthday}
Em ${thisYear} ele completou ${Number(thisYear) - Number(array[0].birthday.substring(6))} anos

🏟 ${stats.matches} partidas
⚽️ ${stats.goals} gols
👍🏽 ${stats.w} vitórias
🤌🏽 ${stats.d} empates
🖕🏽 ${stats.l} derrotas
🟨 ${stats.yc} cartões amarelos
🟥 ${stats.rc} cartões vermelhos

Fonte: http://www.meutimenarede.com.br - Scraped by @devsakae`
  }
  let maisDeUm = `Encontrei mais de um atleta que jogou aqui! Se liga e escolha o certo:\n`
  array.forEach((obj) => maisDeUm = maisDeUm.concat(`\n✅ ${obj.name} (${obj.position}) - ${obj.stats.matches} jogos entre ${obj.period.substring(8)}`))
  maisDeUm = maisDeUm.concat('\n\nFonte: http://www.meutimenarede.com.br - Scraped by @devsakae');
  return maisDeUm;
}

const bestQuote = (array) => {
  const scoredQuotes = array.filter(q => q.gols > 0);
  if (scoredQuotes.length === 0) return formatQuote(array[Math.floor(Math.random() * array.length)]);
  if (scoredQuotes.length > 1) scoredQuotes.sort((a, b) => b.gols - a.gols);
  return formatQuote(scoredQuotes[0]);
}

client.on('message', (message) => {
  if (message.body === '!block' && message.author === process.env.BOT_OWNER) {
    botworking = false;
    return client.sendMessage(message.from, 'Entrei de férias 😎 🏖');
  }
  if (message.body === '!unblock' && message.author === process.env.BOT_OWNER) {
    botworking = true;
    return message.reply('Tô na área');
  }
  if (message.body.startsWith('!') && botworking) {
    message.from === process.env.GROUP_1_ID &&
      commands(message, process.env.GROUP_1_NAME);
    message.from === process.env.GROUP_2_ID &&
      commands(message, process.env.GROUP_2_NAME);
    message.from === process.env.GROUP_3_ID &&
      commands(message, process.env.GROUP_3_NAME);
    // NEW: Sistema de bolão!
    message.from === process.env.BOLAO_GROUP_ID && bolaoSystemFunc(message);
  }
  return;
});

async function bolaoSystemFunc(message) {
  switch (message.body) {
    case '!ranking':
      console.log('Ranking solicitor');

      return client.sendMessage(message.from, 'Você pediu o ranking')
    case '!pausa':
      console.log('Pausa solicitada');
      return client.sendMessage(message.from, 'Você pediu uma pausa')
    default:
      console.log('Mensagem enviada:', message);
      break;
  }
}

async function commands(message, collection) {
  // Verifica se é pedido de quote aleatória e entrega
  if (message.body === '!quote') {
    const randomQuote = await db
      .collection(collection)
      .aggregate([{ $sample: { size: 1 } }])
      .toArray();
    return client.sendMessage(message.from, formatQuote(randomQuote[0]));
  }

  // Não é aleatória? Bora ver o que é
  const quoteType = message.body
    .substring(0, message.body.indexOf(' '))
    .toLowerCase();
  const content = message.body.substring(message.body.indexOf(' ')).trim();
  const firstWord = (content.indexOf(' ') !== -1) ? content.substring(0, content.indexOf(' ')).trim() : content;
  const what = (content.indexOf(' ') !== -1) ? content.substring(firstWord.length + 1).trim() : '';

  // Switch/case para verificar !quote, !quotefrom, !quoteby, !addquote e !delquote
  switch (quoteType) {
    // Sistema que busca atletas que jogaram no Criciúma
    case '!jogounotigre':
      const atletasDoTigre = await tigrebot
        .collection('jogadores')
        .find({
          $or: [
            { 'nickname': { $regex: content, $options: 'i' } },
            { 'name': { $regex: content, $options: 'i' } }
          ]
        })
        .toArray();
      if (atletasDoTigre.length > 0) return client.sendMessage(message.from, addStats(atletasDoTigre));
      return message.reply('Não jogou não 😒');

    case '!data':
      const quotesdated = await db
        .collection(collection)
        .find({
          $and: [
            { 'data': { $regex: firstWord, $options: 'i' } },
            {
              $or: [
                { 'autor': { $regex: what, $options: 'i' } },
                { 'quote': { $regex: what, $options: 'i' } }
              ]
            }
          ]
        })
        .toArray();

      if (quotesdated.length < 1) return message.reply('Sabe o que eu encontrei?? Sabes???        nada')
      const bestByDate = bestQuote(quotesdated);
      return client.sendMessage(message.from, bestByDate);

    case '!autor':
      const quotesfrom = await db
        .collection(collection)
        .find({
          $and: [
            { 'autor': { $regex: firstWord, $options: 'i' } },
            { 'quote': { $regex: what, $options: 'i' } },
          ],
        })
        .toArray();
      if (quotesfrom.length === 0) return message.reply('Tem nada disso aí aqui 🫥'); // Não achou nada
      client.sendMessage(message.from, `Tenho ${quotesfrom.length} quote(s) do *${firstWord}*, mas a melhor é essa:`);
      const bestByAuthor = bestQuote(quotesfrom);
      return client.sendMessage(message.from, bestByAuthor);

    case '!quote': // Procura por uma quote com parâmetros
      const foundquote = await db
        .collection(collection)
        .find({
          $or: [
            { quote: { $regex: content, $options: 'i' } },
            { autor: { $regex: content, $options: 'i' } },
          ],
        })
        .toArray();

      if (foundquote.length === 0) return message.reply('Tenho nada disso aí aqui 🫥');
      if (foundquote.length === 1) return client.sendMessage(message.from, formatQuote(foundquote[0]));
      client.sendMessage(message.from, `ATENÇÃO PRA MELHOR DAS *${foundquote.length} QUOTES* QUE EU TENHO AQUI NO TEMA '${content.toUpperCase()}'`);
      const response = bestQuote(foundquote);
      return client.sendMessage(message.from, response);

    // Adiciona uma quote nova na coleção do grupo
    case '!addquote':
      const knife = content.indexOf(':');
      if (knife === -1 || content.substring(0, knife).indexOf(',') === -1)
        return message.reply('Aprende a adicionar quote seu burro 🙈');
      // Adiciona mais 1 na conta da coleção config
      const autor = content.substring(0, knife).trim().split(',')[0];
      const data = content.substring(content.indexOf(',') + 2, knife).trim();
      const newcontent = content.substring(knife + 2);
      const quote = {
        quote: newcontent,
        autor: autor,
        data: data,
        gols: 1,
        topico: '(Mensagem no grupo)'
      };
      await db
        .collection('config_database')
        .updateOne({}, { $inc: { [collection]: 1 } });
      const result = await db.collection(collection).insertOne(quote);
      message.reply(`✔️ Quote salva com id _${result.insertedId}_`);
      break;

    // Apaga quotes por meio do id
    case '!delquote':
      if (message.author !== process.env.BOT_OWNER) return;
      try {
        await db.collection(collection).deleteOne({ id: content });
        await db
          .collection('config_database')
          .updateOne({}, { $inc: { [collection]: -1 } });
      } catch {
        message.reply(`Erro. Tem certeza que a quote '${content}' existe?`);
      } finally {
        message.reply(`Quote ${content} deletada com sucesso`);
      }
    default:
      break;
  }
}
