var enums           = require('./enums'),
    config          = require('../conf.json'),
    GridManager     = require('./gridManager'),
    PlayersManager  = require('./playersManager');

// Defines
var MAX_PLAYERS   = 6;
var SERVER_CHAT_COLOR = '#c0392b';
var TIME_BEFORE_START = 5;

// Parameters
var _playersManager,
    _gridManager,
    _io,
    _gameState,
    _lastWordFoudTimestamp,
    _wordsFound;

function startGame() {
  var Grid  = _gridManager.getGrid(),
      delay;

  delay = (_playersManager.getNumberOfPlayers() > 1) ? TIME_BEFORE_START : 0;

  // Change game state
  _gameState = enums.ServerState.OnGame;

  // RàZ des mots déjà trouvés
  _wordsFound = [];

  // Send grid to clients
  _io.sockets.emit('grid_event', { grid: Grid, timer: delay } );
}

function resetGame() {
  var infos;

  // Reset game state
  _gameState = enums.ServerState.WaitingForPlayers;

  // Reset players
  _playersManager.resetPlayersForNewGame();

  // Reset the grid
  _gridManager.resetGrid(function (grid) {
    if (grid == null) {
      // If an error occurs, exit
      console.error('[ERROR] Cannot retrieve next grid');
      sendChatMessage('Oups, impossible de récupérer la prochaine grille !');
    }
    else {
      infos = _gridManager.getGridInfos();
      sendChatMessage('Grille ' + infos.provider + ' ' + infos.id + ' (Niveau ' + infos.level + ') prête !');

      // Send reset order to clients
      _io.sockets.emit('grid_reset');
    }
  });
}

function playerLog (socket, nick, monsterId) {
  var gridInfos = _gridManager.getGridInfos();

  // Retreive PlayerInstance
  socket.get('PlayerInstance', function (error, player) {

    if (error)
      console.error(error);
    else {

      // Set new player parameters
      player.setNick(nick);
      _playersManager.setMonsterToPlayer(player, monsterId);
      // Refresh monster list for unready players
      _io.sockets.emit('logos', _playersManager.getAvailableMonsters());

      // Bind found word event
      socket.on('wordValidation', function (wordObj) {
        checkWord(player, wordObj);
      });

      // Notify everyone about the new client
      sendChatMessage( nick + ' a rejoint la partie !<br/>' + _playersManager.getNumberOfPlayers() + ' joueurs connectés', undefined, undefined, _playersManager.getPlayerList());

      // Send grid informations to the player
      sendPlayerMessage(socket, 'Grille actuelle: ' + gridInfos.provider + ' ' + gridInfos.id + ' (Niveau ' + gridInfos.level + ')');

      // Si la partie est déjà commencée on transmet la grille au joueur
      if (_gameState === enums.ServerState.OnGame) {
        socket.emit('grid_event', { grid: _gridManager.getGrid(), timer: 0});
        socket.emit('words_found', _wordsFound);
      }
    }
  });
}

function bonusChecker(playerPoints, nbWordsRemaining) {
  var bonus = {
    points: 0,
    bonusList: []
  },
  now = new Date().getTime();

  // If it's the first word, add 4 bonus points
  if (_lastWordFoudTimestamp == null) {
    bonus.bonusList.push( { title: "Preum's !", points: 4 } );
    bonus.points += 4;
  }

  // If it's the last word
  if (nbWordsRemaining <= 0) {
    bonus.bonusList.push( { title: 'Finish him !', points: 4 } );
    bonus.points += 4;
  }

  // If it's the first word since the last 2 minutes, 5 points
  if ((now - _lastWordFoudTimestamp) > 120000) {
    bonus.bonusList.push( { title: 'Débloqueur', points: 5 } );
    bonus.points += 5;
  }

  // If it's a big word, add 3 points
  if (playerPoints >= 6) {
    bonus.bonusList.push( { title: 'Gros mot !', points: 3 } );
    bonus.points += 3;
  }

  return (bonus);
}

