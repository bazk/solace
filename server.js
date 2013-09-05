#!/usr/bin/env node

var express = require('express');

var sessions = require('./routes/sessions.js');
var experiments = require('./routes/experiments.js');
var tests = require('./routes/tests.js');

var app = express();
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({secret: 'asd87c9a8sc9a8j19m98asj982'}));
app.use(express.static(__dirname + '/app'));

app.post('/sessions', sessions.login);
app.get('/sessions', sessions.get);
app.delete('/sessions', sessions.logout);

app.get('/data/experiments', sessions.auth, experiments.get);
app.post('/data/experiments', sessions.auth, experiments.post);
app.get('/data/experiments/:id/tests', sessions.auth, tests.get);

app.listen(3000);
