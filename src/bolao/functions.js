const { config } = require('dotenv');
config();
const axios = require('axios');
const { mongoclient } = require('../connection');
const database = mongoclient.db(process.env.BOLAO_GROUP_ID);

function forMatch(match) {
  const data = new Date(match.startTimestamp * 1000);
  return `🚨🚨 Bolão aberto para *${match.homeTeam}* x *${match.awayTeam}* 🚨🚨

🗓 Data: ${data.toLocaleString('pt-br')}

❓ *COMO JOGAR*: Responda essa mensagem com apenas seu palpite, no formato "${match.homeTeam} 2 x 1 ${match.awayTeam}".

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
      .collection('jogos')
      .insertMany(response.events);
    if (response.hasNextPage) return setTimeout(() => novoBolao(i + 1), 1000);
    else return { code: 200, message: `Bolão do *${response.events[0].tournament.name}* criado. Boa sorte aos competidores!` }
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
    .collection('jogos')
    .findOne({ startTimestamp: { $gt: todayStamp } });
    if (match) {
      const timeoutms = ((match.startTimestamp - todayStamp) - (60 * process.env.BOLAO_LIMITE_EM_MINUTOS)) * 1000;
      const trigger = { id: match.id, schedule: timeoutms };
      const message = forMatch(match);
      return { code: 200, trigger: trigger, message: message }
    }
    return { code: 404 }
  } catch (err) {
    console.error(err);
    return { code: 500, message: err }
  }
};

async function checkResults(id) {
  try {
    const response = await fetchData(process.env.BOLAO_RAPIDAPI_URL + '/match/' + id)
    const { event } = response;
    console.log(event);
    return event;
  } catch (err) {
    console.error(err);
  }
}

async function habilitarPalpite() {

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
  proximaPartida,
  novoBolao,
  habilitarPalpite,
  ranking,
  checkResults,
}