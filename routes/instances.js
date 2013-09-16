exports.findById = function(req, res) {
    var instance_id = req.params.id;

    if (typeof instance_id !== 'string') {
        res.send(400, {error: 'missing_parameters'});
        return;
    }

    req.db.query('SELECT * FROM instances WHERE id=$1;', [instance_id], function(result) {
        if (result.rows.length < 1) {
            req.db.done();
            return res.send(404, {error: 'not_found'});
        }

        var instance = result.rows[0];

        req.db.query("SELECT has_permission($1, $2, 'read');", [req.user,instance.exp_id], function (result) {
            if ((result.rows.length < 1) || (!result.rows[0].has_permission)) {
                req.db.done();
                res.send(403, {error: 'forbidden'});
                return;
            }

            req.db.query('SELECT * FROM runs WHERE instance_id=$1 ORDER BY id DESC;', [instance_id], function(result) {
                instance.runs = result.rows;

                req.db.query('SELECT * FROM experiment_parameters WHERE exp_id=$1 ORDER BY name;', [instance.exp_id], function(result) {
                    req.db.done();
                    instance.parameters = result.rows;
                    res.send(instance);
                });
            });
        });
    });
}

exports.insert = function(req, res) {
    var exp_name = req.body.experiment,
        num_runs = parseInt(req.body.num_runs),
        parameters = JSON.parse(req.body.parameters);

    if (typeof exp_name !== 'string') {
        res.send(400, {error: 'missing_parameters'});
        return;
    }

    req.db.query("SELECT has_permission($1, (SELECT id FROM experiments WHERE name = $2), 'write');",
                [req.user,exp_name], function (result) {

        if ((result.rows.length < 1) || (!result.rows[0].has_permission)) {
            req.db.done();
            res.send(403, {error: 'forbidden'});
            return;
        }

        var exp_id = result.rows[0].id;

        req.db.transaction(function (commit, rollback) {
            req.db.query('INSERT INTO instances (exp_id) (SELECT id AS exp_id FROM experiments WHERE name = $1) RETURNING id;',
              [exp_name], function(result) {
                var inst_id = result.rows[0].id;

                var stream1 = req.db.copyFrom('COPY instance_parameter_values (instance_id, name, value, type) FROM STDIN WITH CSV;', function () {
                    var stream2 = req.db.copyFrom("COPY runs (instance_id,num) FROM STDIN WITH CSV;", function () {
                        commit(function () {
                            req.db.done();
                            res.send(200, {id: inst_id});
                        });
                    });

                    for (var i=1; i<num_runs+1; i++)
                        stream2.write('"'+inst_id+'",'+i+'\n');
                    stream2.end();
                });

                for (var i=0; i<parameters.length; i++) {
                    var name = parameters[i]['name'],
                        value = parameters[i]['value'],
                        type = parameters[i]['type'];

                    stream1.write('"'+inst_id+'","'+name+'","'+value+'",'+type+'\n');
                }
                stream1.end();
            });
        });
    });
}
