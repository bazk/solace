exports.findById = function(req, res) {
    var instance_id = req.params.id,
        run_id      = req.params.runId;

    if ((typeof instance_id !== 'string') || (typeof run_id !== 'string')) {
        res.send(400, {error: 'missing_parameters'});
        return;
    }

    run_id = parseInt(req.params.runId);

    req.db.query('SELECT r.num AS id,i.exp_id,r.instance_id,r.started_at,r.finished_at,r.progress \
                    FROM runs r, instances i \
                    WHERE r.instance_id=$1 AND r.num=$2 AND r.instance_id = i.id;',
            [instance_id,run_id], function(result) {

        if (result.rows.length < 1) {
            req.db.done();
            return res.send(404, {error: 'not_found'});
        }

        var run = result.rows[0];

        req.db.query("SELECT has_permission($1, $2, 'read');", [req.user,run.exp_id], function (result) {
            if ((result.rows.length < 1) || (!result.rows[0].has_permission)) {
                req.db.done();
                res.send(403, {error: 'forbidden'});
                return;
            }

            req.db.query('SELECT name,type FROM experiment_result_variables WHERE exp_id=$1;', [run.exp_id], function(result) {
                req.db.done();
                run.resultVariables = result.rows;
                res.send(run);
            });
        });
    });
};

exports.findResultByName = function(req, res) {
    var instance_id = req.params.id,
        run_id      = req.params.runId,
        var_name    = req.params.name;

    if ((typeof instance_id !== 'string') || (typeof run_id !== 'string') || (typeof var_name !== 'string')) {
        res.send(400, {error: 'missing_parameters'});
        return;
    }

    run_id = parseInt(req.params.runId);

    req.db.query('SELECT r.id,i.exp_id \
                    FROM runs r, instances i \
                    WHERE r.instance_id = $1 AND r.num = $2 AND r.instance_id = i.id;',
            [instance_id,run_id], function(result) {

        if (result.rows.length < 1) {
            req.db.done();
            return res.send(404, {error: 'not_found'});
        }

        var run = result.rows[0];

        req.db.query("SELECT has_permission($1, $2, 'read');", [req.user,run.exp_id], function (result) {
            if ((result.rows.length < 1) || (!result.rows[0].has_permission)) {
                req.db.done();
                res.send(403, {error: 'forbidden'});
                return;
            }

            req.db.query('SELECT inserted_at,value FROM run_result_values WHERE run_id=$1 AND name=$2 \
              ORDER BY inserted_at;', [run.id,var_name], function(result) {
                req.db.done();

                var results = [];
                for (var i=0; i<result.rows.length; i++) {
                    results.push([result.rows[i].inserted_at, result.rows[i].value]);
                }

                res.send(200, {data: results});
            });
        });
    });
};

exports.begin = function(req, res) {
    var instance_id = req.params.id,
        run_id      = req.params.runId;

    if ((typeof instance_id !== 'string') || (typeof run_id !== 'string')) {
        res.send(400, {error: 'missing_parameters'});
        return;
    }

    run_id = parseInt(req.params.runId);

    req.db.query('SELECT r.id,i.exp_id \
                    FROM runs r, instances i \
                    WHERE r.instance_id = $1 AND r.num = $2 AND r.instance_id = i.id;',
            [instance_id,run_id], function(result) {

        if (result.rows.length < 1) {
            req.db.done();
            return res.send(404, {error: 'not_found'});
        }

        var run = result.rows[0];

        req.db.query("SELECT has_permission($1, $2, 'write');", [req.user,run.exp_id], function (result) {
            if ((result.rows.length < 1) || (!result.rows[0].has_permission)) {
                req.db.done();
                res.send(403, {error: 'forbidden'});
                return;
            }

            req.db.query('UPDATE runs SET progress=0, canceled=false, started_at=now() WHERE id=$1;',
                    [run.id], function(result) {
                req.db.done();
                res.send(200);
            });
        });
    });
}

