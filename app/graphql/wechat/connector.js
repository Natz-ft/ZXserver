'use strict';

const md5 = require('md5');
const xml2js = require('xml2js');
const wechatUtil = require('../../util/wechat');
const { ErrorCode, Role, Source } = require('../../util/constant');

const _getUnionId = (appId, sessionKey, cryptoData) => {
  const data = wechatUtil.decryptData(appId, sessionKey, cryptoData.encryptedData, cryptoData.iv);
  return data.unionId;
};

class WechatConnector {
  constructor(ctx) {
    this.ctx = ctx;
  }

  async getOpenId(code) {
    const { ctx } = this;
    try {
      const oauth = await ctx.service.wechat.getWechatOauth(code);
      return oauth.openid;
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async loginIn(cryptoData, userInfo) {
    const { ctx } = this;
    try {
      const wechatOauth = await ctx.service.wechat.getWechatOauth(cryptoData.code);
      const dbOauth = await ctx.service.wechat.getWechatOauthFromDB(wechatOauth.openid);
      let memberId;
      if (dbOauth) {
        memberId = dbOauth.Member_id;
      } else {
        memberId = await ctx.service.member.registerMember(userInfo);
        await ctx.service.wechat.bindWechat(memberId, _getUnionId(ctx.app.config.wechat.appid, wechatOauth.session_key, cryptoData), wechatOauth.openid);
      }
      ctx.set('token', ctx.helper.createToken(Role.MEMBER, 0, memberId, Source.WEAPP));
      return await ctx.service.member.queryMemberById(memberId);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async bindOauth(cryptoData, memberId) {
    const { ctx } = this;
    let wechatOauth;
    let dbOauth;
    try {
      wechatOauth = await ctx.service.wechat.getWechatOauth(cryptoData.code);
      dbOauth = await ctx.service.wechat.getWechatOauthFromDB(wechatOauth.openid);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (dbOauth) {
      if (dbOauth.Member_id !== memberId) {
        ctx.helper.errorLog(ctx, ErrorCode.wechat.WECHAT_HAS_BEEN_BIND, { dbOauth, memberId });
      }
    } else {
      try {
        await ctx.service.wechat.bindWechat(memberId, _getUnionId(ctx.app.config.wechat.appid, wechatOauth.session_key, cryptoData), wechatOauth.openid);
      } catch (e) {
        ctx.logger.error(e);
        throw e;
      }
    }
    return memberId;
  }

  async payUnifiedOrder(openId, orderId) {
    const { ctx } = this;
    const wechatConfig = ctx.app.config.wechat;
    let order;
    try {
      order = await ctx.service.wechat.getOrderUnified(orderId);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (!order) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_NOT_EXIST, { openId, orderId });
    }
    if (order.deleteTag === 1) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_INVALID, { openId, orderId, order });
    }
    let prepay_id;
    let data;
    try {
      data = (await ctx.service.wechat.unifiedPayOrder(order, openId)).data;
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    xml2js.parseString(data, { explicitArray: false }, (error, result) => {
      if (error) {
        ctx.logger.error(error);
        throw error;
      }
      prepay_id = result.xml.prepay_id;
    });
    if (!prepay_id) {
      ctx.helper.errorLog(ctx, ErrorCode.wechat.CALL_PAY_FAILED, { openId, orderId });
    } else {
      try {
        await ctx.service.order.updateOrderPrepayId(orderId, prepay_id);
      } catch (e) {
        ctx.logger.error(e);
        throw e;
      }
      const timeStamp = new Date().getTime();
      const nonceStr = ctx.helper.createNonceStr();
      const packageStr = `prepay_id=${prepay_id}`;
      const paySign = md5(wechatUtil.sortQueryString({
        appId: wechatConfig.appid,
        timeStamp,
        nonceStr,
        package: packageStr,
        signType: wechatConfig.signType,
        key: wechatConfig.key,
      }))
        .toUpperCase();
      const result = {
        timeStamp,
        nonceStr,
        package: packageStr,
        signType: wechatConfig.signType,
        paySign,
      };
      ctx.logger.info(result);
      return result;
    }
  }
}

module.exports = WechatConnector;
