var fs = require('fs');

exports.list = function(req, res) {
    var expName = req.params.expName;

    req.db.query('SELECT f.id, f.exp_id, f.name, f.type, f.size, f.created_at \
                    FROM experiments e, experiment_files f \
                    WHERE e.name = $1 AND f.exp_id = e.id;',
                [expName], function(result) {

        req.db.done();
        res.json(result.rows);
    });
};

exports.get = function(req, res) {
    var expName = req.params.expName,
        fileId = req.params.fileId;

    req.db.query('SELECT f.id, f.exp_id, f.name, f.type, f.size, f.created_at, f.data \
                    FROM experiments e, experiment_files f \
                    WHERE e.name = $1 AND f.id = $2 AND f.exp_id = e.id;',
                [expName, fileId], function(result) {

        if (result.rows.length < 1) {
            req.db.done();
            return res.json(404, {error: 'not_found'});
        }

        var file = result.rows[0];

        res.setHeader('Content-disposition', 'attachment; filename=' + file.name);
        res.setHeader('Content-type', file.type);
        res.send(200, new Buffer(file.data, 'binary'));
    });
};

// exports.findFilesByRunId = function(req, res) {
//     var instance_id = req.params.id,
//         run_id      = req.params.runId;

//     if ((typeof instance_id !== 'string') || (typeof run_id !== 'string')) {
//         res.send(400, {error: 'missing_parameters'});
//         return;
//     }

//     run_id = parseInt(req.params.runId);

//     req.db.query('SELECT r.id,i.exp_id \
//                     FROM runs r, instances i \
//                     WHERE r.instance_id = $1 AND r.num = $2 AND r.instance_id = i.id;',
//             [instance_id,run_id], function(result) {

//         console.log(result);

//         if (result.rows.length < 1) {
//             req.db.done();
//             return res.send(404, {error: 'not_found'});
//         }

//         var run = result.rows[0];

//         req.db.query("SELECT has_permission($1, $2, 'write');", [req.user,run.exp_id], function (result) {
//             if ((result.rows.length < 1) || (!result.rows[0].has_permission)) {
//                 req.db.done();
//                 res.send(403, {error: 'forbidden'});
//                 return;
//             }

//             req.db.query("SELECT * FROM get_dir($1);", ['/recordings/'+instance_id+'/'+run_id], function (result) {
//                 if ((result.rows.length < 1) || (result.rows[0].get_dir < 0)) {
//                     req.db.done();
//                     res.json(200, []);
//                     return;
//                 }

//                 var dir = result.rows[0].get_dir;

//                 req.db.query('SELECT id,parent_id,name,created_at,owner FROM files WHERE parent_id=$1;',
//                         [dir], function(result) {
//                     req.db.done();
//                     res.json(200, result.rows);
//                 });
//             });
//         });
//     });
// };