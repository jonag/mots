/**
 * Module dependencies.
 */
var express = require('express'),
    routes  = require('./routes'),
    http  = require('http'),
    path  = require('path'),
    os = require('os'),
    prompts = require('prompts'),
    app   = express(),
    mfl = require('./game_files/motsFleches'),

    _gridNumber = 0;


// all environments
app.set('port', parseInt(process.env.PORT));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);

// Start server
var server = http.createServer(app);
mfl.startMflServer(server);
server.listen(app.get('port'), onServerReady);

/** Call when the express server has started */
async function onServerReady() {
  console.log('Express server listening on port ' + app.get('port'));
}
