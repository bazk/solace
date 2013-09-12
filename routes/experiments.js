var pg = require('pg');
var config = require('../config.js')

exports.findAll = function(req, res) {
    pg.connect(config.conString, function(err, client, done) {
        if (err)
            return res.send(500, {error: 'db_connection_failed'});

        var q = 'SELECT id,name,description,created_at FROM experiments ORDER BY created_at DESC;';
        client.query(q, function(err, result) {
            done();

            if (err)
                return res.send(500, {error: 'db_query_failed'});

            res.send(result.rows);
        });
    });
}

exports.findById = function(req, res) {
    if (typeof req.params.id === 'undefined')
        return res.send(400, {error: 'missing_parameters'});

    var exp_id = req.params.id;

    pg.connect(config.conString, function(err, client, done) {
        if (err)
            return res.send(500, {error: 'db_connection_failed'});

        var q = 'SELECT * FROM experiments WHERE id=$1;';
        client.query(q, [exp_id], function(err, result) {
            if (err || result.rows.length < 1) {
                done();
                return res.send(500, {error: 'db_query_failed'});
            }

            var exp = result.rows[0];

            q = 'SELECT \
                    i.id, i.started_at, i.finished_at, i.num_runs, \
                    i.comment, avg(r.progress) AS progress \
                FROM instances i, runs r \
                WHERE r.instance_id=i.id AND i.exp_id=$1 \
                GROUP BY i.id \
                ORDER BY i.started_at DESC;';
            client.query(q, [exp_id], function(err, result2) {
                done();

                if (err)
                    return res.send(500, {error: 'db_query_failed'});

                exp.instances = result2.rows;
                res.send(exp);
            });
        });
    });
}

exports.insert = function(req, res) {
    var name = req.body.name,
        description = req.body.description;

    pg.connect(config.conString, function(err, client, done) {
        if (err)
            return res.send(500, {error: 'db_connection_failed'});

        var q = 'INSERT INTO experiments (name, description) VALUES ($1, $2);';
        client.query(q, [name, description], function(err, result) {
            done();

            if (err)
                return res.send(500, {error: 'db_query_failed'});

            res.send(200);
        });
    });
}