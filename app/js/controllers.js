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
                $location.path('/experiment');
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
            {title: "Experiments", link: "#/experiment", section: "experiment", active: "", icon: "glyphicon glyphicon-tasks"},
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

        $scope.progress = 0;
        $scope.clock = 0;
        $scope.secondsLength = 0;
        $scope.playPauseIcon = "glyphicon-play";

        $scope.percentComplete = null;

        $scope.showSpeedSelector = false;
        $scope.speed = 1.0;
        $scope.$watch('speed', function() {
            $viewer.setSpeed($scope.speed);
        });

        $scope.playPause = function () {
            $viewer.playPause();
        };

        $scope.$on("$viewerPlaybackStart", function (e) {
            $scope.playPauseIcon = "glyphicon-pause";
        });

        $scope.$on("$viewerPlaybackPause", function (e) {
            $scope.playPauseIcon = "glyphicon-play";
        });

        $scope.$on("$viewerClockUpdate", function (e, clock) {
            $scope.clock = clock;
            $scope.progress = clock / $viewer.getSecondsLength();
        });

        var xhr = new XMLHttpRequest();

        xhr.onload = function(e) {
            $scope.$apply(function () {
                $viewer.load(xhr.response);
                $scope.secondsLength = $viewer.getSecondsLength();
                $rootScope.$broadcast("$loadingSuccess");
            });
        };

        xhr.onprogress = function (e) {
            var progress = null;
            if (e.lengthComputable)
                progress = e.loaded / e.total;

            $scope.$apply(function () {
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
    }).

    controller('ExperimentListCtrl', function ($scope, $rootScope, ExperimentFactory) {
        $rootScope.$broadcast('$loadingStart');
        ExperimentFactory.get(function (res) {
            if (res.error) {
                $rootScope.$broadcast('$loadingError', res.error);
                return;
            }

            $scope.experiments = res.experiments;
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

    controller('InstanceCtrl', function ($scope, $rootScope, $state, InstanceFactory) {
        $rootScope.$broadcast('$loadingStart');

        $scope.instance = InstanceFactory.get({expName: $state.params.expName, instId: $state.params.instId}, function (res) {
            if (res.error) {
                $rootScope.$broadcast('$loadingError', res.error);
                return;
            }

            $rootScope.$broadcast('$loadingSuccess');
        });
    }).

    controller('RunCtrl', function ($scope, $rootScope, $state, $timeout, RunFactory, ChartFactory, ChartDataFactory) {
        $rootScope.$broadcast('$loadingStart');

        $scope.sort = {
            column: 'name',
            reverse: false
        };

        $scope.run = RunFactory.get({expName: $state.params.expName, instId: $state.params.instId, runId: $state.params.runId}, function (res) {
            if (res.error) {
                $rootScope.$broadcast('$loadingError', res.error);
                return;
            }

            $rootScope.$broadcast('$loadingSuccess');
        });

        ChartFactory.get({expName: $state.params.expName}, function (charts) {
            angular.forEach(charts, function (chart) {
                chart.render = function (element) {
                    chart.highchart = new Highcharts.Chart({
                        chart: { renderTo: element[0] },
                        xAxis: { type: 'datetime' }
                    });

                    angular.forEach(chart.series, function (series) {
                        series.highseries = chart.highchart.addSeries({
                            name: series.name,
                            type: series.type
                        });
                    });

                    (function update () {
                        if ($state.current.controller !== 'RunCtrl')
                            return;

                        console.log("UPDATING");
                        chart.getter();

                        $timeout(update, 5*1000);
                    })();
                };

                chart.getter = function () {
                    ChartDataFactory.get({expName: $state.params.expName, instId: $state.params.instId, runId: $state.params.runId, chartId: chart.id}, function (seriesData) {
                        angular.forEach(seriesData.data, function (row) {
                            if (seriesData.xType === 'integer')
                                row[0] = parseInt(row[0]);
                            else if (seriesData.xType === 'real')
                                row[0] = parseFloat(row[0]);
                            else if (seriesData.xType === 'boolean')
                                row[0] = /true/i.test(row[0]) || /t/i.test(row[0]);
                            else if (seriesData.xType === 'timestamp')
                                row[0] = parseInt(row[0]);

                            if (seriesData.yType === 'integer')
                                row[1] = parseInt(row[1]);
                            else if (seriesData.yType === 'real')
                                row[1] = parseFloat(row[1]);
                            else if (seriesData.yType === 'boolean')
                                row[1] = /true/i.test(row[1]) || /t/i.test(row[1]);
                            else if (seriesData.yType === 'timestamp')
                                row[1] = parseInt(row[1]);
                        });

                        chart.series[0].highseries.setData(seriesData.data);
                    });
                };
            });

            $scope.charts = charts;
        });
    });