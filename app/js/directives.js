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
    });