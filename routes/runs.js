var fs = require('fs');

exports.get = function(req, res) {
    var expName = req.params.expName,
        instId  = req.params.instId,
        runId   = parseInt(req.params.runId);

    req.db.query('SELECT r.id, r.instance_id, r.started_at, r.finished_at, r.progress, r.canceled \
                    FROM experiments e, instances i, runs r \
                    WHERE e.name = $1 AND e.id = i.exp_id AND i.id = $2 AND r.id = $3;',
                [expName, instId, runId], function(result) {

        if (result.rows.length < 1) {
            req.db.done();
            return res.json(404, {error: 'not_found'});
        }

        var run = result.rows[0];

        req.db.query('SELECT f.id, f.exp_id, f.name, f.type, f.size, f.created_at \
                        FROM experiment_files f, run_files rf \
                        WHERE rf.instance_id = $1 \
                          AND rf.run_id = $2 \
                          AND rf.file_id = f.id \
                        ORDER BY f.name ASC;',
                    [instId,runId], function(result) {

            run.files = result.rows;

            req.db.query('SELECT r.name, r.type \
                            FROM experiments e, experiment_result_variables r \
                            WHERE e.name = $1 AND r.exp_id = e.id;',
                        [expName], function(result) {

                req.db.done();
                run.results = result.rows;
                res.json(run);
            });
        });
    });
};

exports.update = function(req, res) {
    var expName = req.params.expName,
        instId  = req.params.instId,
        runId   = parseInt(req.params.runId);

    var progress = parseFloat(req.body.progress),
        results = JSON.parse(req.body.results);

    req.db.query('SELECT r.id, r.instance_id, r.started_at, r.finished_at, r.progress, r.canceled \
                    FROM experiments e, instances i, runs r \
                    WHERE e.name = $1 AND e.id = i.exp_id AND i.id = $2 AND r.id = $3;',
                [expName, instId, runId], function(result) {

        if (result.rows.length < 1) {
            req.db.done();
            return res.json(404, {error: 'not_found'});
        }

        var run = result.rows[0];

        req.db.transaction(function (commit, rollback) {
            req.db.query('UPDATE runs SET progress = $3 WHERE id = $1 AND instance_id = $2;',
                        [runId, instId, progress], function(result) {

                var stream = req.db.copyFrom("COPY run_result_values \
                                                (run_id, instance_id, name, value, type) \
                                                FROM STDIN WITH CSV;", function () {

                    commit(function () {
                        req.db.done();
                        res.json(200);
                    });
                });

                for (var i=0; i<results.length; i++) {
                    var name = results[i]['name'],
                        value = results[i]['value'],
                        type = results[i]['type'];

                    stream.write(runId+',"'+instId+'","'+name+'","'+value+'",'+type+'\n');
                }
                stream.end();
            });
        });
    });
};

exports.begin = function(req, res) {
    var expName = req.params.expName,
        instId  = req.params.instId,
        runId   = parseInt(req.params.runId);

    req.db.query('SELECT r.id, r.instance_id, r.started_at, r.finished_at, r.progress, r.canceled \
                    FROM experiments e, instances i, runs r \
                    WHERE e.name = $1 AND e.id = i.exp_id AND i.id = $2 AND r.id = $3;',
                [expName, instId, runId], function(result) {

        if (result.rows.length < 1) {
            req.db.done();
            return res.json(404, {error: 'not_found'});
        }

        req.db.query('UPDATE runs SET progress = 0, canceled = false, started_at = now() \
                        WHERE id = $1 AND instance_id = $2;',
                    [runId, instId], function(result) {

            req.db.done();
            res.json(200);
        });
    });
};

exports.done = function(req, res) {
    var expName = req.params.expName,
        instId  = req.params.instId,
        runId   = parseInt(req.params.runId);

    var results = JSON.parse(req.body.results);

    req.db.query('SELECT r.id, r.instance_id, r.started_at, r.finished_at, r.progress, r.canceled \
                    FROM experiments e, instances i, runs r \
                    WHERE e.name = $1 AND e.id = i.exp_id AND i.id = $2 AND r.id = $3;',
                [expName, instId, runId], function(result) {

        if (result.rows.length < 1) {
            req.db.done();
            return res.json(404, {error: 'not_found'});
        }

        var run = result.rows[0];

        req.db.transaction(function (commit, rollback) {
            req.db.query('UPDATE runs SET progress = 1, finished_at = now() \
                            WHERE id = $1 AND instance_id = $2;',
                        [runId, instId], function(result) {

                var stream = req.db.copyFrom("COPY run_result_values \
                                                (run_id, instance_id, name, value, type) \
                                                FROM STDIN WITH CSV;", function () {

                    commit(function () {
                        req.db.done();
                        res.json(200);
                    });
                });

                for (var i=0; i<results.length; i++) {
                    var name = results[i]['name'],
                        value = results[i]['value'],
                        type = results[i]['type'];

                    stream.write(runId+',"'+instId+'","'+name+'","'+value+'",'+type+'\n');
                }
                stream.end();
            });
        });
    });
};

