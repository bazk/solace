var pg = require('pg');

var cfg = null;

exports.config = function (c) {
    cfg = c;
};

exports.connect = function (req, res, next) {
    if (cfg == null)
        throw new Error("Database not configured!");

    pg.connect(cfg, function(err, client, done) {
        if (err) {
            console.log(err);
            done();
            res.send(500, {error: 'db_connection_failed'});
            return;
        }

        req.db = {
            client: client,
            done: done,

            query: function (q, params, cb) {
                client.query(q, params, function (err, result) {
                    if (err) {
                        console.log(err);
                        done();
                        res.send(500, {error: 'db_query_failed'});
                        return;
                    }

                    cb(result);
                });
            },

            copyFrom: function (q, cb) {
                var stream = client.copyFrom(q);

                stream.on('close', function () {
                    cb();
                });

                stream.on('error', function (err) {
                    req.db.done();
                    console.log(err);
                    res.send(500, {error: 'db_query_failed'});
                });

                return stream;
            },

            transaction: function (cb) {
                client.query('BEGIN;', function (err, result) {
                    if (err) {
                        console.log(err);
                        done();
                        res.send(500, {error: 'db_query_failed'});
                        return;
                    }

                    cb(function commit(cb) {
                        client.query('COMMIT;', function (err, result) {
                            if (err) {
                                console.log(err);
                                done();
                                res.send(500, {error: 'db_query_failed'});
                                return;
                            }
                            cb();
                        });
                    }, function rollback(cb) {
                        client.query('ROLLBACK;', function (err, result) {
                            if (err) {
                                console.log(err);
                                done();
                                res.send(500, {error: 'db_query_failed'});
                                return;
                            }
                            cb();
                        });
                    });
                });
            }
        }

        next();
    });
};