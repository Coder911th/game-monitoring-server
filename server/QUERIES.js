// Объект всевозможных запросов
module.exports = {
  allGames:   'SELECT * FROM games',
  allServers: 'SELECT * FROM servers',
  isThereServerInDatabase: 
    'SELECT * ' +
    'FROM servers ' +
    'WHERE ip = $1 AND port = $2 AND game_id = (' +
      'SELECT id ' +
      'FROM games ' +
      'WHERE name = $3)',
  addNewServer: 
    'INSERT INTO servers (ip, port, game_id) ' +
    'VALUES ($1, $2, (' +
        'SELECT id ' +
        'FROM games ' +
        'WHERE name = $3))'
};