exports.cancel = function(req, res) {
    var expName = req.params.expName,
        instId  = req.params.instId,
        runId   = parseInt(req.params.runId);

    req.db.query('SELECT r.id, r.instance_id, r.started_at, r.finished_at, r.progress, r.canceled \
                    FROM experiments e, instances i, runs r \
                    WHERE e.name = $1 AND e.id = i.exp_id AND i.id = $2 AND r.id = $3;',
                [expName, instId, runId], function(result) {

        if (result.rows.length < 1) {
            req.db.done();
            return res.json(404, {error: 'not_found'});
        }

        req.db.query('UPDATE runs SET canceled = true, finished_at = now() \
                        WHERE id = $1 AND instance_id = $2;',
                    [runId, instId], function(result) {

            req.db.done();
            res.json(200);
        });
    });
};

exports.upload = function(req, res) {
    var expName = req.params.expName,
        instId  = req.params.instId,
        runId   = parseInt(req.params.runId);

    var file = req.files.file;

    req.db.query('SELECT r.id, r.instance_id, r.started_at, r.finished_at, r.progress, r.canceled \
                    FROM experiments e, instances i, runs r \
                    WHERE e.name = $1 AND e.id = i.exp_id AND i.id = $2 AND r.id = $3;',
                [expName, instId, runId], function(result) {

        if (result.rows.length < 1) {
            req.db.done();
            return res.json(404, {error: 'not_found'});
        }

        var run = result.rows[0];

        fs.readFile(file.path, 'hex', function (err, data) {
            data = '\\x' + data;

            req.db.transaction(function (commit, rollback) {
                req.db.query('INSERT INTO experiment_files (exp_id, name, type, size, data) \
                                (SELECT id,$2,$3,$4,$5 FROM experiments WHERE name = $1) \
                                RETURNING id;',
                            [expName,
                             file.name || 'unnamed',
                             file.type || 'application/octet-stream',
                             file.size,
                             data], function(result) {

                    req.db.query('INSERT INTO run_files (run_id, instance_id, file_id) \
                                    VALUES ($1, $2, $3);',
                                [runId, instId, result.rows[0].id], function(result) {

                        commit(function () {
                            req.db.done();
                            res.json(200);
                        });
                    });
                });
            });
        });
    });
};

exports.listFiles = function(req, res) {
    var expName = req.params.expName,
        instId  = req.params.instId,
        runId   = parseInt(req.params.runId);

    req.db.query('SELECT f.id, f.exp_id, f.name, f.type, f.size, f.created_at \
                    FROM experiments e, instances i, runs r, experiment_files f, run_files rf \
                    WHERE e.name = $1 AND i.exp_id = e.id AND i.id = $2 \
                        AND rf.instance_id = i.id \
                        AND rf.run_id = $3 \
                        AND rf.file_id = f.id \
                    ORDER BY f.name ASC;',
                [expName,instId,runId], function(result) {

        req.db.done();
        res.json(result.rows);
    });
};

exports.getResult = function(req, res) {
    var expName = req.params.expName,
        instId  = req.params.instId,
        runId   = parseInt(req.params.runId),
        name     = req.params.name;

    req.db.query('SELECT v.inserted_at, v.value \
                    FROM experiments e, instances i, run_result_values v \
                    WHERE e.name = $1 AND i.exp_id = e.id AND i.id = $2 \
                        AND v.instance_id = i.id \
                        AND v.run_id = $3 \
                        AND v.name = $4 \
                    ORDER BY v.inserted_at;',
                [expName, instId, runId, name], function(result) {

        req.db.done();

        var results = [];
        for (var i=0; i<result.rows.length; i++) {
            results.push([result.rows[i].inserted_at, result.rows[i].value]);
        }

        res.json(200, {data: results});
    });
};