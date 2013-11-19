'use strict';

angular.module('solace.viewer', []).
    directive('solViewer', function ($window, $viewer) {
        return function (scope, element, attrs) {
            var canvas = element.children('canvas');

            if (canvas)
                $viewer.bind(canvas);

            function resizeCanvas() {
                canvas.attr('width', element.width());
                canvas.attr('height', element.height());
                $viewer.resize();
            }
            resizeCanvas();

            var rTimeout;
            $(window).resize(function() {
                clearTimeout(rTimeout);
                rTimeout = setTimeout(resizeCanvas, 100);
            });

            var oTimeout;
            $(window).onorientationchange = function() {
                clearTimeout(oTimeout);
                oTimeout = setTimeout(resizeCanvas, 50);
            }
        }
    }).

    service('$viewer', function ($rootScope, $viewerFile) {
        var $this = this;

        $this.SHAPE = {
            CIRCLE: 0xC0,
            RECTANGLE: 0xC1,
            POLYGON: 0xC2
        };

        $this.PROXIMITY_ANGLES = [
            4.71238898038469000,
            5.49778714378213800,
            6.10865238198015350,
            0.17453292519943295,
            0.78539816339744830,
            1.57079632679489660,
            2.61799387799149440,
            3.66519142918809230
        ];

        $this.zoom = 250;
        $this.speed = 1.0;
        $this.clock = 0;
        $this.progress = 0;
        $this.length = 0;
        $this.playing = false;
        $this.canvas = null;
        $this.size = {width: null, height: null};
        $this.selectedObject = null;

        $rootScope.$on("$stateChangeStart", function () {
            $this.playing = false;
        });

        $this.posToScreen = function (pos) {
            var res = {x: pos.x * $this.zoom, y: (-pos.y) * $this.zoom };
            res.x += $this.size.width / 2;
            res.y += $this.size.height / 2;
            return res;
        };

        $this.bind = function (element) {
            $this.canvas = element;
            $this.size.width = element.width();
            $this.size.height = element.height();
            $this.ctx = $this.canvas.get(0).getContext("2d");

            $this.canvas.mousewheel(function (event, delta, deltaX, deltaY) {
                $this.zoom += 10 * deltaY;
                $this.draw();
            });

            $this.canvas.click($this.click);

            $this.draw();
        };

        $this.resize = function () {
            if (!$this.canvas)
                return;

            $this.size.width = $this.canvas.width();
            $this.size.height = $this.canvas.height();
            $this.draw();
        }

        $this.draw = function () {
            if (!($viewerFile.loaded && $this.canvas))
                return;

            $this.ctx.fillStyle = "#f7f7f7";
            $this.ctx.fillRect(0, 0, $this.size.width, $this.size.height);

            $this.ctx.font = "11px Arial";

            for (var i=0; i < Object.keys($viewerFile.objects).length; i++) {
                var obj = $viewerFile.objects[i];

                var selected = false;
                if ($this.selectedObject == obj)
                    selected = true;

                switch (obj.$shape) {
                    case $this.SHAPE.CIRCLE:
                        var pos = $this.posToScreen({x: obj.x, y: obj.y}),
                            radius = obj.radius * $this.zoom,
                            angle = Math.atan2(-obj.sin, obj.cos);

                        if (angle < 0)
                            angle += 2*Math.PI;

                        if (!selected)
                            $this.ctx.strokeStyle = "#000000";
                        else
                            $this.ctx.strokeStyle = "#ff0000";
                        $this.ctx.lineWidth = 1;

                        $this.ctx.beginPath();
                        $this.ctx.arc(pos.x, pos.y, radius, 0, 2*Math.PI);
                        $this.ctx.stroke();

                        if (obj.$name.substring(0,5) === 'robot') {
                            $this.ctx.beginPath();
                            $this.ctx.moveTo(pos.x, pos.y);
                            $this.ctx.lineTo(pos.x + (obj.cos * radius), pos.y - (obj.sin * radius));
                            $this.ctx.stroke();

                            if (typeof obj.sensors !== 'undefined') {
                                $this.ctx.strokeStyle = "rgba(255,0,255,0.8)";
                                $this.ctx.lineWidth = 2;

                                // IR
                                for (var j=0; j<8; j++) {
                                    if ((obj.sensors & Math.pow(2, j)) != 0) {
                                        var s = angle + $this.PROXIMITY_ANGLES[j];
                                        $this.ctx.beginPath();
                                        $this.ctx.arc(pos.x, pos.y, radius-(0.01*$this.zoom), s-(Math.PI/16), s+(Math.PI/16));
                                        $this.ctx.stroke();
                                    }
                                }

                                // camera
                                if ( ((obj.sensors & 256) != 0) || ((obj.sensors & 1024) != 0) ) {
                                    $this.ctx.fillStyle = "rgba(0,255,0,0.05)";
                                    $this.ctx.beginPath();
                                    $this.ctx.moveTo(pos.x, pos.y);
                                    $this.ctx.arc(pos.x, pos.y, radius+(0.385*$this.zoom), angle, angle + 1.2566370614359172);
                                    $this.ctx.fill();
                                }

                                if ( ((obj.sensors & 512) != 0) || ((obj.sensors & 2048) != 0) ) {
                                    $this.ctx.fillStyle = "rgba(0,255,0,0.05)";
                                    $this.ctx.beginPath();
                                    $this.ctx.moveTo(pos.x, pos.y);
                                    $this.ctx.arc(pos.x, pos.y, radius+(0.385*$this.zoom), angle - 1.2566370614359172, angle);
                                    $this.ctx.fill();
                                }
                            }

                            if (typeof obj.front_led !== 'undefined') {
                                $this.ctx.strokeStyle = "#0000ff";
                                $this.ctx.strokeStyle = "rgba(0,0,255,0.3)";
                                $this.ctx.lineWidth = 3;

                                if (obj.front_led > 0.5) {
                                    var s = angle - (Math.PI / 2);
                                    $this.ctx.beginPath();
                                    $this.ctx.arc(pos.x, pos.y, radius+(0.01*$this.zoom), s, (s+Math.PI));
                                    $this.ctx.stroke();
                                }
                            }

                            if (typeof obj.rear_led !== 'undefined') {
                                $this.ctx.strokeStyle = "#ff0000";
                                $this.ctx.strokeStyle = "rgba(255,0,0,0.3)";
                                $this.ctx.lineWidth = 3;

                                if (obj.rear_led > 0.5) {
                                    var s = Math.PI + angle - (Math.PI / 2);
                                    $this.ctx.beginPath();
                                    $this.ctx.arc(pos.x, pos.y, radius+(0.01*$this.zoom), s, (s+Math.PI));
                                    $this.ctx.stroke();
                                }
                            }
                        }

                        break;

                    case $this.SHAPE.RECTANGLE:
                        var pos = $this.posToScreen({x: obj.x, y: obj.y}),
                            width = obj.width * $this.zoom,
                            height = obj.height * $this.zoom;

                        pos.x -= width / 2;
                        pos.y -= height / 2;

                        if (!selected)
                            $this.ctx.strokeStyle = "#000000";
                        else
                            $this.ctx.strokeStyle = "#ff0000";
                        $this.ctx.lineWidth = 1;

                        $this.ctx.beginPath();
                        $this.ctx.rect(pos.x,pos.y, width, height);
                        $this.ctx.stroke();
                        break;
                }
            }

            $this.drawInfo();
        };

        $this.drawInfo = function () {
            var x = $this.size.width - 190 - 20,
                y = 20;

            $this.ctx.fillStyle = "#e7e7e7";
            $this.ctx.fillRect(x, y, 190, 300);

            $this.ctx.fillStyle = "#000000";
            var obj = $this.selectedObject;
            if (obj) {
                $this.ctx.fillText("name = " + obj.$name, x+5, y+12);
                y += 14;

                for (var i=0; i < Object.keys(obj.$properties).length; i++) {
                    $this.ctx.fillText(obj.$properties[i] + " = " + obj[obj.$properties[i]], x+5, y+12);
                    y += 14;
                }
            }
        };

        $this.click = function (event) {
            for (var i=0; i < Object.keys($viewerFile.objects).length; i++) {
                var obj = $viewerFile.objects[i];

                if (obj.$name.substring(0,5) !== 'robot')
                    continue;

                if (obj.$shape == $this.SHAPE.CIRCLE) {
                    var pos = $this.posToScreen({x: obj.x, y: obj.y}),
                        radius = obj.radius * $this.zoom;

                    if ( Math.pow(event.offsetX - pos.x, 2) +
                         Math.pow(event.offsetY - pos.y, 2) <=
                         Math.pow(radius, 2) ) {

                        $this.selectedObject = obj;
                        $this.draw();
                        return;
                    }
                }
            }

            $this.selectedObject = null;
        };

        $this.play = function() {
            if (!$viewerFile.loaded)
                return;

            // if ended, then rewind
            if ($viewerFile.currentStep == $viewerFile.lastStep)
                $this.rewind(false);

            $this.playing = true;
            $rootScope.$broadcast('$viewerPlaybackStart');

            $this.loop();
        };

        $this.pause = function () {
            if ($this.playing) {
                $this.playing = false;
                $rootScope.$broadcast('$viewerPlaybackPause');
            }
        };

        $this.playPause = function() {
            if (!$viewerFile.loaded)
                return;

            if ($this.playing)
                $this.pause();
            else
                $this.play();
        };

        $this.rewind = function (redraw) {
            $viewerFile.offset = 5;
            $viewerFile.currentStep = $viewerFile.firstStep;
            $this.clock = 0;

            if ((typeof redraw === 'undefined') || redraw)
                $this.draw();

            $rootScope.$broadcast('$viewerClockUpdate', $this.clock);
        };

        $this.loop = function () {
            function loop () {
                if ((!$viewerFile.loaded) || (!$this.playing))
                    return;

                if ($viewerFile.currentStep >= $viewerFile.lastStep)
                    $rootScope.$apply(function () {
                        $this.pause();
                    });

                $viewerFile.step();
                $this.draw();

                $rootScope.$apply(function () {
                    $this.clock = Math.ceil($viewerFile.currentStep / $viewerFile.stepRate);
                    $this.progress = $this.clock / $viewerFile.secondsLength;
                });

                setTimeout(loop, Math.floor((1/$viewerFile.stepRate) / $this.speed * 1000));
            };
            setTimeout(loop, 1);
        };

        $this.load = function (arraybuffer) {
            if ((typeof arraybuffer != 'object') || (arraybuffer.constructor != ArrayBuffer))
                throw "Error! Call to function load with invalid parameter type (expected an ArrayBuffer).";


            $this.pause();

            $viewerFile.load(arraybuffer);
            $this.speed = 1.0;
            $this.clock = 0;
            $this.progress = 0;
            $this.length = $viewerFile.secondsLength;
            $this.selectedObject = null;
            $this.draw();

            $rootScope.$broadcast('$viewerClockUpdate', $this.clock);
        };
    }).

    service('$viewerFile', function () {
        var $this = this;

        $this.OP_V1 = {
            TYPE: 0x00,
            POS: 0x01,
            RADIUS: 0x02,
            ORIENTATION: 0x03,
            SIZE: 0x04,
            OPT1: 0x05,
            OPT2: 0x06
        };

        $this.TYPE_V1 = {
            CIRCLE: 0x00,
            SQUARE: 0x01
        };

        $this.OP = {
            CREATE_OBJ: 0xE0,
            CREATE_PROP: 0xE1,
            SET_UINT: 0xD0,
            SET_INT: 0xD1,
            SET_FLOAT: 0xD2,
            SET_STRING: 0xD3
        };

        $this.SHAPE = {
            CIRCLE: 0xC0,
            RECTANGLE: 0xC1,
            POLYGON: 0xC2
        };

        $this.loaded = false;

        $this.load = function(arraybuffer) {
            if ((typeof arraybuffer != 'object') || (arraybuffer.constructor != ArrayBuffer))
                throw "Error! Call to constructor with invalid parameter type (expected an ArrayBuffer).";

            var b;

            $this.buffer = new DataView(arraybuffer);
            $this.offset = 0;
            $this.objects = {};

            var h1 = $this.readByte(false),
                h2 = $this.readByte(false),
                h3 = $this.readByte(false),
                S = 'S'.charCodeAt(0),
                R = 'R'.charCodeAt(0);

            if ((h1 != S) || (h2 != R) || (h3 != S))
                throw "Error! Invalid or corrupted file.";

            $this.version = $this.readByte(false);
            $this.stepRate = $this.readByte(false);

            if ($this.version == 3) {
                $this.headerParser = $this.headerParserVersion3;
                $this.parser = $this.parserVersion3;
            }
            else if (($this.version >= 1) && ($this.version <= 2)) {
                $this.headerParser = null;
                $this.parser = $this.parserVersion1;
            }
            else
                throw "Error! File version not supported.";

            $this.lastStep = null;
            var tmpOffset = $this.offset;
            $this.offset = $this.buffer.byteLength - 1;
            while ($this.offset > 0) {
                b = $this.buffer.getUint8($this.offset--);
                if ((b == 0xF1) || (b == 0xF1)) {
                    b = $this.buffer.getUint8($this.offset--);

                    if (b == 0xFF) {
                        b = $this.buffer.getUint8($this.offset--);

                        if (b != 0xFF) {
                            $this.offset += 4;
                            $this.lastStep = $this.readUint();
                            break;
                        }
                    }
                }
            }
            $this.offset = tmpOffset;

            if ($this.lastStep == null)
                throw "Error! No steps found on the file.";

            $this.stepLength = $this.lastStep + 1;
            $this.milisecondsLength = Math.ceil(($this.stepLength * 1000) / $this.stepRate);
            $this.secondsLength = Math.ceil($this.stepLength / $this.stepRate);

            if ($this.headerParser)
                $this.headerParser();

            if (!$this.seekToKeystep())
                throw "Error! No keysteps found on the file.";

            $this.currentStep = $this.readUint();
            $this.firstStep = $this.currentStep;

            if ($this.firstStep != 0)
                console.warn('Warning! First step # is not zero.');

            $this.parser();
            $this.loaded = true;
        };

        $this.step = function () {
            if (!$this.buffer)
                return;

            $this.seekToStep();
            $this.currentStep = $this.readUint()
            $this.parser();
        };

        $this.hasBytes = function () {
            if (!$this.buffer)
                return false;

            return $this.offset < ($this.buffer.byteLength - 1);
        };

        $this.readByte = function (escape) {
            if (!$this.buffer)
                throw "File not loaded!";

            if (typeof escape === 'undefined')
                escape = true;

            var r = $this.buffer.getUint8($this.offset++);

            if ((!escape) || (r != 0xFF))
                return r;
            else
                return $this.buffer.getUint8($this.offset++);
        };

        $this.readUint = function (escape) {
            if (!$this.buffer)
                throw "File not loaded!";

            if (typeof escape === 'undefined')
                escape = true;

            if (!escape) {
                var r = $this.buffer.getUint32($this.offset);
                $this.offset += 4;
                return r;
            }

            var ab = new ArrayBuffer(4),
                dv = new DataView(ab);

            dv.setUint8(0, $this.readByte());
            dv.setUint8(1, $this.readByte());
            dv.setUint8(2, $this.readByte());
            dv.setUint8(3, $this.readByte());

            return dv.getUint32(0);
        };

        $this.readInt = function (escape) {
            if (!$this.buffer)
                throw "File not loaded!";

            if (typeof escape === 'undefined')
                escape = true;

            if (!escape) {
                var r = $this.buffer.getInt32($this.offset);
                $this.offset += 4;
                return r;
            }

            var ab = new ArrayBuffer(4),
                dv = new DataView(ab);

            dv.setUint8(0, $this.readByte());
            dv.setUint8(1, $this.readByte());
            dv.setUint8(2, $this.readByte());
            dv.setUint8(3, $this.readByte());

            return dv.getInt32(0);
        };

        $this.readShort = function (escape) {
            if (!$this.buffer)
                throw "File not loaded!";

            if (typeof escape === 'undefined')
                escape = true;

            if (!escape) {
                var r = $this.buffer.getUint16($this.offset);
                $this.offset += 2;
                return r;
            }

            var ab = new ArrayBuffer(2),
                dv = new DataView(ab);

            dv.setUint8(0, $this.readByte());
            dv.setUint8(1, $this.readByte());

            return dv.getUint16(0);
        };

        $this.readFloat = function (escape) {
            if (!$this.buffer)
                throw "File not loaded!";

            if (typeof escape === 'undefined')
                escape = true;

            if (!escape) {
                var r = $this.buffer.getFloat32($this.offset);
                $this.offset += 4;
                return r;
            }

            var ab = new ArrayBuffer(4),
                dv = new DataView(ab);

            dv.setUint8(0, $this.readByte());
            dv.setUint8(1, $this.readByte());
            dv.setUint8(2, $this.readByte());
            dv.setUint8(3, $this.readByte());

            return dv.getFloat32(0);
        };

        $this.readString = function (escape) {
            if (!$this.buffer)
                throw "File not loaded!";

            if (typeof escape === 'undefined')
                escape = true;

            var r, str = '';

            while ($this.offset < ($this.buffer.byteLength - 1)) {
                r = $this.buffer.getUint8($this.offset++);
                if (escape && (r == 0xFF))
                    r = $this.buffer.getUint8($this.offset++);

                if (r == 0x00)
                    break;

                str += String.fromCharCode(r);
            }

            return str;
        };

        $this.seekToKeystep = function () {
            if (!$this.buffer)
                throw "File not loaded!";

            var b;

            while ($this.offset < ($this.buffer.byteLength - 1)) {
                b = $this.readByte(false);
                if (b == 0xFF) {
                    b = $this.readByte(false);
                    if (b == 0xF0)
                        return true;
                }
            }

            return false;
        };

        $this.seekToStep = function () {
            if (!$this.buffer)
                throw "File not loaded!";

            var b;

            while ($this.offset < ($this.buffer.byteLength - 1)) {
                b = $this.readByte(false);
                if (b == 0xFF) {
                    b = $this.readByte(false);
                    if ((b == 0xF0) || (b == 0xF1))
                        return true;
                }
            }

            return false;
        };

        $this.parserVersion1 = function () {
            if (!$this.buffer)
                throw "File not loaded!";

            var op, id;

            while ($this.offset < ($this.buffer.byteLength - 1)) {
                op = $this.buffer.getUint8($this.offset);
                if (op == 0xFF)
                    break;

                $this.offset++;

                id = $this.readShort();

                if (!$this.objects.hasOwnProperty(id)) {
                    $this.objects[id] = {
                        $properties: {},
                        $shape: 0x00,
                        $name: 'object'+id.toString()
                    };
                }

                switch (op) {
                    case $this.OP_V1.TYPE:
                        var type = $this.readByte();

                        if (type == $this.TYPE_V1.CIRCLE)
                            $this.objects[id].$shape = $this.SHAPE.CIRCLE;
                        else if (type == $this.TYPE_V1.SQUARE)
                            $this.objects[id].$shape = $this.SHAPE.RECTANGLE;

                        break;
                    case $this.OP_V1.POS:
                        $this.objects[id].x = $this.readFloat();
                        $this.objects[id].y = $this.readFloat();
                        break;
                    case $this.OP_V1.RADIUS:
                        $this.objects[id].radius = $this.readFloat();
                        break;
                    case $this.OP_V1.ORIENTATION:
                        $this.objects[id].sin = $this.readFloat();
                        $this.objects[id].cos = $this.readFloat();
                        break;
                    case $this.OP_V1.SIZE:
                        $this.objects[id].width = $this.readFloat();
                        $this.objects[id].height = $this.readFloat();
                        break;
                    case $this.OP_V1.OPT1:
                        $this.objects[id].fitness = $this.readFloat();
                        break;
                    case $this.OP_V1.OPT2:
                        $this.objects[id].energy = $this.readFloat();
                        break;

                    default:
                        throw "Error! Invalid or corrupted file (invalid operation code '0x"+op.toString(16)+"')."
                }
            }
        };

        $this.headerParserVersion3 = function () {
            if (!$this.buffer)
                throw "File not loaded!";

            var op, id;

            while ($this.offset < ($this.buffer.byteLength - 1)) {
                op = $this.buffer.getUint8($this.offset);
                if (op == 0xFF)
                    break;

                $this.offset++;

                id = $this.readShort();

                switch (op) {
                    case $this.OP.CREATE_OBJ:
                        $this.objects[id] = {
                            $properties: {},
                            $shape: $this.readByte(),
                            $name: $this.readString()
                        };
                        break;
                    case $this.OP.CREATE_PROP:
                        $this.objects[id].$properties[$this.readShort()] = $this.readString();
                        break;

                    default:
                        throw "Error! Invalid or corrupted file (invalid operation code '0x"+op.toString(16)+"')."
                }
            }
        };

        $this.parserVersion3 = function () {
            if (!$this.buffer)
                throw "File not loaded!";

            var op, id, prop_id;

            while ($this.offset < ($this.buffer.byteLength - 1)) {
                op = $this.buffer.getUint8($this.offset);
                if (op == 0xFF)
                    break;

                $this.offset++;

                id = $this.readShort();
                prop_id = $this.readShort();

                switch (op) {
                    case $this.OP.SET_UINT:
                        $this.set_prop(id, prop_id, $this.readUint());
                        break;
                    case $this.OP.SET_INT:
                        $this.set_prop(id, prop_id, $this.readInt());
                        break;
                    case $this.OP.SET_FLOAT:
                        $this.set_prop(id, prop_id, $this.readFloat());
                        break;
                    case $this.OP.SET_STRING:
                        $this.set_prop(id, prop_id, $this.readString());
                        break;

                    default:
                        throw "Error! Invalid or corrupted file (invalid operation code '0x"+op.toString(16)+"')."
                }
            }
        };

        $this.set_prop = function (id, prop_id, value) {
            $this.objects[id][$this.objects[id].$properties[prop_id]] = value;
        };
    });
