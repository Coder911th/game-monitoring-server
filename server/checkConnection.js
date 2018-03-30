const
    Gamedig = require('gamedig');

// Проверяет активен ли указанный сервер
function checkConnection(ip, port, game) {
  return Gamedig.query({
    type: game,
    host: ip,
    port: port
  });
};

module.exports = checkConnection;