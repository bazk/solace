'use strict';

angular.module('solace.factories', []).
    factory('SessionFactory', function($resource) {
        return $resource('/api/s');
    }).

    factory('UserFactory', function($resource) {
        return $resource('/api/u/:userId');
    }).

    factory('ExperimentFactory', function($resource) {
        return $resource('/api/e/:expName');
    }).

    factory('InstanceFactory', function($resource) {
        return $resource('/api/e/:expName/:instId');
    }).

    factory('RunFactory', function($resource) {
        return $resource('/api/e/:expName/:instId/:runId');
    }).

    factory('ResultFactory', function($resource) {
        return $resource('/api/e/:expName/:instId/:runId/result/:name');
    }).

    factory('ChartFactory', function($resource) {
        return $resource('/api/c/:expName');
    }).

    factory('ChartDataFactory', function($resource) {
        return $resource('/api/e/:expName/:instId/:runId/chart-data/:chartId');
    });