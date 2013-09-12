exports.findById = function(req, res) {
    if (typeof req.params.id === 'undefined')
        return res.send(400, {error: 'missing_parameters'});

    var instance_id = parseInt(req.params.id);

    req.db.query('SELECT * FROM instances WHERE id=$1;', [instance_id], function(result) {
        if (result.rows.length < 1) {
            req.db.done();
            return res.send(404, {error: 'not_found'});
        }

        var instance = result.rows[0];

        req.db.query('SELECT * FROM runs WHERE instance_id=$1 ORDER BY id DESC;', [instance_id], function(result) {
            instance.runs = result.rows;

            req.db.query('SELECT * FROM parameters WHERE instance_id=$1 ORDER BY name;', [instance_id], function(result) {
                req.db.done();
                instance.parameters = result.rows;
                res.send(instance);
            });
        });
    });
}

exports.insert = function(req, res) {
    var exp_id = req.body.experiment,
        num_runs = parseInt(req.body.num_runs),
        parameters = JSON.parse(req.body.parameters);

    req.db.transaction(function (commit, rollback) {
        req.db.query('INSERT INTO instances (exp_id, num_runs) VALUES ($1, $2) RETURNING id;',
          [exp_id, num_runs], function(result) {
            var inst_id = result.rows[0].id;

            var stream1 = req.db.copyFrom('COPY parameters (instance_id, name, value, type) FROM STDIN WITH CSV;', function () {
                var stream2 = req.db.client.copyFrom("COPY runs (instance_id) FROM STDIN WITH CSV;", function () {
                    req.db.query('SELECT id FROM runs WHERE instance_id=$1 ORDER BY id;', [inst_id], function(result) {
                        commit(function () {
                            req.db.done();
                            res.send(200, {id: inst_id, runs: result.rows});
                        });
                    });
                });

                for (var i=0; i<num_runs; i++)
                    stream2.write(inst_id+"\n");
                stream2.end();
            });

            for (var i=0; i<parameters.length; i++) {
                var name = parameters[i]['name'],
                    value = parameters[i]['value'],
                    type = parameters[i]['type'];

                stream1.write(inst_id+',"'+name+'","'+value+'",'+type+'\n');
            }
            stream1.end();
        });
    });
}
