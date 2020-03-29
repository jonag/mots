var enums   = require('./enums');

function Player (socket, uid) {
  this._socket    = socket;
  this._playerTinyObject = {
      id:         uid,
      nick:       '',
      monster:    null,
      score:      0,
      nbWords:    0,
      progress: 0,
      online: true,
    };
};

Player.prototype.getNick = function () { return (this._playerTinyObject.nick); };
Player.prototype.setNick = function (nick) {
  this._playerTinyObject.nick = nick;
  console.info('Please call me [' + nick + '] !');
};
Player.prototype.setMonster = function (monster) { this._playerTinyObject.monster = monster; };
Player.prototype.getID = function () { return (this._playerTinyObject.id); };
Player.prototype.getScore = function () { return (this._playerTinyObject.score); };
Player.prototype.getNbWords = function () { return (this._playerTinyObject.nbWords); };
Player.prototype.getColor = function () { return (this._playerTinyObject.monster.color); };
Player.prototype.getMonster = function () { return (this._playerTinyObject.monster); };
Player.prototype.getPlayerObject = function () { return (this._playerTinyObject); };
Player.prototype.getProgress = function () { return (this._playerTinyObject.progress); };
Player.prototype.getOnline = function () { return (this._playerTinyObject.online); };
Player.prototype.setOnline = function (online) { this._playerTinyObject.online = online };

Player.prototype.updateScore = function (points, progress) {
  this._playerTinyObject.score += points;
  this._playerTinyObject.nbWords++;
    this._playerTinyObject.progress = progress;
};

Player.prototype.resetPlayerInfos = function () {
  this._playerTinyObject.score = 0;
  this._playerTinyObject.nbWords = 0;
    this._playerTinyObject.progress = 0;
};

module.exports = Player;
