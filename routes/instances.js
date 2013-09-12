var pg = require('pg');
var Client = require('pg').Client;
var config = require('../config.js')

// exports.findAll = function(req, res) {
//     pg.connect(config.conString, function(err, client, done) {
//         if (err)
//             return res.send(500, {error: 'db_connection_failed'});

//         var q = 'SELECT id,name,description,created_at FROM experiments ORDER BY created_at DESC;';
//         client.query(q, function(err, result) {
//             done();

//             if (err)
//                 return res.send(500, {error: 'db_query_failed'});

//             res.send(result.rows);
//         });
//     });
// }

exports.findById = function(req, res) {
    if (typeof req.params.id === 'undefined')
        return res.send(400, {error: 'missing_parameters'});

    var instance_id = req.params.id;

    pg.connect(config.conString, function(err, client, done) {
        if (err)
            return res.send(500, {error: 'db_connection_failed'});

        var q = 'SELECT * FROM instances WHERE id=$1;';
        client.query(q, [instance_id], function(err, result) {
            if (err || result.rows.length < 1) {
                done();
                return res.send(500, {error: 'db_query_failed'});
            }

            var instance = result.rows[0];

            q = 'SELECT * FROM runs WHERE instance_id=$1 ORDER BY id DESC;';
            client.query(q, [instance_id], function(err, result) {
                if (err) {
                    done();
                    return res.send(500, {error: 'db_query_failed'});
                }

                instance.runs = result.rows;

                q = 'SELECT * FROM parameters WHERE instance_id=$1 ORDER BY name;';
                client.query(q, [instance_id], function(err, result) {
                    done();

                    if (err)
                        return res.send(500, {error: 'db_query_failed'});

                    instance.parameters = result.rows;
                    res.send(instance);
                });
            });
        });
    });
}

var rollback = function(client, err, res) {
    client.query('ROLLBACK', function() {
        client.end();
    });
    console.log(err);
    res.send(500, {error: 'db_query_failed'});
}

exports.insert = function(req, res) {
    var exp_id = req.body.experiment,
        num_runs = parseInt(req.body.num_runs),
        parameters = JSON.parse(req.body.parameters);

    var client = new Client(config.conString);
    client.connect();

    client.query('BEGIN', function(err, result) {
        if(err) return rollback(client, err, res);

        client.query('INSERT INTO instances (exp_id, num_runs) VALUES ($1, $2) RETURNING id;', [exp_id, num_runs], function(err, result) {
            if(err) return rollback(client, err, res);
            var inst_id = result.rows[0].id;

            var stream = client.copyFrom("COPY parameters (instance_id, name, value, type) FROM STDIN WITH CSV;");

            stream.on('close', function () {
                var stream = client.copyFrom("COPY runs (instance_id) FROM STDIN WITH CSV;");

                stream.on('close', function () {
                    client.query('SELECT id FROM runs WHERE instance_id=$1 ORDER BY id;', [inst_id], function(err, result) {
                        if(err) return rollback(client, err, res);

                        client.query('COMMIT', client.end.bind(client));
                        res.send(200, {id: inst_id, runs: result.rows});
                    });
                });

                stream.on('error', function (err) {
                    rollback(client, err, res);
                });

                for (var i=0; i<num_runs; i++)
                    stream.write(inst_id+"\n");
                stream.end();
            });

            stream.on('error', function (err) {
                rollback(client, err, res);
            });

            for (var i=0; i<parameters.length; i++) {
                var name = parameters[i]['name'],
                    value = parameters[i]['value'],
                    type = parameters[i]['type'];

                stream.write(inst_id+',"'+name+'","'+value+'",'+type+'\n');
            }
            stream.end();
        });
    });
}
