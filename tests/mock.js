// pts: 3 por placar certo
// 
const rankingmock = [
  {
    _id: '111111',
    name: 'Rodrigo Sakae',
    id: '554891371440@c.us',
    pts: 10,
    par: 4,
  },
  {
    _id: '2222222',
    name: 'João Maria dos Santos',
    id: '2222222@c.us',
    pts: 6,
    par: 6,
  },
  {
    _id: '333333',
    name: 'Zezé Perrela',
    id: '33333333@c.us',
    pts: 10,
  },
  {
    _id: '4444444',
    name: 'Cartolouco',
    id: '444444@c.us',
    pts: 13,
  },
];

singleMatchMock = [
  {
    awayScore: {},
    awayTeam: {
      country: { alpha2: 'BR', name: 'Brazil' },
      disabled: false,
      gender: 'M',
      id: 1962,
      name: 'Vitória',
      nameCode: 'VIT',
      national: false,
      shortName: 'Vitória',
      slug: 'vitoria',
      sport: { id: 1, name: 'Football', slug: 'football' },
      subTeams: [],
      teamColors: { primary: '#ff0000', secondary: '#000000', text: '#000000' },
      type: 0,
      userCount: 27429
    },
    changes: { changeTimestamp: 0 },
    crowdsourcingDataDisplayEnabled: false,
    customId: 'mOsJO',
    detailId: 1,
    finalResultOnly: false,
    hasGlobalHighlights: false,
    homeScore: {},
    homeTeam: {
      country: { alpha2: 'BR', name: 'Brazil' },
      disabled: false,
      gender: 'M',
      id: 1984,
      name: 'Criciúma',
      nameCode: 'CRI',
      national: false,
      shortName: 'Criciúma',
      slug: 'criciuma',
      sport: { id: 1, name: 'Football', slug: 'football' },
      subTeams: [],
      teamColors: { primary: '#ffff00', secondary: '#000000', text: '#000000' },
      type: 0,
      userCount: 15697
    },
    id: 11076184,
    roundInfo: { round: 31 },
    slug: 'criciuma-vitoria',
    startTimestamp: 1696798800,
    status: { code: 0, description: 'Not started', type: 'notstarted' },
    time: {},
    tournament: {
      category: {
        alpha2: 'BR',
        flag: 'brazil',
        id: 13,
        name: 'Brazil',
        slug: 'brazil',
        sport: [Object]
      },
      id: 1449,
      name: 'Brasileiro Série B',
      priority: 299,
      slug: 'brasileiro-serie-b',
      uniqueTournament: {
        category: [Object],
        country: {},
        crowdsourcingEnabled: false,
        displayInverseHomeAwayTeams: false,
        hasEventPlayerStatistics: true,
        hasPerformanceGraphFeature: true,
        id: 390,
        name: 'Brasileiro Série B',
        primaryColorHex: '#3F01FF',
        secondaryColorHex: '#c5be02',
        slug: 'brasileiro-serie-b',
        userCount: 83428
      }
    }
  }
]

module.exports = {
  rankingmock,
  singleMatchMock,
}