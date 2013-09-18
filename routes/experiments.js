exports.list = function(req, res) {
    req.db.query("SELECT * FROM experiments e \
                  WHERE has_permission($1, e.id, 'read') \
                  ORDER BY created_at DESC;", [req.user], function(result) {

        req.db.done();
        res.json({experiments: result.rows});
    });
};

exports.create = function(req, res) {
    var name = req.body.name,
        description = req.body.description;

    if (typeof name !== 'string')
        return res.json(400, {error: 'missing_parameters'});

    if (name.length < 5)
        return res.json(400, {error: 'too_short'});

    if (name.length > 40)
        return res.json(400, {error: 'too_long'});

    re = /[^a-zA-Z0-9-_]/;
    if (re.test(name))
        return res.json(400, {error: 'parameter_contains_invalid_characters'});

    req.db.query('INSERT INTO experiments (name, description, owner) VALUES \
                    ($1,$2,$3) RETURNING id;', [name, description, req.user], function(result) {

        req.db.done();
        res.json(200, {id: result.rows[0].id});
    });
};

exports.get = function(req, res) {
    var expName = req.params.expName;

    req.db.query('SELECT * FROM experiments WHERE name = $1;', [expName], function(result) {
        if (result.rows.length < 1) {
            req.db.done();
            return res.json(404, {error: 'not_found'});
        }

        var experiment = result.rows[0];

        req.db.query('SELECT \
              i.id, i.started_at, i.finished_at, i.repository_ref, \
              i.comment, avg(r.progress) AS progress \
          FROM instances i, runs r \
          WHERE r.instance_id = i.id AND i.exp_id = $1 \
          GROUP BY i.id \
          ORDER BY i.started_at DESC;', [experiment.id], function(result) {
            req.db.done();
            experiment.instances = result.rows;
            res.json(experiment);
        });
    });
};