exports.update = function(req, res) {
    var instance_id = req.params.id,
        run_id      = req.params.runId;

    if ((typeof instance_id !== 'string') || (typeof run_id !== 'string')) {
        res.send(400, {error: 'missing_parameters'});
        return;
    }

    run_id = parseInt(req.params.runId);

    var progress = parseFloat(req.body.progress),
        results = JSON.parse(req.body.results);

    req.db.query('SELECT r.id,i.exp_id \
                    FROM runs r, instances i \
                    WHERE r.instance_id = $1 AND r.num = $2 AND r.instance_id = i.id;',
            [instance_id,run_id], function(result) {

        if (result.rows.length < 1) {
            req.db.done();
            return res.send(404, {error: 'not_found'});
        }

        var run = result.rows[0];

        req.db.query("SELECT has_permission($1, $2, 'write');", [req.user,run.exp_id], function (result) {
            if ((result.rows.length < 1) || (!result.rows[0].has_permission)) {
                req.db.done();
                res.send(403, {error: 'forbidden'});
                return;
            }

            req.db.transaction(function (commit, rollback) {
                req.db.query('UPDATE runs SET progress=$2 WHERE id=$1;', [run.id, progress], function(result) {
                    var stream = req.db.copyFrom("COPY run_result_values (run_id, name, value, type) \
                                                  FROM STDIN WITH CSV;", function () {
                        commit(function () {
                            req.db.done();
                            res.send(200);
                        });
                    });

                    for (var i=0; i<results.length; i++) {
                        var name = results[i]['name'],
                            value = results[i]['value'],
                            type = results[i]['type'];

                        stream.write(run.id+',"'+name+'","'+value+'",'+type+'\n');
                    }
                    stream.end();
                });
            });
        });
    });
}

exports.done = function(req, res) {
    var instance_id = req.params.id,
        run_id      = req.params.runId;

    if ((typeof instance_id !== 'string') || (typeof run_id !== 'string')) {
        res.send(400, {error: 'missing_parameters'});
        return;
    }

    run_id = parseInt(req.params.runId);

    var results = JSON.parse(req.body.results);

    req.db.query('SELECT r.id,i.exp_id \
                    FROM runs r, instances i \
                    WHERE r.instance_id = $1 AND r.num = $2 AND r.instance_id = i.id;',
            [instance_id,run_id], function(result) {

        if (result.rows.length < 1) {
            req.db.done();
            return res.send(404, {error: 'not_found'});
        }

        var run = result.rows[0];

        req.db.query("SELECT has_permission($1, $2, 'write');", [req.user,run.exp_id], function (result) {
            if ((result.rows.length < 1) || (!result.rows[0].has_permission)) {
                req.db.done();
                res.send(403, {error: 'forbidden'});
                return;
            }

            req.db.transaction(function (commit, rollback) {
                req.db.query('UPDATE runs SET progress=1.0, finished_at=now() WHERE id=$1;',
                            [run.id], function(result) {
                    var stream = req.db.copyFrom("COPY run_result_values (run_id, name, value, type) \
                                                  FROM STDIN WITH CSV;", function () {
                        commit(function () {
                            req.db.done();
                            res.send(200);
                        });
                    });

                    for (var i=0; i<results.length; i++) {
                        var name = results[i]['name'],
                            value = results[i]['value'],
                            type = results[i]['type'];

                        stream.write(run.id+',"'+name+'","'+value+'",'+type+'\n');
                    }
                    stream.end();
                });
            });
        });
    });
}

exports.cancel = function(req, res) {
    var instance_id = req.params.id,
        run_id      = req.params.runId;

    if ((typeof instance_id !== 'string') || (typeof run_id !== 'string')) {
        res.send(400, {error: 'missing_parameters'});
        return;
    }

    run_id = parseInt(req.params.runId);

    req.db.query('SELECT r.id,i.exp_id \
                    FROM runs r, instances i \
                    WHERE r.instance_id = $1 AND r.num = $2 AND r.instance_id = i.id;',
            [instance_id,run_id], function(result) {

        if (result.rows.length < 1) {
            req.db.done();
            return res.send(404, {error: 'not_found'});
        }

        var run = result.rows[0];

        req.db.query("SELECT has_permission($1, $2, 'write');", [req.user,run.exp_id], function (result) {
            if ((result.rows.length < 1) || (!result.rows[0].has_permission)) {
                req.db.done();
                res.send(403, {error: 'forbidden'});
                return;
            }

            req.db.query('UPDATE runs SET canceled=true, finished_at=now() WHERE id=$1;',
                        [run.id], function(result) {
                req.db.done();
                res.send(200);
            });
        });
    });
}