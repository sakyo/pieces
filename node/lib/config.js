'use strict';

const fs = require('fs');
const path = require('path');

function appendRoot(obj, root) {
    Object.keys(obj).forEach((_path) => {
        let value = obj[_path];
        if (typeof value === 'string' && value.match(/^\.{1,2}\//)) {
            obj[_path] = path.join(root, value);
        }
    });
}

// 服务器的默认配置
const CONFIGS = {
    // 应用的根目录
    APP_ROOT: '',
    // 服务器配置文件
    SERVER_CONFIG_FILE: './config/server.js',
    // 服务器默认配置
    SERVER_CONFIG: {
        name: 'pieces-server',
        port: 80,
        env: process.env.NODE_ENV || 'development'
    },
    // log配置文件
    LOG_CONFIG_FILE: './config/log.js',
    // log存储目录
    LOG_DIR: '/data/applogs/',
    // action目录
    ACTION_DIR: './apps/',
    /**
     * @func
     * @desc 初始化server配置
     * @param {object} options - 配置项
     * @param {string} options.appRoot — 应用根目录
     * @returns {object} 返回server配置
     */
    initServerConfig: (function() {
        let hasInit = false;
        return function(options) {
            if (!hasInit) {
                hasInit = true;
                let appRoot = options.appRoot || process.cwd();
                // 在所有的路径前面加上root
                this.APP_ROOT = appRoot;
                appendRoot(this, appRoot);
                // 尝试读取server配置，没有则用默认的
                let serverConfigFile = this.SERVER_CONFIG_FILE;
                // 读取server配置文件
                if (!fs.existsSync(serverConfigFile)) {
                    console.warn('Server config file "' + serverConfigFile + '" not found! Use default config instead!');
                } else {
                    this.SERVER_CONFIG = Object.assign(this.SERVER_CONFIG, require(serverConfigFile));
                }
            }
            return this.SERVER_CONFIG;
        }
    })()
};

module.exports = CONFIGS;
