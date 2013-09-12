exports.findById = function(req, res) {
    if (typeof req.params.id === 'undefined')
        return res.send(400, {error: 'missing_parameters'});

    var run_id = parseInt(req.params.id);

    req.db.query('SELECT * FROM runs WHERE id=$1;', [run_id], function(result) {
        if (result.rows.length < 1) {
            req.db.done();
            return res.send(404, {error: 'not_found'});
        }

        var run = result.rows[0];

        req.db.query('SELECT name,type FROM results WHERE run_id=$1 GROUP BY name,type;', [run_id], function(result) {
            req.db.done();
            run.resultVariables = result.rows;
            res.send(run);
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


    req.db.query('SELECT inserted_at,value FROM results WHERE run_id=$1 AND name=$2 \
      ORDER BY inserted_at;', [run_id,var_name], function(result) {
        req.db.done();

        var results = [];
        for (var i=0; i<result.rows.length; i++) {
            results.push([result.rows[i].inserted_at, result.rows[i].value]);
        }

        res.send(200, {data: results});
    });
};

exports.update = function(req, res) {
    if (typeof req.params.id === 'undefined')
        return res.send(400, {error: 'missing_parameters'});

    var run_id = parseInt(req.params.id),
        progress = parseFloat(req.body.progress),
        results = JSON.parse(req.body.results);

    req.db.transaction(function (commit, rollback) {
        req.db.query('UPDATE runs SET progress=$2 WHERE id=$1;', [run_id, progress], function(result) {
            var stream = req.db.copyFrom("COPY results (run_id, name, value, type) FROM STDIN WITH CSV;", function () {
                commit(function () {
                    req.db.done();
                    res.send(200);
                });
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

    req.db.transaction(function (commit, rollback) {
        req.db.query('UPDATE runs SET progress=1.0, finished_at=now() WHERE id=$1;', [run_id], function(result) {
            var stream = req.db.copyFrom("COPY results (run_id, name, value, type) FROM STDIN WITH CSV;", function () {
                commit(function () {
                    req.db.done();
                    res.send(200);
                });
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
    res.send(200);
}