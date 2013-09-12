'use strict';

angular.module('solace', ['ngRoute', 'ngAnimate', 'ngResource', 'ui.router', 'solace.controllers', 'solace.directives', 'solace.factories']).
    config(function($stateProvider, $httpProvider) {
        $stateProvider.
            state('login', {
                url: "/login",
                templateUrl: 'partials/login.html',
                controller: 'LoginCtrl'
            }).
            state('dashboard', {
                url: '/dashboard',
                section: 'dashboard',
                templateUrl: 'partials/dashboard.html',
                controller: 'DashboardCtrl'
            }).
            state('experiments', {
                url: '/experiments',
                section: 'experiments',
                templateUrl: 'partials/experiments.html',
                controller: 'ExperimentsCtrl',
            }).
            state('experiment', {
                url: '/experiment/{expId:[0-9]*}',
                section: 'experiments',
                templateUrl: 'partials/experiment.html',
                controller: 'ExperimentCtrl',
            }).
            state('experiment.instance', {
                url: '/{instId:[0-9]*}',
                section: 'experiments',
                templateUrl: 'partials/experiment.instance.html',
                controller: 'InstanceCtrl'
            }).
            state('experiment.run', {
                url: '/{instId:[0-9]*}/{runId:[0-9]*}',
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