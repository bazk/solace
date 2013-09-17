exports.read = function (req, res, next) {
    var expName = req.params.expName;

    if (typeof expName !== 'string')
        return res.json(400, {error: 'missing_parameters'});

    req.db.query("SELECT has_permission($1, $2, 'read');", [req.user, expName], function (result) {
        if ((result.rows.length < 1) || (!result.rows[0].has_permission)) {
            req.db.done();
            return res.json(403, {error: 'forbidden'});
        }

        next();
    });
};

exports.write = function (req, res, next) {
    var expName = req.params.expName;

    if (typeof expName !== 'string')
        return res.json(400, {error: 'missing_parameters'});

    req.db.query("SELECT has_permission($1, $2, 'write');", [req.user, expName], function (result) {
        if ((result.rows.length < 1) || (!result.rows[0].has_permission)) {
            req.db.done();
            return res.json(403, {error: 'forbidden'});
        }

        next();
    });
};