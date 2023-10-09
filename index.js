const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { quoteFormat } = require('./src/quotes/functions');
const { mongoclient } = require('./src/connection');
const { novoBolao, proximaPartida, checkResults, habilitaPalpite, habilitaJogador, organizaPalpites, buscaIdAtivo, organizaRanking } = require('./src/bolao/functions');
const { config } = require('dotenv');

config();
let botworking = true;
let ouvindopalpites = false;
let palpiters = [];
let memoryRanking = [];

const client = new Client({
  authStrategy: new LocalAuth(),
});
const db = mongoclient.db('quotes');
const tigrebot = mongoclient.db('tigrebot');
const database = mongoclient.db(process.env.BOLAO_GROUP_ID);

async function run() {
  try {
    await mongoclient.connect();
    await database
      .collection('palpites')
      .find()
      .toArray()
      .then((response) => {
        if (response) {
          console.log('MongoDB: Conexão realizada!');
          palpiters = response?.map((palpite) => palpite.fone);
          setTimeout(() => console.log('Inicializando bot, aguarde...'), 2200);
        }
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
  console.log('Bot inicializado!');
});

client.initialize();

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

const adminWarning = (problem) => {
  return client.sendMessage(process.env.BOT_OWNER, problem)
}

const luckyPhrases = [
  '🤞 dedinhos cruzadosssss',
  'Só vai! Boa sorte',
  'Sério? 🙊',
  'É O BONDE DO TIGRÃO 🐯 GRAUR',
  'Muito, mas muiiiiiiito boa sorte pra você e pra toda sua família',
  '🍀 segue o trevo da sorte do Gastão com esse palpite ae',
  'Alguém dá um troféu pra esse maluco 🏆'
];

client.on('message', async (message) => {
  if (message.hasQuotedMsg && ouvindopalpites) {
    const quotedMessage = await message.getQuotedMessage();
    if (quotedMessage.body.includes('Bolão aberto')) {
      if (palpiters.some((p) => p === message.author)) {
        await message.react('❌')
        return message.reply('Já palpitou pô')
      }
      palpiters.push(message.author);
      const regex = /\d+\s*[xX]\s*\d+/
      if (regex.test(message.body)) {
        habilitaPalpite(ouvindopalpites, message);
        Math.floor(Math.random() * 1) === 1 ? message.react('✅') : message.reply(luckyPhrases[Math.floor(Math.random() * luckyPhrases.length)]);
      }
    }
    return;
  }
  if (message.body === '!block' && message.author === process.env.BOT_OWNER) {
    botworking = false;
    return client.sendMessage(message.from, 'Entrei de férias 😎 🏖');
  }
  if (message.body === '!unblock' && message.author === process.env.BOT_OWNER) {
    botworking = true;
    return message.reply('Tô na área');
  }
  if (message.body.startsWith('!') && botworking) {
    // NEW: Sistema de bolão! EM FASE DE TESTES
    message.from.includes(process.env.BOLAO_GROUP_ID) && bolaoSystemFunc(message);
    // message.from === process.env.GROUP_1_ID &&
    //   commands(message, process.env.GROUP_1_NAME);
    message.from === process.env.GROUP_2_ID &&
      commands(message, process.env.GROUP_2_NAME);
  }
  if (message.from === process.env.BOT_OWNER) bolaoSystemFunc(message);
  return;
});

// NEW: Sistema de bolão!
// Criado em outubro de 2023 por devsakae.tech

// Função que checa o resultado de uma partida e manda para o canal
async function confereResultado(to) {
  try {
    const idResponse = await buscaIdAtivo();
    if (idResponse.code === 404) {
      const response = organizaRanking(memoryRanking);
      return client.sendMessage(to, response);
    }
    if (idResponse.code === 500) return adminWarning(idResponse.message)
    const rankingDoJogo = await checkResults(idResponse.id);
    memoryRanking = rankingDoJogo.sort((a, b) => a.pontos < b.pontos ? 1 : (a.pontos > b.pontos) ? -1 : 0);
    let response = `🏆 Resultado do bolão da última partida 🏆
  
🥇 ${memoryRanking[0].autor} apostou *${memoryRanking[0].palpite}* (${memoryRanking[0].pontos} pontos)
🥈 ${memoryRanking[1].autor} apostou *${memoryRanking[1].palpite}* (${memoryRanking[1].pontos} pontos)
🥉 ${memoryRanking[2].autor} apostou *${memoryRanking[2].palpite}* (${memoryRanking[2].pontos} pontos)
--------\n`;
    const memoryRankingRest = memoryRanking.slice(3);
    memoryRankingRest.map((rest) => response += `${rest.autor} apostou ${rest.palpite} (${rest.pontos} pontos)\n`)
    response += '\nUsuários sem nome na lista enviem *!habilitar Nome ou apelido* para se cadastrar 👍';
    await database.collection('palpites').drop();
    await database.createCollection('palpites');
    return client.sendMessage(to, response);
  } catch (err) {
    console.error(err);
    return adminWarning(err);
  }
}

// Função que bloqueia novos palpites por expiração do prazo
async function encerraPalpite(message) {
  palpiters = [];
  const encerramento = '⛔️⛔️ Tempo esgotado! ⛔️⛔️\n\n'
  const listaDePalpites = await organizaPalpites({ method: 'jogo', id: id });
  client.sendMessage(to, encerramento + listaDePalpites);
  const hours = 4;
  const hoursInMs = hours * (60 * 60 * 1000);
  const agendaVerificacao = setTimeout(() => confereResultado(message.from), hoursInMs)
  ouvindopalpites = false;
  return;
}

// Escutador de comandos do bolão
async function bolaoSystemFunc(message) {
  if (message.from === process.env.BOT_OWNER && message.body === '/bolao start') {
    await database.collection(process.env.BOLAO_RAPIDAPI_CLUBID).drop();
    const response = await novoBolao(0);
    if (response.code === 500) return adminWarning(response.message);
    client.sendMessage(process.env.BOLAO_GROUP_ID + '@g.us', response.message);
  }
  if (message.author === process.env.BOT_OWNER) {
    switch (message.body) {
      case '!bolao':
        const newResponse = await proximaPartida();
        if (ouvindopalpites) {
          () => clearTimeout();
          const triggerImpedimento = setTimeout(() => encerraPalpite(message.from, newResponse.trigger.id), newResponse.trigger.timeoutms);
          return adminWarning('Bolão em andamento!');
        }
        if (newResponse.code === 500) return adminWarning(newResponse.error);
        if (newResponse.code === 404) return adminWarning(newResponse.message);
        ouvindopalpites = newResponse?.trigger.id;
        () => clearTimeout();
        const triggerImpedimento = setTimeout(() => encerraPalpite(message.from, newResponse.trigger.id), newResponse.trigger.timeoutms);
        return client.sendMessage(message.from, newResponse.message);
      case '!palpites':
        const miniRanking = await organizaPalpites({ method: 'jogo', id: ouvindopalpites });
        client.sendMessage(message.from, miniRanking);
        break;
      case '!ranking':
        if (ouvindopalpites) return message.reply('Ranking trancado porque estou recebendo palpites pra próxima partida do bolão');
        confereResultado(message.from);
        break;
      default:
        break;
    }  
  }
  if (message.body.startsWith('!habilitar')) {
    const habilitado = await habilitaJogador(message);
    if (habilitado.code === 500) return adminWarning(habilitado.message);
    if (habilitado.code === 401) return message.reply(`Você já está habilitado como *${habilitado.jogador}*, não vai mudar de nome e pronto`);
    message.react('🎟');
    return client.sendMessage(message.author, habilitado.message);
  }
  return;
}

async function commands(message, collection) {
  // Verifica se é pedido de quote aleatória e entrega
  if (message.body === '!quote') {
    const randomQuote = await db
      .collection(collection)
      .aggregate([{ $sample: { size: 1 } }])
      .toArray();
    return client.sendMessage(message.from, quoteFormat(randomQuote[0]));
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
