'use strict';

angular.module('solace.controllers', []).
    controller('MainCtrl', function ($scope, $rootScope, $location, SessionFactory) {
        $scope.session = SessionFactory.get(function (session) {
            $rootScope.$broadcast('$sessionUpdate', session);
        });

        $scope.$on('$sessionUpdate', function (e, newSession) {
            $scope.session = newSession;

            if (!newSession.loggedIn) {
                $rootScope.return_path = $location.path();
                $location.path('/login');
            }
        });

        $scope.$on('$accessDenied', function (e) {
            SessionFactory.get(function (session) {
                $rootScope.$broadcast('$sessionUpdate', session);
            });
        });
    }).

    controller('LoginCtrl', function ($scope, $rootScope, $location, SessionFactory) {
        $scope.user = {};
        $scope.showLoading = false;
        $scope.showError = false;
        $scope.errorMessage = "";

        if ($scope.session.loggedIn)
            $location.path('/');

        $scope.login = function () {
            $scope.showLoading = true;
            $scope.showError = false;

            SessionFactory.save($scope.user, function (session) {
                $scope.showLoading = false;

                if (session.error) {
                    $scope.errorMessage = session.error;
                    $scope.showError = true;
                    return;
                }

                $rootScope.$broadcast('$sessionUpdate', session);
                if ((typeof $rootScope.return_path === 'undefined') || ($rootScope.return_path === '/login'))
                    $location.path('/');
                else
                    $location.path($rootScope.return_path);
            });
        };
    }).

    controller('NavBarCtrl', function ($scope, $rootScope, $state, $location, SessionFactory) {
        $scope.loading = false;
        $scope.errorMessage = "";
        $scope.showError = false;
        $scope.menuitems = [
            {title: "Experiments", link: "#/experiments", section: "experiments", active: "", icon: "glyphicon glyphicon-tasks"},
            {title: "Viewer", link: "#/viewer", section: "viewer", active: "", icon: "glyphicon glyphicon-stats"},
        ];

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

        $scope.$on("$beginLoading", function (e) {
            $scope.loading = true;
            $scope.showError = false;
            update_active();
        });

        $scope.$on("$doneLoading", function (e, error) {
            $scope.loading = false;
            $scope.showError = false;
        });

        $scope.$on("$stateChangeError", function(event, current, previous, message) {
            $scope.loading = false;
            $scope.errorMessage = message;
            $scope.showError = true;
        });

        $scope.closeError = function () {
            $scope.showError = false;
        }

        $scope.logout = function () {
            SessionFactory.delete(function(session) {
                $rootScope.$broadcast('$sessionUpdate', session);
            });
        }

        update_active();
    }).

    controller('ViewerCtrl', function ($scope, $rootScope, $state, $http) {
        $rootScope.$broadcast('$beginLoading');

        $scope.viewer = new srs2d.Viewer();
        $scope.progress = 0;
        $scope.clock = 0;
        $scope.secondsLength = 0;
        $scope.playPauseIcon = "glyphicon-play";

        $scope.viewer.onClockUpdate(function (clock) {
            $scope.$apply(function () {
                $scope.clock = clock;
                $scope.progress = clock / $scope.viewer.secondsLength;
            });
        });

        console.log($state.params);

        if ((typeof $state.params.instId !== 'undefined') && (typeof $state.params.runId !== 'undefined')) {
            $http.get('/api/instance/'+$state.params.instId+'/'+$state.params.runId+'/files/'+$state.params.filename, {responseType: "arraybuffer"}).success(function (buffer) {
                $scope.viewer.load(buffer);
                $scope.secondsLength = $scope.viewer.secondsLength;
                $rootScope.$broadcast('$doneLoading');
            });
        }

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
    }).

    controller('DashboardCtrl', function ($scope, $rootScope) {
        $rootScope.$broadcast('$beginLoading');
        $rootScope.$broadcast('$doneLoading');
    }).

    controller('ExperimentsCtrl', function ($scope, $rootScope, ExperimentsFactory) {
        $rootScope.$broadcast('$beginLoading');
        $scope.experiments = ExperimentsFactory.query(function () {
            $rootScope.$broadcast('$doneLoading');
        });
    }).

    controller('ExperimentCtrl', function ($scope, $rootScope, $state, $location, ExperimentFactory) {
        $rootScope.$broadcast('$beginLoading');

        $scope.experiment = ExperimentFactory.get({name: $state.params.expName}, function () {
            $rootScope.$broadcast('$doneLoading');
            update_active_instance();
        });

        function update_active_instance() {
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
            update_active_instance();
        });
    }).

    controller('InstanceCtrl', function ($scope, $rootScope, $stateParams, InstanceFactory) {
        $rootScope.$broadcast('$beginLoading');

        $scope.instance = InstanceFactory.get({id: $stateParams.instId}, function () {
            $rootScope.$broadcast('$doneLoading');
        });
    }).

    controller('RunCtrl', function ($scope, $rootScope, $state, RunFactory, ResultFactory, FileFactory) {
        $rootScope.$broadcast('$beginLoading');

        $scope.instance = {id:$state.params.instId};

        $scope.files = FileFactory.query({instId: $state.params.instId, runId: $state.params.runId});

        $scope.run = RunFactory.get({instId: $state.params.instId, runId: $state.params.runId}, function () {
            angular.forEach($scope.run.resultVariables, function (res) {
                if ((res.type == 'integer') || (res.type == 'real')) {
                    var r = ResultFactory.get({instId: $state.params.instId, runId: $state.params.runId, name: res.name}, function () {
                        $scope.chart.addSeries({
                            name: res.name,
                            data: (function () {
                                var ret = [];
                                for (var i=0; i<r.data.length; i++)
                                    ret.push([new Date(r.data[i][0]).getTime(), parseFloat(r.data[i][1])]);
                                return ret;
                            })()
                        });
                    });
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

            $rootScope.$broadcast('$doneLoading');
        });

        $scope.results = [];

        $scope.chart = function (element) {
            return new Highcharts.Chart({
                chart: { renderTo: element[0] },
                title: { text: 'Results' },
                xAxis: { type: 'datetime' },
                series: []
            });
        };

        $scope.goBack = function () {
            window.history.back();
        };
    });