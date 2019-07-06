'use strict';

const Service = require('egg').Service;
const qs = require('querystring');

class SmsService extends Service {
  async getPhoneRedis(phone) {
    const { ctx, app } = this;
    try {
      return await app.redis.get('db0').get(`sms:${phone}`);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async delPhoneRedis(phone) {
    const { ctx, app } = this;
    try {
      return await app.redis.get('db0').del(`sms:${phone}`);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async savePhoneRedis(phone, sms) {
    const { ctx, app } = this;
    const smsConfig = app.config.sms;
    let result;
    try {
      result = await app.redis.get('db0').set(`sms:${phone}`, JSON.stringify(sms), 'EX', smsConfig.invalidTime / 1000);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (result !== 'OK') {
      ctx.logger.error('redis存储失败', { phone, sms });
      throw new Error('请求失败，请重试');
    }
  }

  async sendMessage(phone, code) {
    const { ctx, app } = this;
    const smsConfig = app.config.sms;
    const queryData = qs.stringify({
      mobile: phone,
      tpl_id: smsConfig.tplId,
      tpl_value: `#code#=${code}&#m#=${smsConfig.invalidTime / 60}`,
      key: smsConfig.appKey,
    });
    let result;
    try {
      result = await ctx.curl(`http://v.juhe.cn/sms/send?${queryData}`, { dataType: 'json' });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if ([ 205401, 205403, 205405 ].includes(result.data.error_code)) {
      ctx.logger.error(result.data.reason, { phone, result });
      throw new Error(result.data.reason);
    }
    return result.status === 200 && result.data.error_code === 0;
  }
}

module.exports = SmsService;
