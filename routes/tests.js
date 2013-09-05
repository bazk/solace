var pg = require('pg');
var config = require('../config.js')

exports.get = function(req, res) {
    if (typeof req.params.id === 'undefined')
        return res.send(404);

    var exp_id = req.params.id;

    pg.connect(config.conString, function(err, client, done) {
        if (err)
            return res.send(500, {error: err});

        var q = 'SELECT * FROM tests WHERE exp_id=$1 ORDER BY id;';
        client.query(q, [exp_id], function(err, result) {
            done();

            if (err)
                return res.send(500, {error: err});

            res.send(result.rows);
        });
    });
}