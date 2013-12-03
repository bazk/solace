exports.list = function(req, res) {
    var expName = req.params.expName;

    req.db.query('SELECT c.id,c.name,c.description,c.created_at \
                    FROM experiments e, charts c \
                    WHERE e.name = $1 AND e.id = c.exp_id;',
                [expName], function(result) {

        var charts = {};
        for (var i=0; i<result.rows.length; i++) {
            var c = result.rows[i];
            charts[c.id] = c;
            charts[c.id].config = [];
            charts[c.id].series = {};
        }

        req.db.query('SELECT cf.chart_id,cf.key,cf.value,cf.type \
                        FROM experiments e, charts c, chart_config cf \
                        WHERE \
                            e.name = $1 AND e.id = c.exp_id AND \
                            cf.chart_id = c.id;',
                    [expName], function(result) {

            for (var i=0; i<result.rows.length; i++) {
                var cf = result.rows[i];

                var value = cf.value;
                if (cf.type === 'integer')
                    value = parseInt(value);
                else if (cf.type === 'real')
                    value = parseFloat(value);
                else if (cf.type === 'boolean')
                    value = /true/i.test(value) || /t/i.test(value);
                else if (cf.type === 'timestamp')
                    value = parseInt(value);

                charts[cf.chart_id].config.push({key: cf.key, value: value});
            }

            req.db.query('SELECT cs.chart_id,cs.name,cs.type,cs.x,cs.y \
                            FROM experiments e, charts c, chart_series cs \
                            WHERE \
                                e.name = $1 AND e.id = c.exp_id AND \
                                cs.chart_id = c.id;',
                        [expName], function(result) {

                for (var i=0; i<result.rows.length; i++) {
                    var cs = result.rows[i];

                    charts[cs.chart_id].series[cs.name] = {
                        name: cs.name,
                        type: cs.type,
                        x: cs.x,
                        y: cs.y
                    };
                }

                req.db.done();

                var reslist = [];
                for (var c in charts)
                    reslist.push(charts[c]);
                res.json(reslist);
            });
        });
    });
};

exports.getData = function(req, res) {
    var expName = req.params.expName,
        instId  = req.params.instId,
        runId   = parseInt(req.params.runId),
        chartId = parseInt(req.params.chartId);

    req.db.query('SELECT cs.name, r1.value AS x, cs.xtype, r2.value AS y, cs.ytype \
                    FROM ( \
                        SELECT r1.name, r1.moment AS x, MAX(r2.moment) AS y \
                            FROM (SELECT cs.name,rv.moment FROM run_result_values rv, chart_series cs  \
                                    WHERE rv.run_id = $1 AND rv.instance_id = $2 AND rv.name = cs.x AND cs.chart_id = $3) AS r1, \
                                (SELECT cs.name,rv.moment FROM run_result_values rv, chart_series cs \
                                    WHERE rv.run_id = $1 AND rv.instance_id = $2 AND rv.name = cs.y AND cs.chart_id = $3) AS r2 \
                            WHERE \
                                r1.name = r2.name AND r1.moment >= r2.moment \
                            GROUP BY r1.name,r1.moment \
                        ) AS m, \
                        run_result_values r1, \
                        run_result_values r2, \
                        chart_series cs \
                    WHERE \
                        cs.chart_id = $3 AND \
                        r1.run_id = $1 AND r1.instance_id = $2 AND r1.name = cs.x AND \
                        r2.run_id = $1 AND r2.instance_id = $2 AND r2.name = cs.y AND \
                        r1.moment = m.x AND r2.moment = m.y \
                    ORDER BY cs.name, r1.moment;',
                [runId, instId, chartId], function (result) {

        req.db.done();

        r = {};
        for (var i=0; i < result.rows.length; i++) {
            if (typeof r[result.rows[i].name] === 'undefined')
                r[result.rows[i].name] = {xtype: result.rows[i].xtype, ytype: result.rows[i].ytype, data: []}

            r[result.rows[i].name].data.push([result.rows[i].x, result.rows[i].y]);
        }

        res.json({series: r});
    });
};
