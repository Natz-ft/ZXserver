'use strict';

const { ErrorCode } = require('../../util/constant');

class SmsConnector {
  constructor(ctx) {
    this.ctx = ctx;
  }

  async sendMessageAndSave(phone) {
    const { ctx } = this;
    const smsConfig = ctx.app.config.sms;
    let data;
    try {
      data = await ctx.service.sms.getPhoneRedis(phone);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    let sms = [];
    if (data) {
      sms = JSON.parse(data);
      if (sms[sms.length - 1].time + smsConfig.resendTime > new Date().getTime()) {
        ctx.helper.errorLog(ctx, ErrorCode.sms.SEND_MESSAGE_NO_INTERVAL, { ip: ctx.request.ip, phone });
      }
    }
    const code = Math.random()
      .toString()
      .slice(2, 8);
    const s = {};
    s.code = code;
    s.time = new Date().getTime();
    sms.push(s);
    try {
      if (await this.ctx.service.sms.sendMessage(phone, code)) {
        await ctx.service.sms.savePhoneRedis(phone, sms);
        return smsConfig.resendTime;
      }
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    ctx.helper.errorLog(ctx, ErrorCode.sms.SEND_MESSAGE_FAILED, { phone, sms });
  }
}

module.exports = SmsConnector;
