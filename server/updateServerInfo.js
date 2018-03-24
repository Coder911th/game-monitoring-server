const
    Gamedig = require('gamedig');

/*
  Запускает цикл обновлений состояния сервера
  game - объект конкретной игры
  server - { ip, port, online }
  players - объект активных игроков конкретной игры
  socket - ${ip}:${port} для записи в players
*/
function updateServerInfo(game, server, players, socket) {
    return Gamedig.query({
        type: game.type,
        host: server.ip,
        port: server.port
    })
        .then(data => {
            let now = Date.now();
            ({
                name: server.name,
                map: server.map,
                password: server.password,
                maxplayers: server.maxPlayers,
                bots: server.bots,
                online: server.online,
                lastUpdate: server.lastUpdate,
                lastOnline: server.lastOnline
            } = Object.assign(data, {
                online: true,
                lastUpdate: now,
                lastOnline: now
            }));
            server.players = data.players.length;
            players[socket] = data.players;
            setTimeout(updateServerInfo, (20 + Math.random() * 20) * 1000,
                game, server, players, socket);
        }).catch(error => {
            [
                server.online,
                server.lastUpdate,
                server.name,
                server.map,
                server.password,
                server.maxPlayers,
                server.bots,
                server.players
            ] = [false, Date.now()];
            players[socket] = undefined;
            setTimeout(updateServerInfo, (20 + Math.random() * 20) * 1000,
                game, server, players, socket);
        });
}

module.exports = updateServerInfo;