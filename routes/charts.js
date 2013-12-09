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

    req.db.query('SELECT * FROM get_chart_data($1, $2, $3);',
                [instId, runId, chartId], function (result) {

        req.db.done();

        r = {};
        for (var i=0; i < result.rows.length; i++) {
            var row = result.rows[i];

            if (row.xtype === 'integer')
                row.x = parseInt(row.x);
            else if (row.xtype === 'real')
                row.x = parseFloat(row.x);
            else if (row.xtype === 'boolean')
                row.x = /true/i.test(row.x) || /t/i.test(row.x);
            else if (row.xtype === 'timestamp')
                row.x = parseInt(row.x);

            if (row.ytype === 'integer')
                row.y = parseInt(row.y);
            else if (row.ytype === 'real')
                row.y = parseFloat(row.y);
            else if (row.ytype === 'boolean')
                row.y = /true/i.test(row.y) || /t/i.test(row.y);
            else if (row.ytype === 'timestamp')
                row.y = parseInt(row.y);

            if (typeof r[row.name] === 'undefined')
                r[row.name] = [];

            if (row.y)
                r[row.name].push([row.x, row.y]);
            else
                r[row.name].push(row.x);
        }

        res.json({series: r});
    });
};
