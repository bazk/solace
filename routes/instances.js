exports.create = function(req, res) {
    var expName = req.params.expName,
        numRuns = parseInt(req.body.num_runs),
        parameters = JSON.parse(req.body.parameters),
        code_version = req.body.code_version || null;

    req.db.transaction(function (commit, rollback) {
        req.db.query('INSERT INTO instances (exp_id, code_version) \
                        (SELECT id, $2 FROM experiments WHERE name = $1) \
                        RETURNING id;', [expName, code_version], function(result) {

            var instId = result.rows[0].id;

            var stream1 = req.db.copyFrom('COPY instance_parameter_values \
                                            (instance_id, name, value, type) \
                                            FROM STDIN WITH CSV;', function () {

                var stream2 = req.db.copyFrom("COPY runs (instance_id,id) \
                                                FROM STDIN WITH CSV;", function () {

                    commit(function () {
                        req.db.done();
                        res.json(200, {id: instId});
                    });
                });

                for (var i=1; i<numRuns+1; i++)
                    stream2.write('"'+instId+'",'+i+'\n');
                stream2.end();
            });

            for (var i=0; i<parameters.length; i++) {
                var name = parameters[i]['name'],
                    value = parameters[i]['value'],
                    type = parameters[i]['type'];

                stream1.write('"'+instId+'","'+name+'","'+value+'",'+type+'\n');
            }
            stream1.end();
        });
    });
};

exports.get = function(req, res) {
    var expName = req.params.expName,
        instId = req.params.instId;

    req.db.query('SELECT i.id, i.exp_id, i.started_at, i.finished_at, i.code_version, i.comment \
                    FROM experiments e, instances i \
                    WHERE e.name = $1 AND i.id = $2 AND e.id = i.exp_id;',
                [expName, instId], function(result) {

        if (result.rows.length < 1) {
            req.db.done();
            return res.json(404, {error: 'not_found'});
        }

        var instance = result.rows[0];

        req.db.query('SELECT * FROM runs WHERE instance_id=$1 ORDER BY id DESC;', [instId], function(result) {
            instance.runs = result.rows;

            req.db.query('SELECT name,type,value FROM instance_parameter_values WHERE instance_id=$1 ORDER BY name;', [instId], function(result) {
                req.db.done();
                instance.parameters = result.rows;
                res.json(instance);
            });
        });
    });
};
