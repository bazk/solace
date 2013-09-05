var pg = require('pg');
var config = require('../config.js')

exports.get = function(req, res) {
    pg.connect(config.conString, function(err, client, done) {
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

exports.post = function(req, res) {
    var name = req.body.name,
        description = req.body.description;

    pg.connect(config.conString, function(err, client, done) {
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