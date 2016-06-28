'use strict';

// hello world
exports.get = exports.post = function* (next) {
    this.body = 'hello world';
};
