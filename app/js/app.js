'use strict';

angular.module('solace', ['ngAnimate', 'ngResource', 'ui.router', 'solace.controllers', 'solace.directives', 'solace.factories', 'solace.filters']).
    config(function($stateProvider, $httpProvider) {
        $stateProvider.
            state('root', {
                url: '',
                controller: function ($scope, $location) {
                    $location.path("/experiments/list");
                }
            }).
            state('login', {
                url: "/login",
                templateUrl: 'partials/login.html',
                controller: 'LoginCtrl'
            }).
            state('viewer', {
                abstract: true,
                url: '/viewer',
                section: 'viewer',
                templateUrl: 'partials/viewer.html',
                controller: 'ViewerCtrl'
            }).
            state('viewer.list', {
                url: '',
                section: 'viewer',
                templateUrl: 'partials/viewer.html',
                controller: 'ViewerCtrl'
            }).
            state('viewer.view', {
                url: '/:instId/:runId/:filename',
                section: 'viewer',
                templateUrl: 'partials/viewer.html',
                controller: 'ViewerCtrl'
            }).
            state('experiments', {
                abstract: true,
                url: '/experiments',
                section: 'experiments',
                templateUrl: 'partials/experiments.html',
                controller: 'ExperimentsCtrl',
            }).
            state('experiments.list', {
                url: '',
                section: 'experiments',
                templateUrl: 'partials/experiments.list.html',
            }).
            state('experiments.new', {
                url: '/new',
                section: 'experiments',
                templateUrl: 'partials/experiments.new.html',
            }).
            state('experiment', {
                url: '/experiment/:expName',
                section: 'experiments',
                templateUrl: 'partials/experiment.html',
                controller: 'ExperimentCtrl',
            }).
            state('experiment.instance', {
                url: '/:instId',
                section: 'experiments',
                templateUrl: 'partials/experiment.instance.html',
                controller: 'InstanceCtrl'
            }).
            state('experiment.run', {
                url: '/:instId/:runId',
                section: 'experiments',
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