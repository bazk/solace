'use strict';

angular.module('solace', ['ngAnimate', 'ngResource', 'ui.router', 'solace.viewer', 'solace.controllers', 'solace.directives', 'solace.factories', 'solace.filters']).
    config(function($stateProvider, $httpProvider) {
        $stateProvider.
            state('root', {
                url: '',
                controller: function ($location) {
                    $location.path("/experiments");
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
                templateUrl: 'partials/viewer/index.html',
                controller: 'ViewerCtrl'
            }).
            state('view-file', {
                url: '/viewer/:expId/:fileId',
                section: 'viewer',
                templateUrl: 'partials/viewer/index.html',
                controller: 'ViewerCtrl'
            }).
            state('experiments', {
                url: '/experiments',
                section: 'experiments',
                templateUrl: 'partials/experiments/index.html',
                controller: 'ExperimentListCtrl',
            }).
            state('experiments.new', {
                url: '/new',
                section: 'experiments',
                templateUrl: 'partials/experiments/new.html',
                controller: 'ExperimentNewCtrl',
            }).
            state('experiment', {
                url: '/experiments/:expName',
                section: 'experiments',
                templateUrl: 'partials/experiments/details.html',
                controller: 'ExperimentDetailCtrl',
            }).
            state('experiment.instance', {
                url: '/:instId',
                section: 'experiments',
                templateUrl: 'partials/experiments/instance/index.html',
                controller: 'InstanceCtrl'
            }).
            state('experiment.instance.dashboard', {
                url: '/dashboard',
                section: 'experiments',
                tab: 'dashboard',
                templateUrl: 'partials/experiments/instance/dashboard.html',
                controller: 'DashboardCtrl'
            }).
            state('experiment.instance.parameters', {
                url: '/parameters',
                section: 'experiments',
                tab: 'parameters',
                templateUrl: 'partials/experiments/instance/parameters.html'
            }).
            state('experiment.instance.files', {
                url: '/files',
                section: 'experiments',
                tab: 'files',
                templateUrl: 'partials/experiments/instance/files.html',
                controller: 'FilesCtrl'
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