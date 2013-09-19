exports.list = function(req, res) {
    var expName = req.params.expName;

    req.db.query('SELECT c.id,c.description,c.created_at \
                    FROM experiments e, charts c \
                    WHERE e.name = $1 AND e.id = c.exp_id;',
                [expName], function(result) {

        var charts = {};
        for (var i=0; i<result.rows.length; i++) {
            var c = result.rows[i];
            charts[c.id] = c;
            charts[c.id].config = [];
            charts[c.id].series = [];
        }

        req.db.query('SELECT cf.chart_id,cf.key,cf.value \
                        FROM experiments e, charts c, chart_config cf \
                        WHERE \
                            e.name = $1 AND e.id = c.exp_id AND \
                            cf.chart_id = c.id;',
                    [expName], function(result) {

            for (var i=0; i<result.rows.length; i++) {
                var cf = result.rows[i];
                charts[cf.chart_id].config.push({key: cf.key, value: cf.value});
            }

            req.db.query('SELECT cs.chart_id,cs.name,cs.type,cs.x,cs.y \
                            FROM experiments e, charts c, chart_series cs \
                            WHERE \
                                e.name = $1 AND e.id = c.exp_id AND \
                                cs.chart_id = c.id;',
                        [expName], function(result) {

                for (var i=0; i<result.rows.length; i++) {
                    var cs = result.rows[i];
                    charts[cs.chart_id].series.push({
                        name: cs.name,
                        type: cs.type,
                        x: cs.x,
                        y: cs.y
                    });
                }

                req.db.done();
                res.json(charts);
            });
        });
    });
};