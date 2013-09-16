exports.findAll = function(req, res) {
    req.db.query("SELECT * FROM experiments e \
                  WHERE has_permission($1, e.id, 'read') \
                  ORDER BY created_at DESC;", [req.user], function(result) {

        req.db.done();
        res.send(result.rows);
    });
}

exports.findByName = function(req, res) {
    var exp_name = req.params.name;

    if (typeof exp_name !== 'string') {
        res.send(400, {error: 'missing_parameters'});
        return;
    }

    req.db.query('SELECT * FROM experiments WHERE name=$1;', [exp_name], function(result) {
        if (result.rows.length < 1) {
            req.db.done();
            res.send(404, {error: 'not_found'});
            return;
        }

        var experiment = result.rows[0];

        req.db.query("SELECT has_permission($1, $2, 'read');", [req.user,experiment.id], function (result) {
            if ((result.rows.length < 1) || (!result.rows[0].has_permission)) {
                req.db.done();
                res.send(403, {error: 'forbidden'});
                return;
            }

            req.db.query('SELECT \
                  i.id, i.started_at, i.finished_at, i.repository_ref, \
                  i.comment, avg(r.progress) AS progress \
              FROM instances i, runs r \
              WHERE r.instance_id=i.id AND i.exp_id=$1 \
              GROUP BY i.id \
              ORDER BY i.started_at DESC;', [experiment.id], function(result) {
                req.db.done();
                experiment.instances = result.rows;
                res.send(experiment);
            });
        });
    });
}

exports.insert = function(req, res) {
    var name = req.body.name,
        description = req.body.description;

    if (typeof name !== 'string') {
        res.send(400, {error: 'missing_parameters'});
        return;
    }

    if (name.length < 5) {
        res.send(400, {error: 'parameter_length_is_too_short'});
        return;
    }

    re = /[^a-zA-Z0-9-_]/;
    if (re.test(name)) {
        res.send(400, {error: 'parameter_contains_invalid_characters'});
        return;
    }

    req.db.query('INSERT INTO experiments (name, description, owner) VALUES ($1,$2,$3) RETURNING id;',
                [name, description, req.user], function(result) {
        req.db.done();
        res.send(200, {id: result.rows[0].id});
    });
}