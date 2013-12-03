'use strict';

angular.module('solace.controllers', []).
    controller('MainCtrl', function ($scope, $rootScope, $location, SessionFactory) {
        SessionFactory.get(function (session) {
            $rootScope.$broadcast('$sessionUpdate', session);
        });

        $scope.$on('$accessDenied', function (e) {
            SessionFactory.get(function (session) {
                $rootScope.$broadcast('$sessionUpdate', session);
            });
        });

        $scope.$on('$sessionUpdate', function (e, newSession) {
            $scope.session = newSession;

            if (!newSession.loggedIn) {
                $scope.return_path = $location.path();
                $location.path('/login');
            }
            else if ($location.path() === '/login') {
                $location.path('/experiments');
            }
            else if ($scope.return_path) {
                $location.path($scope.return_path);
            }
        });

        $scope.logout = function () {
            SessionFactory.delete(function(session) {
                $rootScope.$broadcast('$sessionUpdate', session);
            });
        };

        $scope.goBack = function () {
            window.history.back();
        };

        $scope.go = function (path) {
            $location.path(path);
        };
    }).

    controller('LoginCtrl', function ($scope, $rootScope, $location, SessionFactory) {
        $scope.show = false;
        $scope.user = {};
        $scope.loading = false;
        $scope.error = null;

        $scope.login = function () {
            $scope.loading = true;
            $scope.error = null;

            SessionFactory.save($scope.user, function (session) {
                $scope.loading = false;

                if (session.error) {
                    $scope.error = session.error;
                    return;
                }

                $rootScope.$broadcast('$sessionUpdate', session);
            });
        };
    }).

    controller('NavBarCtrl', function ($scope, $rootScope, $state, $location, UserFactory) {
        $scope.menuitems = [
            {title: "Experiments", link: "#/experiments", section: "experiments", active: "", icon: "glyphicon glyphicon-tasks"},
            {title: "Viewer", link: "#/viewer", section: "viewer", active: "", icon: "glyphicon glyphicon-stats"},
        ];

        $scope.user = null;
        $scope.$on('$sessionUpdate', function (e, newSession) {
            if (newSession.loggedIn)
                $scope.user = UserFactory.get({userId: newSession.userid});
            else
                $scope.user = null;
        });

        function update_active() {
            if ((typeof $state.current !== 'undefined') && ('section' in $state.current)) {
                angular.forEach($scope.menuitems, function (item) {
                    if (item.section === $state.current.section)
                        item.active = "active";
                    else
                        item.active = "";
                });
            }
        }
        update_active();

        $scope.loading = false;
        $scope.error = {show: false};
        $scope.progress = null;

        $scope.$on("$loadingStart", function (e) {
            $scope.loading = true;
            $scope.error.show = false;
            update_active();
        });

        $scope.$on("$loadingProgress", function (e, progress) {
            $scope.progress = progress;
        });

        $scope.$on("$loadingSuccess", function (e, error) {
            $scope.loading = false;
            $scope.error.show = false;
            $scope.progress = null;
        });

        $scope.$on("$loadingError", function (e, message) {
            $scope.loading = false;
            $scope.error.show = true;
            $scope.error.message = message;
            $scope.progress = null;
        });
    }).

    controller('ViewerCtrl', function ($scope, $rootScope, $state, $http, $viewer) {
        $rootScope.$broadcast('$loadingStart');

        $scope.viewer = $viewer;
        $scope.playPauseIcon = "glyphicon-play";
        $scope.showSpeedSelector = false;

        $scope.$on("$viewerPlaybackStart", function (e) {
            $scope.playPauseIcon = "glyphicon-pause";
        });

        $scope.$on("$viewerPlaybackPause", function (e) {
            $scope.playPauseIcon = "glyphicon-play";
        });

        $scope.$on("$fileLoadBegin", function (e) {
            $rootScope.$broadcast('$loadingStart');
        });

        $scope.$on("$fileLoadDone", function (e, data) {
            $viewer.load(data);
            $rootScope.$broadcast('$loadingSuccess');
        });

        if (!$state.params.fileId)
            $rootScope.$broadcast('$loadingSuccess');
        else {
            $rootScope.$broadcast('$loadingStart');

            var xhr = new XMLHttpRequest();

            xhr.onload = function(e) {
                $viewer.load(xhr.response);

                $scope.$apply(function () {
                    $rootScope.$broadcast("$loadingSuccess");
                });
            };

            xhr.onprogress = function (e) {
                $scope.$apply(function () {
                    var progress = null;
                    if (e.lengthComputable)
                        progress = e.loaded / e.total;

                    $rootScope.$broadcast("$loadingProgress", progress);
                });
            };

            xhr.onerror = function(e) {
                $scope.$apply(function () {
                    $rootScope.$broadcast('$loadingError', xhr.responseText);
                });
            };

            xhr.open("GET", '/api/f/'+$state.params.expId+'/'+$state.params.fileId, true);
            xhr.responseType = "arraybuffer";
            xhr.send();
        }
    }).

    controller('ExperimentListCtrl', function ($scope, $rootScope, ExperimentFactory) {
        $rootScope.$broadcast('$loadingStart');
        $scope.experiments = ExperimentFactory.query(function (res) {
            if (res.error) {
                $rootScope.$broadcast('$loadingError', res.error);
                return;
            }

            $rootScope.$broadcast('$loadingSuccess');
        });
    }).

    controller('ExperimentNewCtrl', function ($scope, $rootScope, ExperimentFactory) {
        $rootScope.$broadcast('$loadingStart');
        $rootScope.$broadcast('$loadingSuccess');
    }).

    controller('ExperimentDetailCtrl', function ($scope, $rootScope, $state, ExperimentFactory) {
        $rootScope.$broadcast('$loadingStart');

        $scope.experiment = ExperimentFactory.get({expName: $state.params.expName}, function (res) {
            if (res.error) {
                $rootScope.$broadcast('$loadingError', res.error);
                return;
            }

            $rootScope.$broadcast('$loadingSuccess');
            updateActiveInstance();
        });

        function updateActiveInstance() {
            if (typeof $state.params.instId !== 'undefined' ) {
                angular.forEach($scope.experiment.instances, function (inst) {
                    if (inst.id == $state.params.instId)
                        inst.active = "active";
                    else
                        inst.active = "";
                });
            }
        }

        $scope.$on("$stateChangeSuccess", function(event, current, previous) {
            updateActiveInstance();
        });
    }).

    controller('InstanceCtrl', function ($scope, $rootScope, $state, $timeout, InstanceFactory, RunFactory, ChartFactory, ChartDataFactory) {
        $rootScope.$broadcast('$loadingStart');

        $scope.instance = InstanceFactory.get({expName: $state.params.expName, instId: $state.params.instId}, function (res) {
            if (res.error) {
                $rootScope.$broadcast('$loadingError', res.error);
                return;
            }

            $rootScope.$broadcast('$loadingSuccess');
        });

        var base = '#/experiments/'+$state.params.expName+'/'+$state.params.instId;

        $scope.tabs = [
            {name: 'dashboard', title: 'Dashboard', href: base+'/dashboard'},
            {name: 'parameters', title: 'Parameters', href: base+'/parameters'},
            {name: 'files', title: 'Files', href: base+'/files'}
        ];

        $scope.$on("$stateChangeSuccess", function(event, current, previous) {
            angular.forEach($scope.tabs, function (tab) {
                tab.active = (tab.name === $state.current.tab);
            });
        });
    }).

    controller('DashboardCtrl', function ($scope, $rootScope, $state, $timeout, ChartFactory, ChartDataFactory) {
        $rootScope.$broadcast('$loadingStart');

        ChartFactory.query({expName: $state.params.expName}, function (charts) {
            if (charts.error) {
                $rootScope.$broadcast('$loadingError', charts.error);
                return;
            }

            angular.forEach(charts, function (chart) {
                chart.render = function (element) {
                    var chartConfig = {};

                    chart.config.forEach(function (cfg) {
                        var cur = chartConfig,
                            path = cfg.key.split('.');

                        for (var i=0; i < path.length-1; i++) {
                            if (!cur[path[i]])
                                cur[path[i]] = {};

                            cur = cur[path[i]];
                        }

                        cur[path[path.length-1]] = cfg.value;
                    });

                    if (!chartConfig.chart)
                        chartConfig.chart = {};
                    chartConfig.chart.renderTo = element[0];

                    chart.highchart = new Highcharts.Chart(chartConfig);

                    for (var k in chart.series) {
                        chart.series[k].highseries = chart.highchart.addSeries({
                            name: chart.series[k].name,
                            type: chart.series[k].type
                        });
                    };

                    (function update () {
                        if ($state.current.controller !== 'DashboardCtrl')
                            return;

                        chart.getter();

                        $timeout(update, 60*1000);
                    })();
                };

                chart.getter = function () {
                    ChartDataFactory.get({expName: $state.params.expName, chartId: chart.id, instId: $state.params.instId, runId: 1}, function (res) {
                        if (!res.series)
                            return;

                        for (var k in res.series) {
                            var series = res.series[k];

                            angular.forEach(series.data, function (row) {
                                if (series.xtype === 'integer')
                                    row[0] = parseInt(row[0]);
                                else if (series.xtype === 'real')
                                    row[0] = parseFloat(row[0]);
                                else if (series.xtype === 'boolean')
                                    row[0] = /true/i.test(row[0]) || /t/i.test(row[0]);
                                else if (series.xtype === 'timestamp')
                                    row[0] = parseInt(row[0]);

                                if (series.ytype === 'integer')
                                    row[1] = parseInt(row[1]);
                                else if (series.ytype === 'real')
                                    row[1] = parseFloat(row[1]);
                                else if (series.ytype === 'boolean')
                                    row[1] = /true/i.test(row[1]) || /t/i.test(row[1]);
                                else if (series.ytype === 'timestamp')
                                    row[1] = parseInt(row[1]);
                            });

                            chart.series[k].highseries.setData(series.data);
                        };
                    });
                };
            });

            $scope.charts = charts;
            $rootScope.$broadcast('$loadingSuccess');
        });
    }).

    controller('FilesCtrl', function ($scope, $rootScope, $state, RunFactory) {
        $rootScope.$broadcast('$loadingStart');

        RunFactory.get({expName: $state.params.expName, instId: $state.params.instId, runId: 1}, function (res) {
            if (res.error) {
                $rootScope.$broadcast('$loadingError', res.error);
                return;
            }

            for (var i=0; i<res.files.length; i++) {
                var f = res.files[i];
                var ext = /[^.]+$/.exec(f.name);

                if (ext && (ext[0] === 'srs'))
                    f.link = "#/viewer/"+$state.params.expName+"/"+f.id;
                else
                    f.link = "/api/f/"+$state.params.expName+"/"+f.id;
            }

            $scope.files = res.files;
            $rootScope.$broadcast('$loadingSuccess');
        });

        $scope.sort = {
            column: 'name',
            reverse: false
        };
    });
