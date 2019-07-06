'use strict';

const Service = require('egg').Service;

const _getAccessToken = async ctx => {
  const { app } = ctx;
  const guojiaConfig = app.config.guojia;
  try {
    let accessToken = await app.redis.get('db0').get('accessToken:guojia');
    if (!accessToken) {
      const result = await ctx.curl('http://ops.huohetech.com/login', {
        method: 'POST',
        contentType: 'json',
        dataType: 'json',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          version: guojiaConfig.version,
          s_id: guojiaConfig.s_id,
        },
        data: {
          account: guojiaConfig.account,
          password: guojiaConfig.password,
        },
      });
      const data = result.data.data;
      accessToken = data.access_token;
      app.redis.get('db0').set('accessToken:guojia', accessToken, 'EX', data.expires_second);
    }
    return accessToken;
  } catch (e) {
    ctx.logger.error(e);
    throw e;
  }
};

class GuojiaService extends Service {
  async openLock(lockIP) {
    const { ctx, app } = this;
    const guojiaConfig = app.config.guojia;
    try {
      const result = await ctx.curl('http://ops.huohetech.com:80/lock/remote_open', {
        method: 'POST',
        contentType: 'json',
        dataType: 'json',
        headers: {
          'Content-Type': 'application/json;charset=utf-8',
          'Cache-Control': 'no-cache',
          version: guojiaConfig.version,
          s_id: guojiaConfig.s_id2,
          access_token: await _getAccessToken(ctx),
        },
        data: {
          lock_no: lockIP,
          pwd_user_mobile: guojiaConfig.pwd_user_mobile,
          pwd_user_name: guojiaConfig.pwd_user_name,
        },
      });
      const data = result.data;
      console.log(data);
      return data.rlt_code === 'HH0000';
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }
}

module.exports = GuojiaService;
