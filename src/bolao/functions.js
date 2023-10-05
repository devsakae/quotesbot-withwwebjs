const { config } = require('dotenv');
config();
const axios = require('axios');
const { mongoclient } = require('../connection');
const { rankingmock } = require('../../tests/mock');
const database = mongoclient.db(process.env.BOLAO_GROUP_ID);

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
    if (response.hasNextPage) return setTimeout(() => novoBolao(i++), 1000);
    else return `Bolão do *${response.events[0].tournament.name}* criado! BORA PALPITAR? Admin, libera o próximo jogo aí! Digite !`
  } catch (err) {
    console.error(err);
  }
}

async function abreJogo() {
  const today = new Date();
  const event_api_date = '08/10/2023'; // today.toISOString().substring(0,10).split('-').reverse().join('/')
  try {
    const response = await fetchData(process.env.BOLAO_RAPIDAPI_URL + '/category/' + process.env.BOLAO_RAPIDAPI_BRASILID + '/events/' + event_api_date)
    const { events } = response.data;
    const jogosDoTigre = events.filter((item) => (item.homeTeam.id === Number(process.env.BOLAO_RAPIDAPI_CLUBID) || item.awayTeam.id === Number(process.env.BOLAO_RAPIDAPI_CLUBID) && (item.tournament.id === process.env.BOLAO_RAPIDAPI_TOURNAMENTID)));
    if (events.length > 1) throw Error('Foi encontrado mais de 1 jogo cadastrado para a data informada (${event_api_date}). Ajuste as configurações');
    const gameDate = new Date(jogosDoTigre[0].startTimestamp * 1000);
    const diff = (gameDate.getTime() - today.getTime()) + 180000;
    // Trigger to check results in 3 hours after game start
    setTimeout(() => {
      checkResults(jogosDoTigre[0].id)
    }, diff)
    return {
      id: jogosDoTigre[0].id,
      status: jogosDoTigre[0].status.description,
      homeTeam: jogosDoTigre[0].homeTeam.name,
      awayTeam: jogosDoTigre[0].awayTeam.name,
      gameDate: gameDate,
      tournament: jogosDoTigre[0].tournament.name,
      round: jogosDoTigre[0].roundInfo.round,
    }
  } catch (err) {
    console.error(err);
  }
}

async function checkResults(id) {
  try {
    const response = await fetchData(process.env.BOLAO_RAPIDAPI_URL + '/match/' + id)
    const { event } = response;
    console.log(event);
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
  abreJogo,
  novoBolao,
  habilitarPalpite,
  ranking,
  checkResults,
}