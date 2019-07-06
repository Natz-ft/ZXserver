'use strict';

const Service = require('egg').Service;
const qs = require('querystring');
const rp = require('request-promise');
const mysqlUtil = require('../util/mysql');
const md5 = require('md5');
const fs = require('fs');
const dayjs = require('dayjs');
const wechatUtil = require('../util/wechat');
const xml2js = require('xml2js');

const _getAccessToken = async ctx => {
  const { app } = ctx;
  const wechatConfig = app.config.wechat;
  try {
    let accessToken = await app.redis.get('db0').get('accessToken:wechat');
    if (!accessToken) {
      const queryData = qs.stringify({
        grant_type: 'client_credential',
        appid: wechatConfig.appid,
        secret: wechatConfig.secret,
      });
      const result = await ctx.curl(`https://api.weixin.qq.com/cgi-bin/token?${queryData}`, { dataType: 'json' });
      accessToken = result.data.access_token;
      app.redis.get('db0').set('accessToken:wechat', accessToken, 'EX', result.data.expires_in);
    }
    return accessToken;
  } catch (e) {
    ctx.logger.error(e);
    throw e;
  }
};

const _requestOauth = async (ctx, code) => {
  const wechatConfig = ctx.app.config.wechat;
  const queryData = qs.stringify({
    appid: wechatConfig.appid,
    secret: wechatConfig.secret,
    js_code: code,
    grant_type: 'authorization_code',
  });
  try {
    const result = await ctx.curl(`https://api.weixin.qq.com/sns/jscode2session?${queryData}`, { dataType: 'json' });
    return result.data;
  } catch (e) {
    ctx.logger.error(e);
    throw e;
  }
};