function checkWord(player, wordObj) {
  var points,
      bonuses;

  // Check word
  points = _gridManager.checkPlayerWord(wordObj);

  // If the players has some points, it's mean it's the right word ! Notify players about it
  if (points >= 0) {

    // Notify all clients about this word
    wordObj.color = player.getColor();
    _io.sockets.emit('word_founded', wordObj);
    _wordsFound.push(wordObj);

    // Check for bonuses
    bonuses = bonusChecker(points, _gridManager.getNbRemainingWords());

    // Remember time this last word had been found
    _lastWordFoudTimestamp = new Date().getTime();

    // Update player score and notify clients
    player.updateScore(points + bonuses.points, _gridManager.getAccomplishmentRate(player.getScore(), _playersManager.getNumberOfPlayers()));
    _io.sockets.emit('score_update', { playerID: player.getID(), score: player.getScore(), words: player.getNbWords(), progress: player.getProgress(), bonus: bonuses.bonusList } );

    if (_gridManager.getNbRemainingWords() <= 0) {
      console.log('[SERVER] Game over ! Sending player\'s notification...');
      _io.sockets.emit('game_over', _playersManager.getWinner().getPlayerObject());
    }
  }
}

function checkServerCommand(message) {
  var number;

  // If it's not a server command
  if (message[0] != '!')
    return (false);

  // Check the start command
  if ((_gameState == enums.ServerState.WaitingForPlayers) && (message == '!start')) {
    startGame();
    return (true);
  }

  // Check the change grid command
  if (message.indexOf('!reset') >= 0) {
    resetGame();
    return (true);
  }

  return (false);
}

function sendChatMessage(Message, sender, color, playerList) {
  if (sender === undefined) {
    sender = 'server';
    color = SERVER_CHAT_COLOR;
  }

  _io.sockets.emit('chat', { message: Message, from: sender, color: color, players: playerList } );
}

function sendPlayerMessage(socket, Message) {
  socket.emit('chat', { message: Message, from: 'server', color: SERVER_CHAT_COLOR });
}


/**
 *  Start mfl server.
 */
exports.startMflServer = function (server) {
  // Instanciiate io module with proper parameters
  _io = require('socket.io').listen(server);
  _io.configure(function(){
    _io.set('log level', 2);
  });

  // Retreive the grid
  _gridManager = new GridManager();
  _gridManager.retreiveAndParseGrid(function (grid) {
    if (grid == null) {
      // If an error occurs, exit
      console.error('[ERROR] Cannot retreive grid. Abort server.');
      process.exit(1);
    }
  });

  // Create playersManager instance and register events
  _playersManager = new PlayersManager();
  _playersManager.on('players-ready', function () {
});


  // On new client connection
  _io.sockets.on('connection', function (socket) {

    // If it remains slots in the room, add player and bind events
    if (_playersManager.getNumberOfPlayers() < MAX_PLAYERS) {

      // Add new player
      var player = _playersManager.addNewPlayer(socket);

      // Register to socket events
      socket.on('disconnect', function () {
        // When a player disconnect, retreive player instance
        socket.get('PlayerInstance', function (error, player) {
          sendChatMessage( player.getNick() + ' a quitté la partie');
          _playersManager.removePlayer(player);
          player = null;
          if (_playersManager.getNumberOfPlayers() < 1) {
            resetGame();
          }
        });

      });

      socket.on('userIsReady', function (infos) {
        playerLog(socket, infos.nick, infos.monster);
      });

      socket.on('chat', function (message) {
        // If it's a message for the server, treat it
        // Else broadcast the message to everyone
        if (checkServerCommand(message) == false) {
          socket.get('PlayerInstance', function (error, player) {
            sendChatMessage(message, player.getNick(), player.getColor());
          });
        }
      });

      // Remember PlayerInstance and push it to the player list
      socket.set('PlayerInstance', player);

      // Send to the player availables logos
      socket.emit('logos', _playersManager.getAvailableMonsters());
    }
    // Else notify players he can't play for the moment
    else {
      // To do it, returns an empty list of available logos == null
      socket.emit('logos', null);
    }

  });


  // Set game state and print ready message
  _gameState = enums.ServerState.WaitingForPlayers;
  console.log('Game started and waiting for players on port ' + process.env.PORT);
};
