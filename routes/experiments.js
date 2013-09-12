exports.findAll = function(req, res) {
    req.db.query('SELECT id,name,description,created_at \
      FROM experiments ORDER BY created_at DESC;', [], function(result) {
        req.db.done();
        res.send(result.rows);
    });
}

exports.findById = function(req, res) {
    if (typeof req.params.id === 'undefined') {
        res.send(400, {error: 'missing_parameters'});
        return;
    }

    req.db.query('SELECT * FROM experiments WHERE id=$1;', [req.params.id], function(result) {
        if (result.rows.length < 1) {
            req.db.done();
            res.send(500, {error: 'db_query_failed'});
            return;
        }

        var experiment = result.rows[0];

        req.db.query('SELECT \
              i.id, i.started_at, i.finished_at, i.num_runs, \
              i.comment, avg(r.progress) AS progress \
          FROM instances i, runs r \
          WHERE r.instance_id=i.id AND i.exp_id=$1 \
          GROUP BY i.id \
          ORDER BY i.started_at DESC;', [req.params.id], function(result) {
            req.db.done();
            experiment.instances = result.rows;
            res.send(experiment);
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