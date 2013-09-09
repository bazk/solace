#!/usr/bin/env node

var express = require('express');

var sessions = require('./routes/sessions.js');
var experiments = require('./routes/experiments.js');
var tests = require('./routes/tests.js');

function json(req, res, next) {
    res.type('json');
    next();
}

var app = express();
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({secret: 'asd87c9a8sc9a8j19m98asj982'}));
app.use(express.static(__dirname + '/app'));

app.post('/api/sessions', json, sessions.login);
app.get('/api/sessions', json, sessions.get);
app.delete('/api/sessions', json, sessions.logout);

app.get('/api/experiments', json, sessions.auth, experiments.findAll);
app.post('/api/experiments', json, sessions.auth, experiments.insert);

app.get('/api/experiment/:id', json, sessions.auth, experiments.findById);
// app.post('/api/experiment/:id', json, sessions.auth, experiments.update);

app.listen(3000);
