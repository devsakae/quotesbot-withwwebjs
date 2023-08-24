const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { MongoClient, ServerApiVersion } = require('mongodb');
const { config } = require('dotenv');

const client = new Client({
  authStrategy: new LocalAuth({ clientId: "ec2" }),
});

config();

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
        if (response) console.log('MongoDB: Conexão realizada, aguarde...');
      });
    const totalquotesgroup1 =
      (await mongoclient
        .db('quotes')
        .collection(process.env.GROUP_1_NAME)
        .countDocuments()) || 0;
    const totalquotesgroup2 =
      (await mongoclient
        .db('quotes')
        .collection(process.env.GROUP_2_NAME)
        .countDocuments()) || 0;
    const totalquotesgroup3 =
      (await mongoclient
        .db('quotes')
        .collection(process.env.GROUP_3_NAME)
        .countDocuments()) || 0;
    await mongoclient
      .db('quotes')
      .collection('config_database')
      .replaceOne(
        {},
        {
          owner: process.env.BOT_OWNER,
          [process.env.GROUP_1_NAME]: totalquotesgroup1,
          [process.env.GROUP_2_NAME]: totalquotesgroup2,
          [process.env.GROUP_3_NAME]: totalquotesgroup3,
        },
        {
          upsert: true,
        },
      );
    console.log('MongoDB: Configurações feitas');
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

client.on('message', (message) => {
  if (message.body.startsWith('!')) {
    if (message.from === process.env.GROUP_1_ID)
      commands(message, process.env.GROUP_1_NAME);
    if (message.from === process.env.GROUP_2_ID)
      commands(message, process.env.GROUP_2_NAME);
    if (message.from === process.env.GROUP_3_ID)
      commands(message, process.env.GROUP_3_NAME);
  }
  return;
});

async function commands(message, collection) {
  // Verifica se é pedido de quote aleatória e entrega
  if (message.body === '!quote') {
    const allquotes = await db.collection(collection).find({}).toArray();
    const randomNum = Math.floor(Math.random() * allquotes.length);
    return client.sendMessage(
      message.from,
      `"${allquotes[randomNum].quote}" (${allquotes[randomNum].autor}, ${allquotes[randomNum].data})`,
    );
  }

  // Não é aleatória? Bora ver o que é
  const firstWord = message.body
    .substring(0, message.body.indexOf(' '))
    .toLowerCase();
  const content = message.body.substring(message.body.indexOf(' ')).trim();

  // Switch/case para verificar !quote, !addquote e !delquote
  switch (firstWord) {
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
      if (foundquote.length === 0) return message.reply('Tenho nada disso aí aqui 🫥');

      // Achou mais de 5? Muita coisa.
      if (foundquote.length > 30) return message.reply(`Tá louco, tem ${foundquote.length} quotes aqui sobre '${content}'. Melhor a memória aí que eu te entrego alguma coisa.`)

      // Achou mais de 1
      if (foundquote.length > 1) client.sendMessage(message.from, `ATENÇÃO PRA *MELHOR DAS ${foundquote.length} QUOTES* QUE EU TENHO AQUI COM O TEMA '${content.toUpperCase()}'`);
      const random = Math.floor(Math.random() * foundquote.length);

      // Devolve uma quote (a única, ou aleatória se houverem 5)
      return client.sendMessage(
        message.from,
        `"${
          foundquote[random].quote
        }" (${foundquote[random].autor}, ${foundquote[random].data})`,
      );

    // Adiciona uma quote nova na coleção do grupo
    case '!addquote':
      const knife = content.indexOf(':');
      if (knife === -1 || content.substring(0, knife).indexOf(',') === -1) return message.reply('Aprende a adicionar quote seu burro 🙈');
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
