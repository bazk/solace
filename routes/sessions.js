var pg = require('pg');
var config = require('../config.js')
var crypto = require('crypto');

exports.login = function (req, res) {
    if (typeof req.body === 'undefined')
        return res.send(401, {loggedIn: false, username: "", error: true});

    if ((typeof req.body.username === 'undefined') ||
        (typeof req.body.password === 'undefined'))
        return res.send(401, {loggedIn: false, username: "", error: true});

    var username = req.body.username,
        password = crypto.createHash('md5').update(req.body.password).digest("hex");

    pg.connect(config.conString, function(err, client, done) {
        if (err)
            return res.send(401, {loggedIn: false, username: "", error: true});

        var q = 'SELECT id,username FROM users WHERE username=$1 AND password=$2;';
        client.query(q, [username, password], function(err, result) {
            done();

            if (err)
                return res.send(401, {loggedIn: false, username: "", error: true});

            if (result.rows.length < 1)
                return res.send(401, {loggedIn: false, username: "", error: true});

            req.session.user_id = result.rows[0].id;
            res.send({loggedIn: true, username: result.rows[0].username, error: false});
        });
    });
}

exports.get = function (req, res) {
    if (!req.session.user_id)
        return res.send(401, {loggedIn: false, username: "", error: true});

    pg.connect(config.conString, function(err, client, done) {
        if (err)
            return res.send(401, {loggedIn: false, username: "", error: true});

        var q = 'SELECT username FROM users WHERE id=$1;';
        client.query(q, [req.session.user_id], function(err, result) {
            done();

            if (err)
                return res.send(401, {loggedIn: false, username: "", error: true});

            if (result.rows.length < 1)
                return res.send(401, {loggedIn: false, username: "", error: true});

            res.send({loggedIn: true, username: result.rows[0].username, error: false});
        });
    });
}

exports.logout = function (req, res) {
    if (!req.session.user_id)
        return res.send(401, {loggedIn: false, username: "", error: true});

    delete req.session.user_id;
    res.send({loggedIn: false, username: "", error: false});
}

exports.auth = function (req, res, next) {
    if (!req.session.user_id)
        res.send(401, {loggedIn: false, username: "", error: true});
    else
        next();
}