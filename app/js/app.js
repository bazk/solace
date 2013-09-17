'use strict';

angular.module('solace', ['ngAnimate', 'ngResource', 'ui.router', 'solace.controllers', 'solace.directives', 'solace.factories', 'solace.filters']).
    config(function($stateProvider, $httpProvider) {
        $stateProvider.
            state('root', {
                url: '',
                controller: function ($scope, $location) {
                    $scope.$on("$stateChangeBegin", function (e) {
                        $location.path("/experiment");
                    });
                }
            }).
            state('login', {
                url: "/login",
                templateUrl: 'partials/login.html',
                controller: 'LoginCtrl'
            }).
            state('viewer', {
                url: '/viewer',
                section: 'viewer',
                templateUrl: 'partials/viewer.html',
                controller: 'ViewerCtrl'
            }).
            state('view-file', {
                url: '/viewer/:expId/:fileId',
                section: 'viewer',
                templateUrl: 'partials/viewer.html',
                controller: 'ViewerCtrl'
            }).
            state('experiment', {
                abstract: true,
                url: '/experiment',
                templateUrl: 'partials/experiments.html'
            }).
            state('experiment.list', {
                url: '',
                section: 'experiment',
                templateUrl: 'partials/experiment.list.html',
                controller: 'ExperimentListCtrl',
            }).
            state('experiment.new', {
                url: '/new',
                section: 'experiment',
                templateUrl: 'partials/experiment.new.html',
                controller: 'ExperimentNewCtrl',
            }).
            state('experiment.detail', {
                url: '/:expName',
                section: 'experiment',
                templateUrl: 'partials/experiment.detail.html',
                controller: 'ExperimentDetailCtrl',
            }).
            state('experiment.detail.instance', {
                url: '/:instId',
                section: 'experiment',
                templateUrl: 'partials/experiment.instance.html',
                controller: 'InstanceCtrl'
            }).
            state('experiment.detail.run', {
                url: '/:instId/:runId',
                section: 'experiment',
                templateUrl: 'partials/experiment.run.html',
                controller: 'RunCtrl'
            });

        $httpProvider.interceptors.push(function ($rootScope) {
            return {
                'responseError': function(rejection) {
                    if (rejection.status === 401) {
                        $rootScope.$broadcast('$accessDenied');
                    }
                    return rejection;
                }
            };
        });
    });