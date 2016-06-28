'use strict';

const path = require('path');
const ls = require('ls-sync');
const route = require('koa-router')();
const rewrite = require('koa-rewrite');
const util = require('util');

module.exports = function(app, options) {
    if (typeof options === 'string') {
        options = { root: options };
    } else if (!options || !options.root) {
        throw new Error('`root` config required.');
    }
    let wildcard = options.wildcard || '*';
    let root = options.root;
    let logger = app.logger || console;

    ls(root).forEach(function(filePath) {
        let exportFuncs = require(filePath);
        let pathRegexp = formatPath(filePath, root, wildcard);
        for (let method in exportFuncs) {
            try {
                exportFuncs[method].pathRegexp = pathRegexp;
                route[method.toLowerCase()](pathRegexp, exportFuncs[method]);
                logger.info(util.format('add url [%s] %s', method, pathRegexp));
            } catch (e) {}
        }
    });
    app.use(route.routes()).use(route.allowedMethods());
    return function* frouter(next) {
        yield* next;
    };
};

function formatPath(filePath, root, wildcard) {
    return filePath
        .replace(root, '/')
        .replace(/\\/g, '/')
        .replace(new RegExp('/\\' + wildcard, 'g'), '/:')
        .split('.js')[0];
}
