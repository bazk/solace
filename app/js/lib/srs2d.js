var srs2d = srs2d || {};

(function($) {

    srs2d.OP = {
        TYPE: 0x00,
        POS: 0x01,
        RADIUS: 0x02,
        ORIENTATION: 0x03,
        SIZE: 0x04
    };

    srs2d.TYPE = {
        CIRCLE: 0x00,
        SQUARE: 0x01
    };

    srs2d.Viewer = function() {
        this.zoom = 250;
    };

    srs2d.Viewer.prototype.bind = function(element) {
        this.canvas = element;
        this.size = {width: element.width(), height: element.height()};
        this.ctx = this.canvas.get(0).getContext("2d");

        var self = this;
        this.canvas.mousewheel(function (event, delta, deltaX, deltaY) {
            self.zoom += 10 * deltaY;
            self.draw();
        });

        this.draw();
    };

    srs2d.Viewer.prototype.posToScreen = function(pos) {
        var res ={x: pos.x * this.zoom, y: (-pos.y) * this.zoom };

        res.x += this.size.width / 2;
        res.y += this.size.height / 2;

        return res;
    };

    srs2d.Viewer.prototype.draw = function() {
        if ((typeof this.curFile === 'undefined') || (typeof this.canvas === 'undefined'))
            return;

        //this.ctx.clearRect(0, 0, this.size.width, this.size.height);
        this.ctx.fillStyle = "#f7f7f7";
        this.ctx.fillRect(0, 0, this.size.width, this.size.height);

        for (var i=0; i < Object.keys(this.curFile.objects).length; i++) {
            var obj = this.curFile.objects[i];

            switch (obj.type) {
                case srs2d.TYPE.CIRCLE:
                    var pos = this.posToScreen(obj.pos),
                        radius = obj.radius * this.zoom;

                    this.ctx.beginPath();
                    this.ctx.arc(pos.x,pos.y, radius, 0, 2*Math.PI, true);
                    this.ctx.stroke();
                    break;

                case srs2d.TYPE.SQUARE:
                    var pos = this.posToScreen(obj.pos),
                        width = obj.width * this.zoom,
                        height = obj.height * this.zoom;

                    pos.x -= width / 2;
                    pos.y -= height / 2;

                    this.ctx.beginPath();
                    this.ctx.rect(pos.x,pos.y, width, height);
                    this.ctx.stroke();
                    break;
            }
        }

        // this.ctx.beginPath();
        // this.ctx.rect(10, this.size.height-26, this.size.width-20, 16);
        // this.ctx.stroke();
        // this.ctx.beginPath();
        // var pbsize = Math.ceil(this.curFile.current_step / this.curFile.last_step * (this.size.width-24));
        // this.ctx.rect(12, this.size.height-24, pbsize, 12);
        // this.ctx.fill();
    };

    srs2d.Viewer.prototype.load = function(arraybuffer) {
        if ((typeof arraybuffer != 'object') || (arraybuffer.constructor != ArrayBuffer))
            throw "Error! Call to function load with invalid parameter type (expected an ArrayBuffer).";

        this.curFile = new srs2d.SaveFile(arraybuffer);
        this.secondsLength = this.curFile.secondsLength;
        this.timeout = (1/this.curFile.step_rate);
        this.draw();
    };

    srs2d.Viewer.prototype.play = function() {
        if ((typeof this.curFile === 'undefined') || (typeof this.canvas === 'undefined'))
            return;

        this.doStop = false;

        if (this.curFile.current_step == this.curFile.last_step) {
            this.curFile.offset = 5;
            this.curFile.current_step = this.curFile.first_step;
        }

        var self = this;
        var loop = function () {
            self.curFile.step();
            self.draw();

            var s = Math.ceil(self.curFile.current_step / self.curFile.step_rate);
            if ((self.clock != s) && (self.clock_cb))
                self.clock_cb(s);
            self.clock = s

            if ((!self.doStop) && (self.curFile.current_step != self.curFile.last_step))
                setTimeout(loop, Math.floor(self.timeout * 1000));
        };
        setTimeout(loop, 1);
    };

    srs2d.Viewer.prototype.stop = function () {
        this.doStop = true;
    };

    srs2d.Viewer.prototype.setSpeed = function (mult) {
        if (typeof mult !== 'number')
            throw "setSpeed needs a number";

        this.timeout = (1/this.curFile.step_rate) / mult;
    };

    srs2d.Viewer.prototype.onClockUpdate = function (callback) {
        this.clock_cb = callback;
    };




    srs2d.SaveFile = function(arraybuffer) {
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
        this.step_rate = this.readByte(false);

        if ((this.version < 1) || (this.version > 1))
            throw "Error! File version not supported.";

        this.last_step = null;
        var tmp_offset = this.offset;
        this.offset = this.buffer.byteLength - 1;
        while (this.offset > 0) {
            b = this.buffer.getUint8(this.offset--);
            if ((b == 0xF1) || (b == 0xF1)) {
                b = this.buffer.getUint8(this.offset--);

                if (b == 0xFF) {
                    b = this.buffer.getUint8(this.offset--);

                    if (b != 0xFF) {
                        this.offset += 4;
                        this.last_step = this.readInt();
                        break;
                    }
                }
            }
        }
        this.offset = tmp_offset;

        if (this.last_step == null)
            throw "Error! No steps found on the file.";

        this.stepLength = this.last_step + 1;
        this.milisecondsLength = Math.ceil((this.stepLength * 1000) / this.step_rate);
        this.secondsLength = Math.ceil(this.stepLength / this.step_rate);

        if (!this.seekToKeystep())
            throw "Error! No keysteps found on the file.";

        this.current_step = this.readInt();
        this.first_step = this.current_step;

        if (this.first_step != 0)
            console.warn('Warning! First step # is not zero.');

        this.readOperations();
    };

    srs2d.SaveFile.prototype.step = function () {
        this.seekToStep();
        this.current_step = this.readInt()
        this.readOperations();
    };

    srs2d.SaveFile.prototype.hasBytes = function () {
        return this.offset < (this.buffer.byteLength - 1);
    };

    srs2d.SaveFile.prototype.readByte = function (escape) {
        if (typeof escape === 'undefined')
            escape = true;

        var r = this.buffer.getUint8(this.offset++);

        if ((!escape) || (r != 0xFF))
            return r;
        else
            return this.buffer.getUint8(this.offset++);
    };

    srs2d.SaveFile.prototype.readInt = function (escape) {
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

    srs2d.SaveFile.prototype.readShort = function (escape) {
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

    srs2d.SaveFile.prototype.readFloat = function (escape) {
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

    srs2d.SaveFile.prototype.seekToKeystep = function () {
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

    srs2d.SaveFile.prototype.seekToStep = function () {
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

    srs2d.SaveFile.prototype.readOperations = function () {
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
                case srs2d.OP.TYPE:
                    this.objects[id].type = this.readByte();
                    break;
                case srs2d.OP.POS:
                    this.objects[id].pos = {x: this.readFloat(), y: this.readFloat()};
                    break;
                case srs2d.OP.RADIUS:
                    this.objects[id].radius = this.readFloat();
                    break;
                case srs2d.OP.ORIENTATION:
                    this.objects[id].sin = this.readFloat();
                    this.objects[id].cos = this.readFloat();
                    break;
                case srs2d.OP.SIZE:
                    this.objects[id].width = this.readFloat();
                    this.objects[id].height = this.readFloat();
                    break;
                default:
                    throw "Error! Invalid or corrupted file (invalid operation code '0x"+op.toString(16)+"')."
            }
        }
    };

})(jQuery);