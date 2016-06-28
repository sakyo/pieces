'use strict';

module.exports = logrequest;

let chalk = require('chalk');
let logger;
/**
 * Add request log
 *
 * @return {Function}
 * @api public
 */

function logrequest() {
    return function *performance(next){
        logger = this.logger || console;
        let start = new Date;
        logger.info('<-- %s %s', this.method, this.originalUrl);
        try {
            yield next;
        } catch (err) {
            // log uncaught downstream errors
            log(this, start, null, err);
            throw err;
        }
        let length = this.response.length;
        log(this, start, length, null, 'close');
    }
}

var colorCodes = {
    5: 'red',
    4: 'yellow',
    3: 'cyan',
    2: 'green',
    1: 'green'
};

function log(ctx, start, len, err, event) {
    // get the status code of the response
    var status = err
        ? (err.status || 500)
        : (ctx.status || 404);

    // set the color of the status code;
    var s = status / 100 | 0;
    var color = colorCodes[s];

    // get the human readable response length
    let length = len;
    if (~[204, 205, 304].indexOf(status)) {
        length = '';
    } else if (null == len) {
        length = '-';
    }

    var upstream = err ? 'xxx': '-->'

    logger.info(upstream + ' %s %s %s %s %s',
        ctx.method,
        ctx.originalUrl,
        status,
        time(start),
        length);
}

/**
 * Show the response time in a human readable format.
 * In milliseconds if less than 10 seconds,
 * in seconds otherwise.
 */

function time(start) {
    var delta = new Date - start;
    delta = delta < 10000
        ? delta + 'ms'
        : Math.round(delta / 1000) + 's';
    return delta;
}
