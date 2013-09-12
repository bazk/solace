'use strict';

angular.module('solace.controllers', []).
    controller('MainCtrl', function ($scope, $rootScope, $location, SessionFactory) {
        $scope.session = SessionFactory.get(function (session){
            $rootScope.$broadcast('$sessionUpdate', session);
        });

        $scope.$on('$sessionUpdate', function (e, newSession) {
            $scope.session = newSession;
            if (!$scope.session.loggedIn)
                $location.path('/login');
        });

        $scope.$on('$accessDenied', function (e) {
            SessionFactory.get(function (session) {
                $rootScope.$broadcast('$sessionUpdate', session);
            });
        });
    }).

    controller('MenuLeftCtrl', function ($scope, $location, $state) {
    }).

    controller('NavBarCtrl', function ($scope, $rootScope, $state, $location, SessionFactory) {
        $scope.loading = false;
        $scope.errorMessage = "";
        $scope.showError = false;
        $scope.menuitems = [
            {title: "Dashboard", link: "#/dashboard", section: "dashboard", active: "", icon: "glyphicon glyphicon-stats"},
            {title: "Experiments", link: "#/experiments", section: "experiments", active: "", icon: "glyphicon glyphicon-tasks"},
            {title: "New Experiment", link: "#/experiments/new", section: "new-experiment", active: "", icon: "glyphicon glyphicon-plus"},
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

        $scope.$on("$stateChangeStart", function(event, next, current) {
            $scope.loading = true;
            $scope.showError = false;
        });

        $scope.$on("$stateChangeSuccess", function(event, current, previous) {
            $scope.loading = false;
            $scope.showError = false;
            update_active();
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

    controller('DashboardCtrl', function ($scope) {
    }).

    controller('ExperimentCtrl', function ($scope, $state, $location, ExperimentFactory) {
        $scope.experiment = ExperimentFactory.get({id: $state.params.expId}, update_active_instance);

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

        $scope.new = {
            doShow: false,
            doShowLoading: false,
            doShowError: false,

            name: {value: "", class: ""},
            desc: {value: "", class: ""},

            error: "",

            show: function () {
                $scope.new.name.value = "";
                $scope.new.name.class = "";
                $scope.new.desc.value = "";
                $scope.new.desc.class = "";
                $scope.new.doShowError = false;
                $scope.new.doShowLoading = false;
                $scope.new.doShow = true;
            },
            hide: function () {
                $scope.new.doShow = false;
            },
            save: function () {
                $scope.new.doShowError = false;
                $scope.new.doShowLoading = true;

                if ($scope.new.name.value === '') {
                    $scope.new.name.class = "has-error";
                    $scope.new.doShowLoading = false;
                    return;
                }
                $scope.new.name.class = "";

                var exp = {
                    name: $scope.new.name.value,
                    description: $scope.new.desc.value
                };

                ExperimentsFactory.save(exp,
                    function (success) {
                        $scope.new.hide();
                        $state.reload();
                    }, function (error) {
                        $scope.new.error = reason;
                        $scope.new.doShowError = true;
                        $scope.new.doShowLoading = false;
                    }
                );
            }
        };
    }).

    controller('InstanceCtrl', function ($scope, $stateParams, InstanceFactory) {
        $scope.instance = InstanceFactory.get({id: $stateParams.instId});
    }).

    controller('RunCtrl', function ($scope, $stateParams, RunFactory, ResultFactory) {
        $scope.run = RunFactory.get({id: $stateParams.runId}, function () {
            angular.forEach($scope.run.resultVariables, function (res) {
                if ((res.type == 'integer') || (res.type == 'real')) {
                    var r = ResultFactory.get({id: $stateParams.runId, name: res.name}, function () {
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
                    var r = ResultFactory.get({id: $stateParams.runId, name: res.name}, function () {
                        for (var i=0; i<r.data.length; i++)
                            $scope.results.push({
                                timestamp: r.data[i][0],
                                value: r.data[i][1]
                            });
                    });
                }
            });
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
    }).

    controller('LoginCtrl', function ($scope, $rootScope, $location, SessionFactory) {
        $scope.user = {};
        $scope.showLoading = false;
        $scope.showError = false;
        $scope.errorMessage = "";

        $scope.login = function () {
            $scope.showLoading = true;
            $scope.showError = false;

            SessionFactory.save($scope.user, function(session) {
                $rootScope.$broadcast('$sessionUpdate', session);
                $location.path('/');
                $scope.showLoading = false;
            }, function(error) {
                $scope.errorMessage = error;
                $scope.showError = true;
                $scope.showLoading = false;
            });
        };
    });