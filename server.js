#!/usr/bin/env node

var express = require('express');
var config = require('./config.js');

var db = require('./middleware/db.js');

var sessions = require('./routes/sessions.js');
var experiments = require('./routes/experiments.js');
var instances = require('./routes/instances.js');
var runs = require('./routes/runs.js');

function json(req, res, next) {
    res.type('json');
    next();
};

var app = express();
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({secret: 'asd87c9a8sc9a8j19m98asj982'}));
app.use(express.static(__dirname + '/app'));

db.config(config.db_config);

app.post('/api/sessions', json, db.connect, sessions.login);
app.get('/api/sessions', json, sessions.get);
app.delete('/api/sessions', json, sessions.logout);

app.get('/api/experiments', json, sessions.auth, db.connect, experiments.findAll);
app.post('/api/experiments', json, sessions.auth, db.connect, experiments.insert);
app.get('/api/experiment/:id', json, sessions.auth, db.connect, experiments.findById);
// app.post('/api/experiment/:id', json, sessions.auth, db.connect, experiments.update);

app.post('/api/instances', json, sessions.auth, db.connect, instances.insert);
app.get('/api/instance/:id', json, sessions.auth, db.connect, instances.findById);

app.get('/api/run/:id', json, sessions.auth, db.connect, runs.findById);
app.get('/api/run/:id/result/:name', json, sessions.auth, db.connect, runs.findResultByName);
app.post('/api/run/:id', json, sessions.auth, db.connect, runs.update);
app.post('/api/run/:id/done', json, sessions.auth, db.connect, runs.done);
app.post('/api/run/:id/cancel', json, sessions.auth, db.connect, runs.cancel);

app.get('/api/run/:id/files', json, sessions.auth, db.connect, runs.findFilesByRunId);
app.post('/api/run/:id/files', json, sessions.auth, db.connect, runs.upload);
app.get('/api/run/:id/files/:file', json, sessions.auth, db.connect, runs.download);

app.listen(3000);
