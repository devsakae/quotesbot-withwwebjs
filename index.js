const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
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

client.on('message', (message) => {
  if (message.body === '!block' && message.from === process.env.BOT_OWNER) {
    botworking = false;
    return client.sendMessage(message.from, 'Entrei de férias 😎 🏖');
  }
  if (message.body === '!unblock' && message.from === process.env.BOT_OWNER) {
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
  // Verifica se é pedido de quote aleatória e entrega
  if (message.body === '!quote') {
    const randomQuote = await db
      .collection(collection)
      .aggregate([{ $sample: { size: 1 } }])
      .toArray();
    return client.sendMessage(
      message.from,
      `"${randomQuote[0].quote}" (${randomQuote[0].autor}, ${randomQuote[0].data})`,
    );
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
            { $or: [
              { 'autor': { $regex: what, $options: 'i' } },
              { 'quote': { $regex: what, $options: 'i' } }
            ] }
          ]
        })
        .toArray();

        console.log('SAMPLE:', quotesdated[0]);
      if (quotesdated.length < 1) return message.reply('Sabe o que eu encontrei?? Sabes???        nada')
      // Mais de 30? Muita coisa
      if (quotesdated.length > 30) return message.reply(`Encontrei mais de ${quotesdated.length} quotes nesse período, seja mais específico(a) bebê`);
      const sortDatedQuote = Math.floor(Math.random() * quotesdated.length);
      return client.sendMessage(
        message.from,
        `Em ${quotesdated[sortDatedQuote].data}, *${quotesdated[sortDatedQuote].autor}* disse: "${quotesdated[sortDatedQuote].quote}"`,
      );

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
      if (quotesfrom.length === 0)
        return message.reply('Tem nada disso aí aqui 🫥'); // Não achou nada

      const sortQuoteby = Math.floor(Math.random() * quotesfrom.length);
      client.sendMessage(
        message.from,
        `Tenho ${quotesfrom.length} quote(s) do *${firstWord}*, mas a melhor é essa:`,
      );
      return client.sendMessage(
        message.from,
        `"${quotesfrom[sortQuoteby].quote}" (${quotesfrom[sortQuoteby].autor}, ${quotesfrom[sortQuoteby].data})`,
      );

    case '!quote':
      // Busca na database
      const foundquote = await db
        .collection(collection)
        .find({
          $or: [
            { quote: { $regex: content, $options: 'i' } },
            { autor: { $regex: content, $options: 'i' } },
          ],
        })
        .toArray();

      // Não achou nada
      if (foundquote.length === 0)
        return message.reply('Tenho nada disso aí aqui 🫥');

      // Achou mais de 5? Muita coisa.
      if (foundquote.length > 30)
        return message.reply(
          `Tá louco, tem ${foundquote.length} quotes aqui sobre '${content}'. Melhora tua memória aí que eu te entrego alguma coisa.`,
        );

      // Achou mais de 1
      if (foundquote.length > 1)
        client.sendMessage(
          message.from,
          `ATENÇÃO PRA MELHOR DAS *${foundquote.length
          } QUOTES* QUE EU TENHO AQUI NO TEMA '${content.toUpperCase()}'`,
        );
      const random = Math.floor(Math.random() * foundquote.length);

      // Devolve uma quote (a única, ou aleatória se houverem 5)
      return client.sendMessage(
        message.from,
        `"${foundquote[random].quote}" (${foundquote[random].autor}, ${foundquote[random].data})`,
      );

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
