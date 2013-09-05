'use strict';

angular.module('solace.factories', []).
    factory('experimentFactory', function($http, $q, $timeout) {
        return {
            getExperiments: function () {
                var deferred = $q.defer();

                $http.get("/data/experiments").
                    success(function (data) {
                        deferred.resolve(data);
                    }).
                    error(function () {
                        deferred.reject("Failed to fetch experiments from database.");
                    });

                return deferred.promise;
            },
            deleteExperiment: function (exp) {
                console.log(exp);
            },
            insertExperiment: function (data, callbacks) {
                $http.post("/data/experiments", data).
                    success(function (data) {
                        callbacks.success();
                    }).
                    error(function () {
                        callbacks.error("Failed to save the experiment to database.");
                    });
            },
            getTestsByExperiment: function (exp_id) {
                var deferred = $q.defer();

                $http.get("/data/experiments/"+exp_id+"/tests").
                    success(function (data) {
                        deferred.resolve(data);
                    }).
                    error(function () {
                        deferred.reject("Failed to fetch tests from database.");
                    });

                return deferred.promise;
            }
        }
    }).

    factory('SessionFactory', function($resource) {
        return $resource('/sessions');
    });