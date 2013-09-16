var fs = require('fs');

exports.upload = function(req, res) {
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

            req.db.query("SELECT * FROM get_dir($1, true);", ['/recordings/'+instance_id+'/'+run_id], function (result) {
                if (result.rows.length < 1) {
                    req.db.done();
                    res.send(500, {error: 'db_query_failed'});
                    return;
                }

                var dir = result.rows[0].get_dir;

                fs.readFile(req.files.file.path, 'hex', function (err, data) {
                    data = '\\x' + data;

                    req.db.query('INSERT INTO files (parent_id,name,owner,data) VALUES ($1,nexthash(),$2,$3);',
                            [dir, req.user, data], function(result) {
                        req.db.done();
                        res.send(200);
                    });
                });
            });
        });
    });
}

exports.download = function(req, res) {
    var instance_id = req.params.id,
        run_id      = req.params.runId,
        filename    = req.params.file;

    if ((typeof instance_id !== 'string') || (typeof run_id !== 'string') || (typeof filename !== 'string')) {
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

            req.db.query("SELECT * FROM get_dir($1);", ['/recordings/'+instance_id+'/'+run_id], function (result) {
                if ((result.rows.length < 1) || (result.rows[0].get_dir < 0)) {
                    req.db.done();
                    res.send(500, {error: 'db_query_failed'});
                    return;
                }

                var dir = result.rows[0].get_dir;

                req.db.query('SELECT * FROM files WHERE parent_id=$1 AND name=$2;',
                        [dir, filename], function(result) {
                    if (result.rows.length < 1) {
                        req.db.done();
                        res.send(404, {error: 'not_found'});
                        return;
                    }

                    req.db.done();
                    res.type('bin');
                    res.send(200, new Buffer(result.rows[0].data, 'binary'));
                });
            });
        });
    });
}

exports.findFilesByRunId = function(req, res) {
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

        console.log(result);

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

            req.db.query("SELECT * FROM get_dir($1);", ['/recordings/'+instance_id+'/'+run_id], function (result) {
                if ((result.rows.length < 1) || (result.rows[0].get_dir < 0)) {
                    req.db.done();
                    res.json(200, []);
                    return;
                }

                var dir = result.rows[0].get_dir;

                req.db.query('SELECT id,parent_id,name,created_at,owner FROM files WHERE parent_id=$1;',
                        [dir], function(result) {
                    req.db.done();
                    res.json(200, result.rows);
                });
            });
        });
    });
}