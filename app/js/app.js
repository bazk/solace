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
                        return ExperimentsFactory.get();
                    }
                }
            }).
            when('/experiment/:id', {
                section: 'experiments',
                templateUrl: 'partials/experiment.html',
                controller: 'ExperimentCtrl'
            }).
            otherwise({redirectTo: '/dashboard'});

        // $httpProvider.interceptors.push(function ($rootScope, $location, $q) {
        //     return {
        //         'responseError': function(rejection) {
        //             // if we're not logged-in to the web service, redirect to login page
        //             if (rejection.status === 401 && $location.path() != '/login') {
        //                 $rootScope.session = {loggedIn: false, username: "", error: false};
        //                 $location.path('/login');
        //             }
        //             return $q.reject(rejection);         
        //         }
        //     };
        // });
    });