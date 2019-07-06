'use strict';

module.exports = () => {
  const config = exports = {};

  config.logger = {
    level: 'DEBUG',
    consoleLevel: 'DEBUG',
  };

  exports.mysql = {
    // 单数据库信息配置
   /**
    *     client: {
      // host
      host: '39.105.43.133',
      // 端口号
      port: '3306',
      // 用户名
      user: 'test',
      // 密码
      password: '113911',
      // 数据库名
      database: 'test',
    },
    */

    client: {
      // host
      host: '127.0.0.1',
      // 端口号
      port: '3306',
      // 用户名
      user: 'root',
      // 密码
      password: '970521',
      // 数据库名
      database: 'hotel',
    },
  };

  return config;
};
