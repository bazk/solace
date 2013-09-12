var pg = require('pg');
var Client = require('pg').Client;
var config = require('../config.js')

var rollback = function(client, err, res) {
    client.query('ROLLBACK', function() {
        client.end();
    });
    console.log(err);
    res.send(500, {error: 'db_query_failed'});
};

var error = function(client, err, res) {
    client.end();
    console.log(err);
    res.send(500, {error: 'db_query_failed'});
};

exports.findById = function(req, res) {
    if (typeof req.params.id === 'undefined')
        return res.send(400, {error: 'missing_parameters'});

    var run_id = parseInt(req.params.id);

    var client = new Client(config.conString);
    client.connect();

    client.query('SELECT * FROM runs WHERE id=$1;', [run_id], function(err, result) {
        if(err) return error(client, err, res);

        var run = result.rows[0];

        client.query('SELECT name,type FROM results WHERE run_id=$1 GROUP BY name,type;', [run_id], function(err, result) {
            if(err) return error(client, err, res);

            run.resultVariables = result.rows;

            client.end();
            return res.send(200, run);
        });
    });
};

exports.findResultByName = function(req, res) {
    if (typeof req.params.id === 'undefined')
        return res.send(400, {error: 'missing_parameters'});

    if (typeof req.params.name === 'undefined')
        return res.send(400, {error: 'missing_parameters'});

    var run_id = parseInt(req.params.id),
        var_name = req.params.name;

    var client = new Client(config.conString);
    client.connect();

    client.query('SELECT inserted_at,value FROM results WHERE run_id=$1 AND name=$2 ORDER BY inserted_at;', [run_id,var_name], function(err, result) {
        if(err) return error(client, err, res);
        client.end();

        var results = [];
        for (var i=0; i<result.rows.length; i++) {
            results.push([result.rows[i].inserted_at, result.rows[i].value]);
        }
        return res.send(200, {data: results});
    });
};

exports.update = function(req, res) {
    if (typeof req.params.id === 'undefined')
        return res.send(400, {error: 'missing_parameters'});

    var run_id = parseInt(req.params.id),
        progress = parseFloat(req.body.progress),
        results = JSON.parse(req.body.results);

    var client = new Client(config.conString);
    client.connect();

    client.query('BEGIN', function(err, result) {
        if(err) return rollback(client, err, res);

        client.query('UPDATE runs SET progress=$2 WHERE id=$1;', [run_id, progress], function(err, result) {
            if(err) return rollback(client, err, res);

            var stream = client.copyFrom("COPY results (run_id, name, value, type) FROM STDIN WITH CSV;");

            stream.on('close', function () {
                client.query('COMMIT', client.end.bind(client));
                res.send(200);
            });

            stream.on('error', function (err) {
                rollback(client, err, res);
            });

            for (var i=0; i<results.length; i++) {
                var name = results[i]['name'],
                    value = results[i]['value'],
                    type = results[i]['type'];

                stream.write(run_id+',"'+name+'","'+value+'",'+type+'\n');
            }
            stream.end();
        });
    });
}

exports.done = function(req, res) {
    if (typeof req.params.id === 'undefined')
        return res.send(400, {error: 'missing_parameters'});

    var run_id = parseInt(req.params.id),
        results = JSON.parse(req.body.results);

    var client = new Client(config.conString);
    client.connect();

    client.query('BEGIN', function(err, result) {
        if(err) return rollback(client, err, res);

        client.query('UPDATE runs SET progress=1.0, finished_at=now() WHERE id=$1;', [run_id], function(err, result) {
            if(err) return rollback(client, err, res);

            var stream = client.copyFrom("COPY results (run_id, name, value, type) FROM STDIN WITH CSV;");

            stream.on('close', function () {
                client.query('COMMIT', client.end.bind(client));
                res.send(200);
            });

            stream.on('error', function (err) {
                rollback(client, err, res);
            });

            for (var i=0; i<results.length; i++) {
                var name = results[i]['name'],
                    value = results[i]['value'],
                    type = results[i]['type'];

                stream.write(run_id+',"'+name+'","'+value+'",'+type+'\n');
            }
            stream.end();
        });
    });
}

exports.cancel = function(req, res) {
    if (typeof req.params.id === 'undefined')
        return res.send(400, {error: 'missing_parameters'});

    var run_id = parseInt(req.params.id);

    var client = new Client(config.conString);
    client.connect();

    client.query('UPDATE runs SET canceled=true WHERE id=$1;', [run_id, progress], function(err, result) {
        if(err) return rollback(client, err, res);

        client.end();
        res.send(200);
    });
}