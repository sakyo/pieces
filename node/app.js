'use strict';
const koa = require('koa');               // Koa framework
const body = require('koa-body');          // body parser
const compose = require('koa-compose');       // middleware composer
const compress = require('koa-compress');      // HTTP compression
const responseTime = require('koa-response-time'); // X-Response-Time middleware
const session = require('koa-session');       // session for passport login, flash messages
const co = require('co');

// self module
const config = require('./lib/config');
const logger = require('./lib/logger.js');
const router = require('./lib/router');
const performance = require('./lib/performance.js');

const app = module.exports = koa();

app.init = co.wrap(function* (options) {
    try {
        // 读取server配置
        const SERVER_CONFIG = config.initServerConfig({
            appRoot: options.appRoot
        });
        app.name = SERVER_CONFIG.name;
        app.env = SERVER_CONFIG.env;

        // 设置log
        app.use(logger.init(app));

        // log request
        app.use(performance());

        // return response time in X-Response-Time header
        app.use(responseTime());

        // HTTP compression
        app.use(compress());

        // parse request body into ctx.request.body
        app.use(body());

        // ues router
        app.use(router(app, {root: config.ACTION_DIR}));
    } catch (e) {
        let logger = app.logger || console;
        logger.error(e);
    }
});

//// session for passport login, flash messages
//app.keys = ['koa-sample-app'];
//app.use(session(app));
//
//// MySQL connection pool
//const config = require('./config/db-'+app.env+'.json');
//GLOBAL.connectionPool = mysql.createPool(config.db); // put in GLOBAL to pass to sub-apps
//
//// select sub-app (admin/api) according to host subdomain (could also be by analysing request.url);
//app.use(function* subApp(next) {
//    // use subdomain to determine which app to serve: www. as default, or admin. or api
//    const subapp = this.hostname.split('.')[0]; // subdomain = part before first '.' of hostname
//
//    switch (subapp) {
//        case 'admin':
//            yield compose(require('./apps/admin/app-admin.js').middleware);
//            break;
//        case 'api':
//            yield compose(require('./apps/api/app-api.js').middleware);
//            break;
//        case 'www':
//            yield compose(require('./apps/www/app-www.js').middleware);
//            break;
//        default: // no (recognised) subdomain? canonicalise host to www.host
//            // note switch must include all registered subdomains to avoid potential redirect loop
//            this.redirect(this.protocol+'://'+'www.'+this.host+this.path+this.search);
//            break;
//    }
//});

if (!module.parent) {
    /* eslint no-console: 0 */
    app.init({appRoot: __dirname});
    let port = config.SERVER_CONFIG.port || 80;
    app.listen(port);
    app.logger.info("Server start listen " + port + ' success!');
}

