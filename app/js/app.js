'use strict';

angular.module('solace', ['ngRoute', 'ngAnimate', 'solace.controllers', 'solace.directives', 'solace.factories']).
    config(['$routeProvider', function($routeProvider) {
        $routeProvider.
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
                    experiments: function (experimentFactory) {
                        return experimentFactory.getExperiments();
                    }
                }
            }).
            when('/experiment/:id', {
                section: 'experiments',
                templateUrl: 'partials/experiment.html',
                controller: 'ExperimentCtrl'
            }).
            otherwise({redirectTo: '/dashboard'});
    }]
);

