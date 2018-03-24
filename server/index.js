const
  IP                  = require('ip-address'),
  dns                 = require('./dns-promise.js'),
  updateServerInfo    = require('./updateServerInfo.js'),
  checkConnection     = require('./checkConnection.js'),

  server = require('http').createServer(require('express')),

  // Конфигурация подключения к базе данных
  databaseConfig = {
    connectionString: process.env.DATABASE_URL || console.log('>>>>> Настройте конфигурацию базы данных! <<<<<'),
    ssl: true
  },
  db = new (require('./dbAdapter.js'))(databaseConfig),
  QUERIES = require('./QUERIES.js');



let
  /*
    Массив игр (по типам)
    key - id игры
    value - полное название игры
  */
  gamesList = [],
  /*
    Массив игр с серверами
    key - полное название игры
    value - объект конкретной игры
    >>>>>>> { type - сокр. название игры, servers - массив серверов}
  */
  games = {},
  /*
    key - полное название игры
    value - { key - ${ip}:${port}, value - активные игроки }
  */
  players = {};




void async function() {
  console.log('>>>>>> Инициализация сервера. Получение данных из базы...');
  /*
    Запрашиваем список всех наблюдаемых игр
  */ 
  await db.forEach(QUERIES.allGames, item => [
      gamesList[item.id],
      games[item.name],
      players[item.name],
    ] = [
      item.name,
      {
        type: item.type,
        servers: []
      },
      {}
    ]
  );

  /*
    Запускаем цикл наблюдения за каждый сервером из базы данных
    Заполняем game.servers, players
  */
  await db.forEach(QUERIES.allServers, item => {
    let gameName = gamesList[item.game_id],
      game = games[gameName],
      server = {
        ip: item.ip,
        port: item.port,
        online: false
      };

    game.servers.push(server);
    updateServerInfo(game, server, players[gameName],
      `${item.ip}:${item.port}`);
  });
  console.log('>>>>>> Все данные получены!');



  

  /***** API *****/
  require('web-events-server')(server, {

    // Возвращает массив названий поддерживаемых серверов и их id
    getGamesList() {
      return ['recieveGameList', gamesList];
    },

    // Возвращает все сервера игры по её полному имени
    getGameData(fullGameName) {
      let index = gamesList.indexOf(fullGameName);
      return (index > -1)
        ? ['recieveGameData', games[index].servers]
        : ['error', `Мониторинг серверов игры "${fullGameName}" не поддерживается сервером!`];
    },

    // Возвращает информацию о игроках указанного сервера игры
    getGamePlayers(ip, port, fullGameName) {
      if (!players[fullGameName])
        return ['error', `Мониторинг серверов игры "${fullGameName}" не поддерживается сервером!`];
      
      let result = players[fullGameName][`${ip}:${port}`];
      return !result
        ? ['error', `Объект игроков серверов игры "${fullGameName}" не инициализирован!`]
        : ['recieveGamePlayers', result];
    },

    // Добавляет новый сервер в базу
    async addServer(ip, port, fullGameName) {
      // Проверка корректности номера порта
      if (!/^\d+$/.test(port) || +port > 65535)
        return ['error', 'Неверно указан номер порта!'];

      // Проверка типа игры
      if (~gamesList.indexOf(fullGameName))
        return ['error', `Мониторинг серверов игры "${fullGameName}" не поддерживается сервером!`];

      // Проверка адреса
      let address = new IP.Address4(ip);
      if (!address.valid) {
        address = new IP.Address6(ip);
        if (!address.valid) {
          try {
            let ipData = await dns(ip);
            address = new IP[`Address${ipData.family}`](ipData.address);
          } catch(e) {
            return ['error', 'Неверный формат IP-адреса.']
          }
        }
      }
      address = address.correctForm();

      return await addServerToDatabase(ip, port, fullGameName)
    }
  });

  server.listen(process.env.PORT || 80);
}();

/*
  Добавляет сервер в базу данных
  db - адаптер базы данных
  ip - адрес сервера
  port - порт сервера
  game - полное название игры
*/
async function addServerToDatabase(ip, port, game) {
  if (await db.isEmptryQueryResult(isThereServerInDatabase, [ip, port, game]))
    return ['error', 'Данный сервер уже есть в базе данных!'];

  try {
    let info = await checkConnection(ip, port, cache.games[game].type);
  } catch(e) {
    return ['error',
      'Не удалось добавить сервер в базу данных! ' +
      'Указанный сервер не отвечает на запрос!'
    ];
  }

  // Проверка на соответствие указанного типа игры
  switch (true) {
    case game === 'Counter-Strike: Condition Zero'
      && info.raw.folder !== 'czero':

      return ['error',
        'Данный сервер не является игровым сервером ' +
        'игры Counter-Strike: Condition Zero!'
      ];

    case game === 'Counter-Strike: Global Offensive'
      && info.raw.folder !== 'csgo':

      return ['error',
        'Данный сервер не является игровым сервером ' +
        'игры Counter-Strike: Global Offensive!'
      ];
      
    case game === 'Half-Life 1 Deathmatch'
      && info.raw.folder !== 'valve':

      return ['error',
        'Данный сервер не является игровым сервером ' +
        'игры Half-Life 1 Deathmatch!'
      ];

    case game === 'Garry’s Mod'
      && info.raw.folder !== 'garrysmod':

      return ['error',
        'Данный сервер не является игровым сервером ' +
        'игры Garry’s Mod!'
      ];

    case game === 'Counter-Strike 1.6'
      && (info.raw.folder !== 'cstrike'
      || info.raw.protocol != 47
      && info.raw.protocol != 48):

      return ['error',
        'Данный сервер не является игровым сервером ' +
        'игры Counter-Strike 1.6!'
      ];
    case game === 'Counter-Strike: Source'
      && (info.raw.folder !== 'cstrike'
      || info.raw.protocol == 47
      || info.raw.protocol == 48):
      
      return ['error',
        'Данный сервер не является игровым сервером ' +
        'игры Counter-Strike: Source!'
      ];
  }
  
  // Добавляем сервер в базу
  await db.query(QUERIES.addNewServer, [ip, port, game]);
  console.log(`В базу данных добавлен новый сервер: ${ip}:${port} (${game})`);

    let server = {
        ip, port,
        online: false
    };

    games[game].servers.push(server);

    await updateServerInfo(games[game], server, players[game], `${ip}:${port}`);
    return ['serverAdded', 'Сервер успешно добавлен в базу данных!'];
}