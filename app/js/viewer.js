'use strict';

angular.module('solace.viewer', []).
    directive('solViewer', function ($viewer) {
        return function (scope, element, attrs) {
            $viewer.bind(element);
        }
    }).

    service('$viewer', function ($rootScope, $viewerFile) {
        this.TYPE = {
            CIRCLE: 0x00,
            SQUARE: 0x01
        };

        this.zoom = 250;
        this.playing = false;
        this.canvas = null;

        this.size = {width: null, height: null};

        this.posToScreen = function (pos) {
            var self = this;
            var res = {x: pos.x * self.zoom, y: (-pos.y) * self.zoom };
            res.x += self.size.width / 2;
            res.y += self.size.height / 2;
            return res;
        };

        this.bind = function (element) {
            var self = this;

            self.canvas = element;
            self.size.width = element.width();
            self.size.height = element.height();
            self.ctx = self.canvas.get(0).getContext("2d");
            
            self.canvas.mousewheel(function (event, delta, deltaX, deltaY) {
                self.zoom += 10 * deltaY;
                self.draw();
            });

            self.draw();
        };

        this.draw = function () {
            var self = this;

            if (!($viewerFile.loaded && self.canvas))
                return;

            self.ctx.fillStyle = "#f7f7f7";
            self.ctx.fillRect(0, 0, self.size.width, self.size.height);

            for (var i=0; i < Object.keys($viewerFile.objects).length; i++) {
                var obj = $viewerFile.objects[i];

                switch (obj.type) {
                    case self.TYPE.CIRCLE:
                        var pos = self.posToScreen(obj.pos),
                            radius = obj.radius * self.zoom;

                        self.ctx.beginPath();
                        self.ctx.arc(pos.x,pos.y, radius, 0, 2*Math.PI, true);
                        self.ctx.stroke();
                        break;

                    case self.TYPE.SQUARE:
                        var pos = self.posToScreen(obj.pos),
                            width = obj.width * self.zoom,
                            height = obj.height * self.zoom;

                        pos.x -= width / 2;
                        pos.y -= height / 2;

                        self.ctx.beginPath();
                        self.ctx.rect(pos.x,pos.y, width, height);
                        self.ctx.stroke();
                        break;
                }
            }
        };

        this.play = function() {
            var self = this;

            if (!$viewerFile.loaded)
                return;

            // if ended, then rewind
            if ($viewerFile.currentStep == $viewerFile.lastStep)
                self.rewind(false);

            self.playing = true;
            $rootScope.$apply(function () {
                $rootScope.$broadcast('$viewerPlaybackStart');
            });

            self.loop();
        };

        this.pause = function () {
            var self = this;

            if (self.playing) {
                self.playing = false;
                $rootScope.$apply(function () {
                    $rootScope.$broadcast('$viewerPlaybackPause');
                });
            }
        };

        this.playPause = function() {
            var self = this;

            if (!$viewerFile.loaded)
                return;

            if (self.playing)
                self.pause();
            else
                self.play();
        };

        this.rewind = function (redraw) {
            $viewerFile.offset = 5;
            $viewerFile.currentStep = $viewerFile.firstStep;
            self.clock = 0;

            if ((typeof redraw === 'undefined') || redraw)
                self.draw();

            $rootScope.$apply(function () {
                $rootScope.$broadcast('$viewerClockUpdate', self.clock);
            });
        };

        this.loop = function () {
            var self = this;

            (function loop () {
                if ((!$viewerFile.loaded) || (!self.playing))
                    return;

                if ($viewerFile.currentStep >= $viewerFile.lastStep)
                    self.pause();

                $viewerFile.step();
                self.draw();

                var s = Math.ceil($viewerFile.currentStep / $viewerFile.stepRate);
                if (self.clock != s)
                    $rootScope.$apply(function () {
                        $rootScope.$broadcast('$viewerClockUpdate', s);
                    });
                self.clock = s

                setTimeout(loop, Math.floor(self.timeout * 1000));
            })();
        };

        this.load = function (arraybuffer) {
            var self = this;

            if ((typeof arraybuffer != 'object') || (arraybuffer.constructor != ArrayBuffer))
                throw "Error! Call to function load with invalid parameter type (expected an ArrayBuffer).";


            self.pause();

            $viewerFile.load(arraybuffer);
            self.timeout = (1/$viewerFile.stepRate);
            self.clock = 0;
            self.draw();

            $rootScope.$apply(function () {
                $rootScope.$broadcast('$viewerClockUpdate', self.clock);
            });
        };

        this.setSpeed = function (mult) {
            var self = this;

            if (typeof mult !== 'number')
                throw "Expected number but setSpeed got " + (typeof mult);

            self.timeout = (1/$viewerFile.stepRate) / mult;
        };

        this.getSecondsLength = function () {
            if (!$viewerFile.loaded)
                return 0;

            return $viewerFile.secondsLength;
        };
    }).

    service('$viewerFile', function () {
        this.OP = {
            TYPE: 0x00,
            POS: 0x01,
            RADIUS: 0x02,
            ORIENTATION: 0x03,
            SIZE: 0x04
        };

        this.loaded = false;

        this.load = function(arraybuffer) {
            if ((typeof arraybuffer != 'object') || (arraybuffer.constructor != ArrayBuffer))
                throw "Error! Call to constructor with invalid parameter type (expected an ArrayBuffer).";

            var b;

            this.buffer = new DataView(arraybuffer);
            this.offset = 0;
            this.objects = {};

            var h1 = this.readByte(false),
                h2 = this.readByte(false),
                h3 = this.readByte(false),
                S = 'S'.charCodeAt(0),
                R = 'R'.charCodeAt(0);

            if ((h1 != S) || (h2 != R) || (h3 != S))
                throw "Error! Invalid or corrupted file.";

            this.version = this.readByte(false);
            this.stepRate = this.readByte(false);

            if ((this.version < 1) || (this.version > 1))
                throw "Error! File version not supported.";

            this.lastStep = null;
            var tmpOffset = this.offset;
            this.offset = this.buffer.byteLength - 1;
            while (this.offset > 0) {
                b = this.buffer.getUint8(this.offset--);
                if ((b == 0xF1) || (b == 0xF1)) {
                    b = this.buffer.getUint8(this.offset--);

                    if (b == 0xFF) {
                        b = this.buffer.getUint8(this.offset--);

                        if (b != 0xFF) {
                            this.offset += 4;
                            this.lastStep = this.readInt();
                            break;
                        }
                    }
                }
            }
            this.offset = tmpOffset;

            if (this.lastStep == null)
                throw "Error! No steps found on the file.";

            this.stepLength = this.lastStep + 1;
            this.milisecondsLength = Math.ceil((this.stepLength * 1000) / this.stepRate);
            this.secondsLength = Math.ceil(this.stepLength / this.stepRate);

            if (!this.seekToKeystep())
                throw "Error! No keysteps found on the file.";

            this.currentStep = this.readInt();
            this.firstStep = this.currentStep;

            if (this.firstStep != 0)
                console.warn('Warning! First step # is not zero.');

            this.readOperations();
            this.loaded = true;
        };

        this.step = function () {
            if (!this.buffer)
                return;

            this.seekToStep();
            this.currentStep = this.readInt()
            this.readOperations();
        };

        this.hasBytes = function () {
            if (!this.buffer)
                return false;

            return this.offset < (this.buffer.byteLength - 1);
        };

        this.readByte = function (escape) {
            if (!this.buffer)
                throw "File not loaded!";

            if (typeof escape === 'undefined')
                escape = true;

            var r = this.buffer.getUint8(this.offset++);

            if ((!escape) || (r != 0xFF))
                return r;
            else
                return this.buffer.getUint8(this.offset++);
        };

        this.readInt = function (escape) {
            if (!this.buffer)
                throw "File not loaded!";

            if (typeof escape === 'undefined')
                escape = true;

            if (!escape) {
                var r = this.buffer.getUint32(this.offset);
                this.offset += 4;
                return r;
            }

            var ab = new ArrayBuffer(4),
                dv = new DataView(ab);

            dv.setUint8(0, this.readByte());
            dv.setUint8(1, this.readByte());
            dv.setUint8(2, this.readByte());
            dv.setUint8(3, this.readByte());

            return dv.getUint32(0);
        };

        this.readShort = function (escape) {
            if (!this.buffer)
                throw "File not loaded!";

            if (typeof escape === 'undefined')
                escape = true;

            if (!escape) {
                var r = this.buffer.getUint16(this.offset);
                this.offset += 2;
                return r;
            }

            var ab = new ArrayBuffer(2),
                dv = new DataView(ab);

            dv.setUint8(0, this.readByte());
            dv.setUint8(1, this.readByte());

            return dv.getUint16(0);
        };

        this.readFloat = function (escape) {
            if (!this.buffer)
                throw "File not loaded!";

            if (typeof escape === 'undefined')
                escape = true;

            if (!escape) {
                var r = this.buffer.getFloat32(this.offset);
                this.offset += 4;
                return r;
            }

            var ab = new ArrayBuffer(4),
                dv = new DataView(ab);

            dv.setUint8(0, this.readByte());
            dv.setUint8(1, this.readByte());
            dv.setUint8(2, this.readByte());
            dv.setUint8(3, this.readByte());

            return dv.getFloat32(0);
        };

        this.seekToKeystep = function () {
            if (!this.buffer)
                throw "File not loaded!";

            var b;

            while (this.offset < (this.buffer.byteLength - 1)) {
                b = this.readByte(false);
                if (b == 0xFF) {
                    b = this.readByte(false);
                    if (b == 0xF0)
                        return true;
                }
            }

            return false;
        };

        this.seekToStep = function () {
            if (!this.buffer)
                throw "File not loaded!";

            var b;

            while (this.offset < (this.buffer.byteLength - 1)) {
                b = this.readByte(false);
                if (b == 0xFF) {
                    b = this.readByte(false);
                    if ((b == 0xF0) || (b == 0xF1))
                        return true;
                }
            }

            return false;
        };

        this.readOperations = function () {
            if (!this.buffer)
                throw "File not loaded!";

            var op, id;

            while (this.offset < (this.buffer.byteLength - 1)) {
                op = this.buffer.getUint8(this.offset);
                if (op == 0xFF)
                    break;

                this.offset++;

                id = this.readShort();
                if (!this.objects.hasOwnProperty(id))
                    this.objects[id] = {};

                switch (op) {
                    case this.OP.TYPE:
                        this.objects[id].type = this.readByte();
                        break;
                    case this.OP.POS:
                        this.objects[id].pos = {x: this.readFloat(), y: this.readFloat()};
                        break;
                    case this.OP.RADIUS:
                        this.objects[id].radius = this.readFloat();
                        break;
                    case this.OP.ORIENTATION:
                        this.objects[id].sin = this.readFloat();
                        this.objects[id].cos = this.readFloat();
                        break;
                    case this.OP.SIZE:
                        this.objects[id].width = this.readFloat();
                        this.objects[id].height = this.readFloat();
                        break;
                    default:
                        throw "Error! Invalid or corrupted file (invalid operation code '0x"+op.toString(16)+"')."
                }
            }
        };
    });