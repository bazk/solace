#!/usr/bin/env node

var pg = require('pg');
var express = require('express');
var Q = require('q');

var user     = "solace",
    passwd   = "zxASd0&.AS)D(-=Asd098C",
    hostname = "localhost",
    port     = "5432",
    dbname   = "solace";

var conString = "postgres://"+user+":"+passwd+"@"+hostname+":"+port+"/"+dbname;

function get_experiments(req, res) {
    pg.connect(conString, function(err, client, done) {
        if (err)
            return res.send(500, {error: err});

        var q = 'SELECT id,name,description,created_at FROM experiments ORDER BY id;';
        client.query(q, function(err, result) {
            done();

            if (err)
                return res.send(500, {error: err});

            res.send(result.rows);
        });
    });
}

function post_experiments(req, res) {
    var name = req.body.name,
        description = req.body.description;

    pg.connect(conString, function(err, client, done) {
        if (err)
            return res.send(500, {error: err});

        var q = 'INSERT INTO experiments (name, description) VALUES ($1, $2);';
        client.query(q, [name, description], function(err, result) {
            done();

            if (err)
                return res.send(500, {error: err});

            res.send(200);
        });
    });
}

function get_tests_by_experiment(req, res) {
    if (typeof req.params.id === 'undefined')
        return res.send(404);

    var exp_id = req.params.id;

    pg.connect(conString, function(err, client, done) {
        if (err)
            return res.send(500, {error: err});

        var q = 'SELECT * FROM tests WHERE exp_id=$1 ORDER BY id;';
        client.query(q, [exp_id], function(err, result) {
            done();

            if (err)
                return res.send(500, {error: err});

            res.send(result.rows);
        });
    });
}

var app = express();
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.static(__dirname + '/app'));
app.get('/data/experiments', get_experiments);
app.post('/data/experiments', post_experiments);
app.get('/data/experiments/:id/tests', get_tests_by_experiment);
app.listen(3000);