'use strict';

angular.module('solace', ['ngRoute', 'ngAnimate', 'ngResource', 'solace.controllers', 'solace.directives', 'solace.factories']).
    config(function($routeProvider, $httpProvider) {
        $routeProvider.
            when('/login', {
                templateUrl: 'partials/login.html',
                controller: 'LoginCtrl'
            }).
            when('/dashboard', {
                section: 'dashboard',
                templateUrl: 'partials/dashboard.html',
                controller: 'DashboardCtrl'
            }).
            when('/experiments', {
                section: 'experiments',
                templateUrl: 'partials/experiments.html',
                controller: 'ExperimentsCtrl',
                resolve: {
                    experiments: function (ExperimentsFactory) {
                        return ExperimentsFactory.query();
                    }
                }
            }).
            when('/experiment/:id', {
                section: 'experiments',
                templateUrl: 'partials/experiment.html',
                controller: 'ExperimentCtrl'
            }).
            otherwise({redirectTo: '/dashboard'});

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