exports.get = function(req, res) {
    var userId = req.params.userId;

    req.db.query("SELECT username FROM users WHERE id = $1;", [userId], function(result) {
        req.db.done();

        if (result.rows.length < 1)
            return res.json(404, {error: 'not_found'});

        res.json(result.rows[0]);
    });
};