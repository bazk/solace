var pg = require('pg');
var Store = require('connect').session.Store;

var cfg = null;

exports.config = function (c) {
    cfg = c;
};

var getClient = exports.getClient = function (callback) {
    if (cfg == null)
        throw new Error("Database not configured!");

    pg.connect(cfg, function(err, client, done) {
        if (err) {
            console.log(err);
            done();
            return;
        }

        if (client)
            callback(client, done);
    });
};

var sessionStore = exports.sessionStore = function () {};
sessionStore.prototype = new Store();

sessionStore.prototype.set = function (sid, sessData, callback) {
    getClient(function (client, done) {
        var expiration = null;

        if (sessData.cookie) {
            if (sessData.cookie.expires) {
                expiration = sessData.cookie.expires;
            }
        }

        client.query('SELECT session_set($1, $2, $3)',
            [sid, JSON.stringify(sessData), expiration],
            function (err, result) {
                done();

                if (err)
                    console.log(err.message);

                if (result)
                    callback && callback();
            }
        );
    });
};

sessionStore.prototype.get = function (sid, callback) {
    getClient(function (client, done) {
        client.query('SELECT session_get($1)',
            [sid],
            function (err, result) {
                done();

                if (err) {
                    console.log(err);
                    return callback(err, {});
                }

                if (result) {
                    if (result.rows.length)
                        callback(null, JSON.parse(result.rows[0].session_get));
                    else
                        callback(null, null);
                }
            }
        );
    });
};

sessionStore.prototype.destroy = function (sid, callback) {
    getClient(function (client, done) {
        client.query('SELECT session_destroy($1)',
            [sid],
            function (err, result) {
                done();

                if (err)
                    console.log(err.message);

                if (result)
                    callback && callback();
            }
        );
    });
};

sessionStore.prototype.length = function (callback) {
    getClient(function (client, done) {
        client.query('SELECT session_count()',
            function (err, result) {
                done();

                if (err)
                    console.log(err.message);

                if (result)
                    callback(null, result.rows[0].session_count);
            }
        );
    });
};

sessionStore.prototype.clear = function (callback) {
    getClient(function (client, done) {
        client.query('SELECT session_clear()',
            function (err, result) {
                done();

                if (err)
                    console.log(err.message);

                if (result)
                    callback && callback();
            }
        );
    });
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

                    cb(function (commit_cb) {
                        client.query('COMMIT;', function (err, result) {
                            if (err) {
                                console.log(err);
                                done();
                                res.send(500, {error: 'db_query_failed'});
                                return;
                            }
                            commit_cb();
                        });
                    }, function (rollback_cb) {
                        client.query('ROLLBACK;', function (err, result) {
                            if (err) {
                                console.log(err);
                                done();
                                res.send(500, {error: 'db_query_failed'});
                                return;
                            }
                            rollback_cb();
                        });
                    });
                });
            }
        }

        next();
    });
};
