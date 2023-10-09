const { config } = require('dotenv');
config();
const axios = require('axios');
const { mongoclient } = require('../connection');
const database = mongoclient.db(process.env.BOLAO_GROUP_ID);

function forMatch(match) {
  const data = new Date(match.startTimestamp * 1000);
  return `🚨🚨 Bolão aberto 🚨🚨
  
Registre seu palpite para *${match.homeTeam.name}* x *${match.awayTeam.name}* que vai acontecer ${data.toLocaleString('pt-br')}

❓ *COMO JOGAR*: Responda essa mensagem com apenas seu palpite, no formato *MANDANTE SCORE x SCORE VISITANTE* (ex.: ${match.homeTeam.name} 1 x 2 ${match.awayTeam.name}).

🛑 Atenção: Este é um sistema de teste, portanto pode haver alguns BUGs. Caso isso aconteça, favor reportar ao dono do Bot.

ℹ️ *REGRAS*: Palpites válidos somente se enviados até ${
    process.env.BOLAO_LIMITE_EM_MINUTOS
  } minutos antes da partida.

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
      },
    });
    return response.data;
  } catch (err) {
    return 'ERROR';
  }
}

async function novoBolao(i) {
  try {
    const response = await fetchData(
      process.env.BOLAO_RAPIDAPI_URL +
        '/team/' +
        process.env.BOLAO_RAPIDAPI_CLUBID +
        '/matches/next/' +
        i,
    );
    await database
      .collection(process.env.BOLAO_RAPIDAPI_CLUBID)
      .insertMany(response.events);
    if (response.hasNextPage) {
      novoBolao(i++);
      return;
    } else
      return {
        code: 200,
        message: `Bolão do *${response.events[0].tournament.name}* criado!
    
Registre seu apelido com *!habilitar [seu nome/apelido]* (máx. 20 caracteres).`,
      };
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
    if (checkFone.jogador) return { code: 401, jogador: checkFone.jogador };
    const username = message.body.substring(10).trim().substring(0, 20);
    await database
      .collection('jogadores')
      .update({ fone: message.author }, { jogador: username }, { $upsert: true });
    await database
      .collection('palpites')
      .updateMany({ fone: message.author }, { $set: { autor: username } });
    return { code: 201, message: `Olá, ${username}!

Você está habilitado para o bolão (em fase de testes).

ℹ️ *REGRAS*: Palpites válidos somente se enviados até ${process.env.BOLAO_LIMITE_EM_MINUTOS} minutos antes da partida.

✅ Placar em cheio: *3 pontos*
✅ Vitória, empate ou derrota: *1 ponto*
✅ Acertar o placar de um dos times: *Ponto extra!*

Boa sorte!
Sistema de bolão hiper mega 🔝 desenvolvido por devsakae.tech` };
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
      const timeoutms =
        (match.startTimestamp -
          todayStamp -
          60 * process.env.BOLAO_LIMITE_EM_MINUTOS) *
        1000;
      const trigger = { id: match.id, timeoutms: timeoutms };
      const message = forMatch(match);
      return { code: 200, trigger: trigger, message: message };
    }
    return {
      code: 404,
      message: 'Nenhuma partida cadastrada. Verificar banco de dados',
    };
  } catch (err) {
    console.error(err);
    return { code: 500, message: err };
  }
}

async function habilitaPalpite(id, message) {
  const username = await database.collection('jogadores').findOne({ fone: message.author }) || message.author;
  console.log(username);
  const regex = /\d+\s*[xX]\s*\d+/;
  let placar = message.body.match(regex)[0].split('x');
  if (placar.length < 2) placar = message.body.match(regex[0].split('X'));
  const homeScore = Number(placar[0].trim());
  const awayScore = Number(placar[1].trim());
  const resultado = Number(placar[0].trim()) > Number(placar[1].trim()) ? 'V' : Number(placar[0].trim()) < Number(placar[1].trim()) ? 'D' : 'E';
  await database
    .collection('palpites')
    .insertOne({
      fone: message.author,
      jogo: Number(id),
      autor: username,
      palpite: { home: homeScore, away: awayScore, resultado: resultado },
    });
}

async function organizaPalpites(how) {
  if (how.method === 'jogo') {
    const palpites = await database
      .collection('palpites')
      .find({ jogo: Number(how.id) })
      .toArray();
    const jogadores = await database
      .collection('jogadores')
      .find()
      .toArray();
    const sincronizado = palpites.map((palpite) => {
      const temNome = jogadores.find((jogador) => jogador.fone === palpite.fone)?.jogador || '@' + palpite.fone.substring(0, palpite.fone.indexOf('@'));
      return { ...palpite, autor: temNome };
    });
    let formatted = `🎫 Palpites cadastrados:
`;
    sincronizado.map(
      (p) =>
        (formatted += `
▪️ ${p.palpite.home} x ${p.palpite.away} - ${p.autor}`),
    );
    return formatted;
  }
  return;
}

async function checkResults(id) {
  try {
    const gameInfo = await fetchData(process.env.BOLAO_RAPIDAPI_URL + '/match/' + id);
    const homeScore = gameInfo.event.homeScore.current;
    const awayScore = gameInfo.event.awayScore.current;
    const resultado = Number(gameInfo.event.homeScore.current) > Number(gameInfo.event.awayScore.current) ? 'V' : Number(gameInfo.event.homeScore.current) < Number(gameInfo.event.awayScore.current) ? 'D' : 'E';
    const palpitesdb = await database
      .collection('palpites')
      .find({ jogo: Number(id) })
      .toArray();
    const rankingDoJogo = palpitesdb.map((p) => {
      let temNome = p.autor || p.fone.slice(0, -5);
      let resPos = { autor: temNome, pontos: 0, palpite: p.palpite.home + ' x ' + p.palpite.away }
      if (p.palpite.home === homeScore && p.palpite.away === awayScore) {
        resPos.pontos += 3;
        return resPos;
      }
      if (p.palpite.resultado === resultado) resPos.pontos += 1;
      if (p.palpite.home === homeScore || p.palpite.away === awayScore) resPos.pontos += 1;
      return resPos;
    });
    palpitesdb.map((p) => {
      database.collection('jogadores').findOneAndUpdate({ fone: p.fone }, { $push: { historico: { jogo: Number(id), palpite: p.palpite } } }, { upsert: true });
    });
    return rankingDoJogo;
  } catch (err) {
    console.error(err);
    return { code: 500, message: err }
  }
}

async function buscaIdAtivo() {
  try {
    const response = await database.collection('palpites').findOne();
    if (!response) return { code: 404 };
    const id = response.jogo; 
    return { code: 200, id: Number(id) };
  } catch (err) {
    console.error(err);
    return { code: 500, message: err };
  }
}

function organizaRanking(array) {
  const sortedRanking = array.sort((a, b) => a.pontos < b.pontos ? 1 : (a.pontos > b.pontos) ? -1 : 0);
  let response = `🏆 Ranking de palpiteiros atualizado 🏆

🥇 ${sortedRanking[0].autor} (${sortedRanking[0].pontos} pontos)
🥈 ${sortedRanking[1].autor} (${sortedRanking[1].pontos} pontos)
🥉 ${sortedRanking[2].autor} (${sortedRanking[2].pontos} pontos)
--------\n`;
  const sortedRankingRest = sortedRanking.slice(3);
  sortedRankingRest.map((rest, idx) => response += `#${idx + 4} - ${rest.autor} (${rest.pontos} pontos)\n`)
  return response;
}

module.exports = {
  novoBolao,
  habilitaJogador,
  proximaPartida,
  habilitaPalpite,
  organizaPalpites,
  checkResults,
  buscaIdAtivo,
  organizaRanking,
};
