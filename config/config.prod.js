'use strict';

module.exports = () => {
  const config = exports = {};

  exports.mysql = {
    // 单数据库信息配置
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
