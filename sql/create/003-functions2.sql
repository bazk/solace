SET client_encoding = 'UTF8';
SET client_min_messages = warning;

CREATE OR REPLACE FUNCTION has_permission(_user_id integer,
                                          _exp_name text,
                                          _type text default 'read') RETURNS boolean AS
$$
    SELECT has_permission($1, (SELECT id FROM experiments WHERE name = $2), $3);
$$
LANGUAGE SQL;



CREATE OR REPLACE FUNCTION get_chart_data(_instance_id char(40),
                                          _run_id integer,
                                          _chart_id integer)
RETURNS TABLE(name text, x text, xtype variable_type, y text, ytype variable_type) AS $$
DECLARE
    series RECORD;
BEGIN
    CREATE TEMP TABLE data_result (name text, x text, xtype variable_type, y text, ytype variable_type) ON COMMIT DROP;

    FOR series IN SELECT * FROM chart_series WHERE chart_id = _chart_id LOOP
        IF series.y IS NOT NULL THEN
            INSERT INTO data_result SELECT series.name, r1.value AS x, series.xtype, r2.value AS y, series.ytype
                FROM (
                    SELECT r1.moment AS x, MAX(r2.moment) AS y
                        FROM (SELECT rv.moment FROM run_result_values rv
                                WHERE rv.run_id = _run_id AND rv.instance_id = _instance_id AND rv.name = series.x) AS r1,
                            (SELECT rv.moment FROM run_result_values rv
                                WHERE rv.run_id = _run_id AND rv.instance_id = _instance_id AND rv.name = series.y) AS r2
                        WHERE
                            r1.moment >= r2.moment
                        GROUP BY r1.moment
                    ) AS m,
                    run_result_values r1,
                    run_result_values r2
                WHERE
                    r1.run_id = _run_id AND r1.instance_id = _instance_id AND r1.name = series.x AND
                    r2.run_id = _run_id AND r2.instance_id = _instance_id AND r2.name = series.y AND
                    r1.moment = m.x AND r2.moment = m.y
                ORDER BY r1.moment;
        ELSE
            INSERT INTO data_result SELECT series.name, r1.value AS x, series.xtype, null AS y, null as ytype
                FROM
                    run_result_values r1
                WHERE
                    r1.run_id = _run_id AND r1.instance_id = _instance_id AND r1.name = series.x
                ORDER BY r1.moment;
        END IF;
    END LOOP;

    RETURN QUERY SELECT * FROM data_result;
END;
$$ LANGUAGE 'plpgsql';