const { config } = require('dotenv');
config();
const axios = require('axios');
const { mongoclient } = require('../connection');
const database = mongoclient.db(process.env.BOLAO_GROUP_ID);

const luckyPhrases = [
  '🤞 dedinhos cruzadosssss',
  'Só vai! Boa sorte',
  'É O BONDE DO TIGRÃO 🐯 GRAUR',
  '🙊',
  'Muito, mas muiiiiiiito boa sorte pra você e pra toda sua família',
  '🍀 segue o trevo da sorte do Gastão com esse palpite ae',
  'Alguém dá um troféu pra esse maluco 🏆'
];

function forMatch(match) {
  const data = new Date(match.startTimestamp * 1000);
  return `🚨🚨 Bolão aberto para *${match.homeTeam.name}* x *${match.awayTeam.name}* 🚨🚨

🗓 Data e hora da partida: *${data.toLocaleString('pt-br')}*

❓ *COMO JOGAR*: Responda essa mensagem com apenas seu palpite, no formato "${match.homeTeam.name} 2 x 1 ${match.awayTeam.name}".

🛑 Atenção: Este é um sistema de teste, portanto pode haver alguns BUGs. Caso isso aconteça, favor reportar ao dono do Bot.

ℹ️ *REGRAS*: Palpites válidos somente se enviados até ${process.env.BOLAO_LIMITE_EM_MINUTOS} minutos antes da partida.

  ✅ Placar em cheio: *3 pontos*
  ✅ Vitória, empate ou derrota: *1 ponto*
  ✅ Acertar o placar de um dos times: *Ponto extra!*

Boa sorte!
Sistema de bolão hiper mega 🔝 desenvolvido por devsakae.tech`;
}

async function fetchData(url) {
  try {
    const response = await axios.request({
      method: 'GET',
      url: url,
      headers: {
        'X-RapidAPI-Key': process.env.BOLAO_RAPIDAPI_KEY,
        'X-RapidAPI-Host': process.env.BOLAO_RAPIDAPI_HOST,
      }
    });
    return response.data;
  } catch (err) {
    return 'ERROR';
  }
}

async function novoBolao(i) {
  try {
    const response = await fetchData(process.env.BOLAO_RAPIDAPI_URL + '/team/' + process.env.BOLAO_RAPIDAPI_CLUBID + '/matches/next/' + i)
    await database
    .collection(process.env.BOLAO_RAPIDAPI_CLUBID)
    .insertMany(response.events);
    if (response.hasNextPage) {
      novoBolao(i++);
      return;
    }
    else return { code: 200, message: `Bolão do *${response.events[0].tournament.name}* criado.
    
Registre seu apelido com *!habilitar [seu nome/apelido]* (máx. 20 caracteres)!` }
  } catch (err) {
    console.error(err);
    return { code: 500, message: err };
  }
}

async function habilitaJogador(message) {
  try {
    const checkFone = await database
    .collection('jogadores')
    .findOne({ fone: message.author });
    if (checkFone) { return { code: 401 } }
    const username = message.body.substring(10).trim().substring(0, 20);
    await database
    .collection('jogadores')
    .insertOne({ fone: message.author, jogador: username, pontos: 0, historico: [] });
    return { code: 201, username: username }
  } catch (err) {
    console.error(err);
    return { code: 500, message: err };
  }
}

async function proximaPartida() {
  try {
    const today = new Date();
    const todayStamp = Math.floor(today.getTime() / 1000);
    const match = await database
    .collection(process.env.BOLAO_RAPIDAPI_CLUBID)
    .findOne({ startTimestamp: { $gt: todayStamp } });
    if (match) {
      const timeoutms = ((match.startTimestamp - todayStamp) - (60 * process.env.BOLAO_LIMITE_EM_MINUTOS)) * 1000;
      const trigger = { id: match.id, timeoutms: timeoutms };
      const message = forMatch(match);
      return { code: 200, trigger: trigger, message: message }
    }
    return { code: 404, message: 'No match found' }
  } catch (err) {
    console.error(err);
    return { code: 500, message: err }
  }
};

async function habilitaPalpite(id, message) {
  const regex = /\d+\s*[xX]\s*\d+/
  let placar = message.body.match(regex)[0].split('x');
  if (placar.length < 2) placar = message.body.match(regex[0].split('X'));
  const homeScore = Number(placar[0].trim());
  const awayScore = Number(placar[1].trim())
  await database.collection('palpites').insertOne({ autor: message.author, jogo: Number(id), palpite: { home: homeScore, away: awayScore } });
}

async function organizaPalpites(id) {
  const response = await database
  .collection('palpites')
  .find({ jogo: Number(id) })
  .toArray();
  return response;
}

async function checkResults(id) {
  try {
    const response = await fetchData(process.env.BOLAO_RAPIDAPI_URL + '/match/' + id)
    const { event } = response;
    console.log(event);
    return 'Jogo finalizado! Fazer o cálculo';
  } catch (err) {
    console.error(err);
  }
}

async function ranking() {
//   rankingmock.sort((a, b) => a.pts + b.pts);
//   const response_header = `Ranking do bolão 2023!
// Site oficial do bolão: https://bolao.devsakae.tech

// Top *${process.env.BOLAO_RANKING_TOP}* melhores palpiteiros do grupo:
// 🥇 ${rankingmock[0].name}
// 🥈 ${rankingmock[1].name}
// 🥉 ${rankingmock[2].name}`

//   response_header += `🏅`
//   return response_header;
}


module.exports = {
  novoBolao,
  habilitaJogador,
  proximaPartida,
  habilitaPalpite,
  organizaPalpites,
  checkResults,
  ranking,
}