class WechatService extends Service {
  async getWechatOauth(code) {
    const { ctx } = this;
    let oauth;
    try {
      oauth = await _requestOauth(ctx, code);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    for (let i = 0; i < 3; i++) {
      if (!oauth.session_key) {
        if (oauth.errcode === 40029) {
          ctx.logger.error('微信code无效', { code, oauth });
          throw new Error('code无效');
        }
        try {
          oauth = await _requestOauth(ctx, code);
        } catch (e) {
          ctx.logger.error(e);
          throw e;
        }
      } else {
        return oauth;
      }
    }
    ctx.logger.error('微信请求失败，请重试', { code, oauth });
    throw new Error('请求失败，请重试');
  }

  async getTempMedia(mediaId) {
    const { ctx } = this;
    try {
      const queryData = qs.stringify({
        access_token: await _getAccessToken(ctx),
        media_id: mediaId,
      });
      const res = await this.ctx.curl(`https://api.weixin.qq.com/cgi-bin/media/get?${queryData}`, {
        streaming: true,
      });
      const buffer = [];
      return new Promise(resolve => {
        res.res.on('data', chunk => {
          buffer.push(chunk);
        })
          .on('end', () => {
            resolve(Buffer.concat(buffer));
          });
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async getWechatOauthFromDB(openId) {
    const { ctx } = this;
    try {
      return await mysqlUtil.get(ctx, 'Oauth', { openId });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async bindWechat(memberId, unionid, openid) {
    const { ctx } = this;
    try {
      return await mysqlUtil.insert(ctx, 'Oauth', {
        Member_id: memberId,
        platform: 0,
        uid: unionid,
        openId: openid,
        createdTime: new Date().getTime(),
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async getOrderUnified(orderId) {
    const { ctx } = this;
    const sql = 'select Transaction.id as orderTransactionId, RoomType.name, `Order`.roomCount, ' +
      '`Order`.totalMoney, `Order`.startTime, `Order`.endTime, Oauth.openId from `Order`, RoomType, Oauth, ' +
      '(select OrderTransaction.id from OrderTransaction where Order_id = :orderId and deleteTag = 0 and `_TransactionAction_id` = 0 ' +
      'and status = 0 order by createdTime desc limit 1) as Transaction where `Order`.id = :orderId and `Order`.RoomType_id = RoomType.id ' +
      'and `Order`.OrderMember_id = Oauth.Member_id and Oauth.deleteTag = 0';
    try {
      return (await mysqlUtil.query(ctx, sql, { orderId }))[0];
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async unifiedPayOrder(order, openId) {
    const { ctx, app } = this;
    const wechatConfig = app.config.wechat;
    const days = dayjs(order.endTime)
      .diff(order.startTime, 'day');
    const body = `${order.name}${order.roomCount}间${days}天`;
    const nonce_str = ctx.helper.createNonceStr();
    const out_trade_no = `${order.orderTransactionId < 10 ? '0' : ''}${order.orderTransactionId}`;
    const spbill_create_ip = ctx.request.ip;
    const total_fee = app.config.env === 'prod' ? order.totalMoney : wechatConfig.fee;
    const sign = md5(wechatUtil.sortQueryString({
      appid: wechatConfig.appid,
      body,
      mch_id: wechatConfig.mch_id,
      nonce_str,
      notify_url: wechatConfig.unified_notify_url,
      openid: openId,
      out_trade_no,
      spbill_create_ip,
      total_fee,
      trade_type: wechatConfig.trade_type,
      key: wechatConfig.key,
    }))
      .toUpperCase();
    const data = `<xml>
      <appid>${wechatConfig.appid}</appid>
      <body>${body}</body>
      <mch_id>${wechatConfig.mch_id}</mch_id>
      <nonce_str>${nonce_str}</nonce_str>
      <notify_url>${wechatConfig.unified_notify_url}</notify_url>
      <openid>${openId}</openid>
      <out_trade_no>${out_trade_no}</out_trade_no>
      <spbill_create_ip>${spbill_create_ip}</spbill_create_ip>
      <total_fee>${total_fee}</total_fee>
      <trade_type>${wechatConfig.trade_type}</trade_type>
      <sign>${sign}</sign>
    </xml>`
      .replace(/\n\s*/g, '');
    ctx.logger.info(data);
    try {
      return await ctx.curl('https://api.mch.weixin.qq.com/pay/unifiedorder', {
        method: 'POST',
        data,
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async refund(order, orderTransactionId, refund_fee) {
    const { ctx, app } = this;
    const wechatConfig = app.config.wechat;
    const nonce_str = ctx.helper.createNonceStr();
    const total_fee = app.config.env === 'prod' ? order.totalMoney : wechatConfig.fee;
    let out_refund_no;
    try {
      out_refund_no = await mysqlUtil.insert(ctx, 'OrderTransaction', {
        _TransactionAction_id: 1,
        Order_id: order.id,
        money: refund_fee,
        createdTime: new Date().getTime(),
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (!out_refund_no) {
      ctx.logger.error('交易创建失败', { order, refund_fee });
      throw new Error('交易创建失败');
    }
    const out_trade_no = `${orderTransactionId < 10 ? '0' : ''}${orderTransactionId}`;
    const sign = md5(wechatUtil.sortQueryString({
      appid: wechatConfig.appid,
      mch_id: wechatConfig.mch_id,
      nonce_str,
      notify_url: wechatConfig.refund_notify_url,
      out_refund_no,
      out_trade_no,
      refund_fee: app.config.env === 'prod' ? refund_fee : wechatConfig.fee,
      total_fee,
      key: wechatConfig.key,
    }))
      .toUpperCase();
    const body = `<xml>
      <appid>${wechatConfig.appid}</appid>
      <mch_id>${wechatConfig.mch_id}</mch_id>
      <nonce_str>${nonce_str}</nonce_str>
      <notify_url>${wechatConfig.refund_notify_url}</notify_url>
      <out_refund_no>${out_refund_no}</out_refund_no>
      <out_trade_no>${out_trade_no}</out_trade_no>
      <refund_fee>${app.config.env === 'prod' ? refund_fee : wechatConfig.fee}</refund_fee>
      <total_fee>${total_fee}</total_fee>
      <sign>${sign}</sign>
    </xml>`
      .replace(/\n\s*/g, '');
    ctx.logger.info(body);
    let data;
    try {
      data = await rp({
        method: 'POST',
        uri: 'https://api.mch.weixin.qq.com/secapi/pay/refund',
        body,
        agentOptions: {
          pfx: fs.readFileSync('app/util/5d229bccb39fe2a80fa7f9a0ce870b15.p12'),
          passphrase: wechatConfig.mch_id,
        },
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    return xml2js.parseString(data, { explicitArray: false }, (error, result) => {
      if (error) {
        ctx.logger.error(error);
        throw error;
      }
      const xml = result.xml;
      return xml.return_code && xml.result_code;
    });
  }

  async sendTemplateMessage(openId, templateId, prepayId, keywords, page = null, emphasisKeyword = null) {
    const { ctx } = this;
    const data = {};
    data.touser = openId;
    data.template_id = templateId;
    if (page) {
      data.page = page;
    }
    data.form_id = prepayId;
    data.data = keywords;
    if (emphasisKeyword) {
      data.emphasis_keyword = emphasisKeyword;
    }
    try {
      return await ctx.curl(`https://api.weixin.qq.com/cgi-bin/message/wxopen/template/send?access_token=${await _getAccessToken(ctx)}`, {
        method: 'POST',
        contentType: 'json',
        dataType: 'json',
        data,
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }
}

module.exports = WechatService;
