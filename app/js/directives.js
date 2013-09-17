'use strict';

angular.module('solace.directives', []).
    directive('ngDraggable', function() {
        return function (scope, element, attrs) {
            element.addClass('draggable');
            element.on('dragstart', function (e) {
                console.log('dragstart');
            });
            element.on('dragend', function (e) {
                console.log('dragend');
                console.log(e);
            });
        }
    }).
    directive('ngSelectable', function() {
        return function (scope, element, attrs) {
            var input = $(element.find('td input'));

            element.on('click', function (e) {
                if (typeof input.attr('checked') !== 'undefined') {
                    input.removeAttr('checked');
                    element.removeClass('selected');
                }
                else {
                    input.attr('checked', 'checked');
                    element.addClass('selected');
                }
                scope.$apply();
            });
        }
    }).
    directive('ngHighchart', function() {
        return function (scope, element, attrs) {
            scope[attrs.ngHighchart] = scope[attrs.ngHighchart](element);
        }
    }).
    directive('srsViewer', function() {
        return function (scope, element, attrs) {
            scope[attrs.srsViewer].bind(element);
        }
    }).
    directive('solFile', function() {
        return function (scope, element, attrs) {
            element.bind('change', function (e) {
                scope.$broadcast('$fileLoadBegin');

                var files = e.target.files;

                if (files.length != 1) {
                    scope.$broadcast('$fileLoadError', null);
                    return;
                }

                var fileReader = new FileReader();

                fileReader.onload = function (e) {
                    files[0].buffer = this.result;
                    scope.$broadcast('$fileLoadDone', files[0]);
                };

                fileReader.onerror = function (e) {
                    scope.$broadcast('$fileLoadError', files[0]);
                };

                fileReader.readAsArrayBuffer(files[0]);
            });
        }
    });