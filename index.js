const qrcode = require('qrcode-terminal');
const { Client } = require('whatsapp-web.js');
const { MongoClient, ServerApiVersion } = require('mongodb');
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
const birthdaydb = mongoclient.db('tigrebot');

async function run() {
  try {
    await mongoclient.connect();
    await mongoclient
      .db('admin')
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

💬 Autor:${quote.autor}
${quote.gols > 0 ? `⚽️ ${quote.gols} pessoas consideraram essa mensagem um golaço` : 'Ninguém considerou essa mensagem um golaço'}
✅ Tópico: ${quote.titulo}
🗓 Data: ${quote.data}
🪪 Id: ${quote._id.toString()}`
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
  }
  return;
});

async function commands(message, collection) {
  // Busca aniversariantes do dia
  if (message.body === '!aniversarios') {
    const today = new Date();
    const dayAndMonth = today.toLocaleString('pt-br').substring(0, 5)
    const thisYear = today.getFullYear()
    const aniversariantes = await birthdaydb
      .collection('aniversariantes')
      .find({ birthday: { $regex: dayAndMonth } })
      .toArray();
    let response = 'Nenhum aniversário nessa data'
    if (aniversariantes.length > 1) {
      response = `🎉 *PARABÉNS PRA VOCÊ! EU SÓ VIM PRA COMER! ESQUECI O PRESENTE! NUNCA MAIS VOU TRAZER!*

      Hoje é dia de festa pra essa cambada aqui debaixo, olha só:\n`;
      aniversariantes.map((older) => {
        const age = thisYear - new Date(older.birthday).getFullYear();
        response.concat(`\n 🟤 ${older.name} (${older.position}) fazendo *${age}* anos`)
      });
    }
    return client.sendMessage(message.from, response)
  }

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
