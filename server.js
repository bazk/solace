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

app.post('/api/sessions', sessions.login);
app.get('/api/sessions', sessions.get);
app.delete('/api/sessions', sessions.logout);

app.get('/api/experiments', sessions.auth, experiments.findAll);
app.post('/api/experiments', sessions.auth, experiments.insert);

app.get('/api/experiment/:id', sessions.auth, experiments.findById);
app.post('/api/experiment/:id', sessions.auth, experiments.update);

app.listen(3000);
