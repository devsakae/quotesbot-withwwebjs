const { abreJogo, novoBolao } = require('../src/bolao/functions')
const { singleMatchMock } = require('./mock')

describe('Testa funções de requisição', () => {
  test('Inicia um bolão e salva no MongoDB', () => {
    const resposta = novoBolao(0);
    expect(resposta).toMatch(/criado/);
  })
  // test('Testa uso da função abreJogo()', () => {
  //   const gameDate = new Date(singleMatchMock[0].startTimestamp * 1000);
  //   const todayDate = new Date();
  //   const diff = gameDate.getTime() - todayDate.getTime();
  //   const diffinseconds = (gameDate.getTime() - todayDate.getTime()) / 1000;
  //   console.log(diffinseconds / (60 * 60), 'hours');
  //   console.log(diffinseconds / 60, 'minutes');
  //   console.log(diffinseconds, 'seconds');
  //   console.log(diff, 'milisseconds')
  //   expect(gameDate.toLocaleString('pt-BR')).toBe('08/10/2023, 18:00:00');
  // });
});