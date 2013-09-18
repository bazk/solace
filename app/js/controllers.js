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

        $scope.$on("$loadingStart", function (e) {
            $scope.loading = true;
            $scope.error.show = false;
            update_active();
        });

        $scope.$on("$loadingSuccess", function (e, error) {
            $scope.loading = false;
            $scope.error.show = false;
        });

        $scope.$on("$loadingError", function (e, message) {
            $scope.loading = false;
            $scope.error.show = true;
            $scope.error.message = message;
        });
    }).

    controller('ViewerCtrl', function ($scope, $rootScope, $state, $http) {
        $rootScope.$broadcast('$loadingStart');

        $scope.viewer = new srs2d.Viewer();
        $scope.progress = 0;
        $scope.clock = 0;
        $scope.secondsLength = 0;
        $scope.playPauseIcon = "glyphicon-play";

        $scope.speed = 1.0;
        $scope.$watch('speed', function() {
            $scope.viewer.setSpeed($scope.speed);
        });

        $scope.showSpeedSelector = false;

        if (typeof $state.params.fileId !== 'undefined') {
            $http.get('/api/f/'+$state.params.expId+'/'+$state.params.fileId, {responseType: "arraybuffer"}).success(function (buffer) {
                $scope.viewer.load(buffer);
                $scope.secondsLength = $scope.viewer.secondsLength;
                $rootScope.$broadcast('$loadingSuccess');
            });
        }
        else
            $rootScope.$broadcast('$loadingSuccess');

        $scope.$on("$fileLoadBegin", function(event) {
            $rootScope.$broadcast('$loadingStart');
        });

        $scope.$on("$fileLoadError", function(event, file) {
            $rootScope.$broadcast('$loadingSuccess');
        });

        $scope.$on("$fileLoadDone", function(event, file) {
            $scope.viewer.load(file.buffer);
            $scope.secondsLength = $scope.viewer.secondsLength;
            $rootScope.$broadcast('$loadingSuccess');
        });

        var playing = false;
        $scope.play = function () {
            if (!playing) {
                $scope.viewer.play();
                $scope.playPauseIcon = "glyphicon-pause";
            }
            else {
                $scope.viewer.stop();
                $scope.playPauseIcon = "glyphicon-play";
            }
            playing = !playing;
        };

        $scope.viewer.onClockUpdate(function (clock) {
            $scope.$apply(function () {
                $scope.clock = clock;
                $scope.progress = clock / $scope.viewer.secondsLength;
            });
        });
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

    controller('RunCtrl', function ($scope, $rootScope, $state, $timeout, RunFactory, ResultFactory) {
        $rootScope.$broadcast('$loadingStart');

        $scope.results = [];

        $scope.run = RunFactory.get({expName: $state.params.expName, instId: $state.params.instId, runId: $state.params.runId}, function (res) {
            if (res.error) {
                $rootScope.$broadcast('$loadingError', res.error);
                return;
            }

            angular.forEach($scope.run.results, function (res) {
                if ((res.type == 'integer') || (res.type == 'real')) {
                    res.series = $scope.chart.addSeries({
                        name: res.name
                    });

                    res.getter = function () {
                        var r = ResultFactory.get({expName: $state.params.expName, instId: $state.params.instId, runId: $state.params.runId, name: res.name}, function () {
                            var ret = [];

                            for (var i=0; i<r.data.length; i++)
                                ret.push([new Date(r.data[i][0]).getTime(), parseFloat(r.data[i][1])]);

                            res.series.setData(ret);
                        });
                    };
                }
                else {
                    var r = ResultFactory.get({instId: $state.params.instId, runId: $state.params.runId, name: res.name}, function () {
                        for (var i=0; i<r.data.length; i++)
                            $scope.results.push({
                                timestamp: r.data[i][0],
                                value: r.data[i][1]
                            });
                    });
                }
            });

            function update() {
                if ($state.current.controller !== 'RunCtrl')
                    return;

                angular.forEach($scope.run.results, function (res) {
                    res.getter();
                });

                $timeout(update, 60*1000);
            };
            update();

            $rootScope.$broadcast('$loadingSuccess');
        });

        $scope.chart = function (element) {
            return new Highcharts.Chart({
                chart: { renderTo: element[0] },
                title: { text: 'Results' },
                xAxis: { type: 'datetime' },
                series: []
            });
        };

        $scope.sort = {
            column: 'name',
            reverse: false
        };

        $scope.goBack = function () {
            window.history.back();
        };
    });