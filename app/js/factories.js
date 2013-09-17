'use strict';

angular.module('solace.factories', []).
    factory('SessionFactory', function($resource) {
        return $resource('/api/s');
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
    });

    // factory('ResultFactory', function($resource) {
    //     return $resource('/api/instance/:instId/:runId/result/:name');
    // }).

    // factory('FileFactory', function($resource) {
    //     return $resource('/api/instance/:instId/:runId/files');
    // });

    //     return {
    //         getExperiments: function () {
    //             var deferred = $q.defer();

    //             $http.get("/data/experiments").
    //                 success(function (data) {
    //                     deferred.resolve(data);
    //                 }).
    //                 error(function () {
    //                     deferred.reject("Failed to fetch experiments from database.");
    //                 });

    //             return deferred.promise;
    //         },
    //         deleteExperiment: function (exp) {
    //             console.log(exp);
    //         },
    //         insertExperiment: function (data, callbacks) {
    //             $http.post("/data/experiments", data).
    //                 success(function (data) {
    //                     callbacks.success();
    //                 }).
    //                 error(function () {
    //                     callbacks.error("Failed to save the experiment to database.");
    //                 });
    //         },
    //         getTestsByExperiment: function (exp_id) {
    //             var deferred = $q.defer();

    //             $http.get("/data/experiments/"+exp_id+"/tests").
    //                 success(function (data) {
    //                     deferred.resolve(data);
    //                 }).
    //                 error(function () {
    //                     deferred.reject("Failed to fetch tests from database.");
    //                 });

    //             return deferred.promise;
    //         }
    //     }
    // }).