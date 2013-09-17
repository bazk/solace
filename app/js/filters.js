'use strict';

angular.module('solace.filters', []).
    filter('secondsToTime', function() {
        return function(input) {
            var seconds = input % 60,
                minutes = Math.floor((input / 60)) % 60,
                hours = Math.floor(input / 3600);

            seconds = (seconds < 10) ? '0'+seconds.toString() : seconds.toString();
            minutes = (minutes < 10) ? '0'+minutes.toString() : minutes.toString();
            hours = (hours < 10) ? '0'+hours.toString() : hours.toString();

            if (hours === '00')
                return minutes+':'+seconds;
            else
                return hours+':'+minutes+':'+seconds;
        };
    }).

    filter('humanReadable', function () {
        return function(input) {
            if (typeof input !== 'number')
                input = parseInt(input);

            if (input > 1024*1024*1024*1024)
                return (input / (1024*1024*1024*1024)).toFixed(1) + 'T';
            else if (input > 1024*1024*1024)
                return (input / (1024*1024*1024)).toFixed(1) + 'G';
            else if (input > 1024*1024)
                return (input / (1024*1024)).toFixed(1) + 'M';
            else if (input > 1024)
                return (input / 1024) + 'K';
            else
                return input;
        };
    });