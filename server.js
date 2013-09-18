#!/usr/bin/env node

var express = require('express');
var config = require('./config.js');

var db = require('./middleware/db.js');
var permissions = require('./middleware/permissions.js');

var sessions = require('./routes/sessions.js');
var experiments = require('./routes/experiments.js');
var instances = require('./routes/instances.js');
var runs = require('./routes/runs.js');
var files = require('./routes/files.js');

var port = parseInt(process.argv.splice(2)[0]) || 3000;

var app = express();
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({
    store: new db.sessionStore(),
    secret: 'asd87c9a8sc9a8j19m98asj982'
}));
app.use(express.static(__dirname + '/app'));

db.config(config.db_config);

app.post('/api/s', db.connect, sessions.login);
app.get('/api/s', sessions.get);
app.delete('/api/s', sessions.logout);

app.get( '/api/e', sessions.auth, db.connect, experiments.list);
app.post('/api/e', sessions.auth, db.connect, experiments.create);
app.get( '/api/e/:expName', sessions.auth, db.connect, permissions.read, experiments.get);

app.post('/api/e/:expName', sessions.auth, db.connect, permissions.write, instances.create);
app.get( '/api/e/:expName/:instId', sessions.auth, db.connect, permissions.read, instances.get);

app.get( '/api/e/:expName/:instId/:runId', sessions.auth, db.connect, permissions.read, runs.get);
app.post('/api/e/:expName/:instId/:runId', sessions.auth, db.connect, permissions.write, runs.update);
app.post('/api/e/:expName/:instId/:runId/begin', sessions.auth, db.connect, permissions.write, runs.begin);
app.post('/api/e/:expName/:instId/:runId/done', sessions.auth, db.connect, permissions.write, runs.done);
app.post('/api/e/:expName/:instId/:runId/cancel', sessions.auth, db.connect, permissions.write, runs.cancel);
app.post('/api/e/:expName/:instId/:runId/upload', sessions.auth, db.connect, permissions.write, runs.upload);
app.get( '/api/e/:expName/:instId/:runId/files', sessions.auth, db.connect, permissions.read, runs.listFiles);
app.get( '/api/e/:expName/:instId/:runId/result/:name', sessions.auth, db.connect, permissions.read, runs.getResult);

app.get( '/api/f/:expName', sessions.auth, db.connect, permissions.read, files.list);
app.get( '/api/f/:expName/:fileId', sessions.auth, db.connect, permissions.read, files.get);

app.listen(port);
