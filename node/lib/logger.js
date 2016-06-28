'use strict';

const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');
const wloggers = require('winston').loggers;
const CONFIG = require('./config');

// 默认配置
const DEFAULT_LOG_CATEGORY = 'server';
const DEFAULT_LOG_FILE = DEFAULT_LOG_CATEGORY.toLowerCase() + '.log';
const DEFAULT_DATE_PATTERN = '.yyyy-MM-dd';
const DEFAULT_LOGGERS = {
    // server所有的日志
    [DEFAULT_LOG_CATEGORY]: {
        console: true,
        file: DEFAULT_LOG_FILE
    },
    // cat的日志
    Request: {
        console: true,
        file: 'access.log'
    },
    // pigeon的日志
    Service: {
        console: true,
        file: 'service.log'
    }
};

function timestamp() {
    return Date.now().toLocaleString();
}

function formatter(options) {
    return options.timestamp() + ' - ' + options.level + ': ' + (undefined !== options.message ? options.message : '') + (options.meta && Object.keys(options.meta).length ? '\n\t' + JSON.stringify(options.meta) : '');
}

class Logger {
    constructor(category, context) {
        this.category = category;
        this.wlogger = wloggers.get(category);
        this.context = context || null;
    }

    log(level, message) {
        let error, category = this.category, logger = this.wlogger, defaultLogger = wloggers.get(DEFAULT_LOG_CATEGORY);
        if(message instanceof Error) {
            error = message;
            message = message.stack || message.message || message.name || 'unkown error';
        }else {
            let meta = arguments[arguments.length-1];
            if(meta instanceof Error) {
                error = meta;
                message += '\n\t' + (meta.stack || meta.message || meta.name || 'unkown error');
            }
        }

        arguments[1] = '[' + category + '] ' + message;

        // 防止在console中输出两份一样的日志
        if (category !== DEFAULT_LOG_CATEGORY) {
            logger.log.apply(logger, arguments);
            defaultLogger.transports.console.silent = !logger.transports.console.silent;
        } else {
            defaultLogger.transports.console.silent = false;
        }

        // 所有的日志都会同步一份到默认日志里面
        defaultLogger.log.apply(defaultLogger, arguments);
    }
}

['info', 'warn', 'error'].forEach((level) => {
    Logger.prototype[level] = function() {
        Array.prototype.unshift.call(arguments, level);
        this.log.apply(this, arguments);
    };
});

class LoggerManager {
    constructor(context) {
        this.context = context;
        this.loggers = {};
    }
    getLogger(category) {
        if (!this.loggers[category] && LoggerManager.categories.indexOf(category) !== -1) {
            this.loggers[category] = new Logger(category, this.context);
        }

        return this.loggers[category] || this.loggers[DEFAULT_LOG_CATEGORY];
    }
    exports() {
        return {
            logger: this.getLogger(DEFAULT_LOG_CATEGORY),
            getLogger: this.getLogger.bind(this)
        }
    }
}
LoggerManager.categories = [];

function initWloggers() {
    let logDir = path.join(CONFIG.LOG_DIR, CONFIG.SERVER_CONFIG.name),
        configFile = CONFIG.LOG_CONFIG_FILE,
        configs,
        config;
    // 创建应用对应的logger目录
    mkdirp.sync(logDir);
    // 读取配置文件
    if (fs.existsSync(configFile)) {
        configs = require(configFile);
    }
    configs = Object.assign({}, configs, DEFAULT_LOGGERS);

    // 添加logger
    Object.keys(configs).forEach((category) => {
        config = configs[category];

        // type: console
        if (typeof config.console !== 'undefined') {
            // 生产环境不在console里面输出
            if (CONFIG.SERVER_CONFIG.env === 'production'  || config.console === false) {
                config.console = {
                    silent: true
                };
            } else {
                // 默认带颜色和时间戳
                config.console = Object.assign({
                    colorize: true,
                    timestamp: timestamp
                }, config.console);
            }
        }

        // type: file
        if (typeof config.file !== 'undefined') {
            if (config.file === true) {
                config.file = {
                    filename: path.join(logDir, category + '.log')
                };
            } else if (typeof config.file === 'string'){
                config.file = {
                    filename: path.join(logDir, config.file)
                };
            } else {
                config.file.filename = path.join(logDir, config.file.filename);
            }

            // 默认日志文件按天来存
            if (config.file.daily !== false) {
                config.dailyRotateFile = Object.assign({
                    datePattern: DEFAULT_DATE_PATTERN,
                    timestamp: timestamp,
                    json: false,
                    formatter: formatter
                }, config.file);

                delete config.file;
            } else {
                config.file = Object.assign({
                    timestamp: timestamp,
                    json: false,
                    formatter: formatter
                }, config.file);
            }
        }
        wloggers.add(category, config);
        LoggerManager.categories.push(category);
    });
}

function *middleware(next) {
    // 在中间件上挂带context的logger
    Object.assign(this, new LoggerManager(this).exports());
    yield next;
}

function init(app) {
    initWloggers();
    // 在app上挂不带context的logger
    Object.assign(app, new LoggerManager(app).exports());
    return middleware;
}

module.exports = {
    init: init
};