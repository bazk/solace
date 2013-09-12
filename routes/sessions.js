var pg = require('pg');
var config = require('../config.js')

exports.login = function (req, res) {
    if (req.session.user_id)
        delete req.session.user_id;

    if (typeof req.body === 'undefined')
        return res.send(400, {loggedIn: false, error: 'invalid_username_password'});

    if ((typeof req.body.username === 'undefined') ||
        (typeof req.body.password === 'undefined'))
        return res.send(400, {loggedIn: false, error: 'invalid_username_password'});

    var username = req.body.username,
        password = req.body.password;

    pg.connect(config.conString, function(err, client, done) {
        if (err)
            return res.send(500, {loggedIn: false, error: 'db_connection_failed'});

        var q = 'SELECT id,username FROM users WHERE lower(username)=lower($1) AND password=crypt($2, password);';
        client.query(q, [username, password], function(err, result) {
            done();

            if (err)
                return res.send(500, {loggedIn: false, error: 'db_query_failed'});

            if (result.rows.length < 1)
                return res.send(400, {loggedIn: false, error: 'invalid_username_password'});

            req.session.user_id = result.rows[0].id;
            res.send(200, {loggedIn: true, userid: result.rows[0].id});
        });
    });
}

exports.get = function (req, res) {
    if (!req.session.user_id)
        return res.send(200, {loggedIn: false});

    res.send(200, {loggedIn: true, userid: req.session.user_id});
}

exports.logout = function (req, res) {
    if (req.session.user_id)
        delete req.session.user_id;

    res.send({loggedIn: false});
}

exports.auth = function (req, res, next) {
    if (!req.session.user_id)
        return res.send(401, "");

    req.user = req.session.user_id;
    next();
}