'use strict';

const Controller = require('egg').Controller;
const xml2js = require('xml2js');
const md5 = require('md5');
const dayjs = require('dayjs');
const wechatUtil = require('../util/wechat');
const { OrderStatus } = require('../util/constant');

class WechatController extends Controller {

  async payActionUnified() {
    const { ctx, app } = this;
    const wechatConfig = app.config.wechat;
    let data = '';
    try {
      ctx.body = await new Promise((resolve, reject) =>
        ctx.req.on('data', chunk => {
          data += chunk;
        }).on('end', () => {
          xml2js.parseString(data, { explicitArray: false }, async (error, result) => {
            if (error) {
              ctx.logger.error(error);
              return reject(error);
            }
            const xml = result.xml;
            const sign = md5(wechatUtil.sortQueryString({
              ...xml,
              key: wechatConfig.key,
            }))
              .toUpperCase();
            if (xml.sign !== sign) {
              ctx.logger.error('go away', { xml, sign });
              return reject(new Error('go away'));
            }
            if (xml.result_code !== 'SUCCESS') {
              ctx.logger.info(xml.return_msg, xml);
              return resolve(`<xml>
                <return_code><![CDATA[SUCCESS]]></return_code>
                <return_msg><![CDATA[OK]]></return_msg>
              </xml>`
                .replace(/\n\s*/g, ''));
            }
            const out_trade_no = xml.out_trade_no;
            const orderTransactionId = out_trade_no.startsWith('0') ? out_trade_no.substring(1) : out_trade_no;
            let order;
            try {
              order = await ctx.service.order.queryOrderByOrderTransactionId(orderTransactionId);
            } catch (e) {
              ctx.logger.error(e);
              return reject(e);
            }
            let orderTransaction;
            try {
              orderTransaction = await ctx.service.transaction.queryOrderTransactionById(orderTransactionId);
            } catch (e) {
              ctx.logger.error(e);
              return reject(e);
            }
            if (!orderTransaction) {
              ctx.logger.error('查无订单', { xml });
              return resolve(`<xml>
                <return_code><![CDATA[SUCCESS]]></return_code>
                <return_msg><![CDATA[OK]]></return_msg>
              </xml>`
                .replace(/\n\s*/g, ''));
            }
            // todo 价格判断
            // if (app.config.env === 'prod' ? orderTransaction.money.toString() : wechatConfig.fee.toString() !== xml.total_fee) {
            //   ctx.logger.error('总价错误', { xml, orderTransaction });
            //   return resolve(`<xml>
            //     <return_code><![CDATA[SUCCESS]]></return_code>
            //     <return_msg><![CDATA[OK]]></return_msg>
            //   </xml>`
            //     .replace(/\n\s*/g, ''));
            // }
            if (order.CurrentStatus_id !== 0) {
              try {
                await ctx.service.transaction.payOrderTransaction(orderTransactionId, 0, order, xml.openid, false);
                await ctx.service.wechat.refund({
                  id: order.id,
                  totalMoney: order.totalMoney,
                }, orderTransactionId, xml.settlement_total_fee);
                await ctx.service.order.changeOrderStatus(order.id, OrderStatus.TOTAL_REFUND);
                const orderInfo = await ctx.service.order.queryOrderHotelById(order.id);
                await ctx.service.wechat.sendTemplateMessage(xml.openid, wechatConfig.template.orderFail, order.prepayId, {
                  keyword1: {
                    value: orderInfo.hotelName,
                  },
                  keyword2: {
                    value: orderInfo.roomTypeName,
                  },
                  keyword3: {
                    value: `${orderInfo.roomCount}间`,
                  },
                  keyword4: {
                    value: dayjs(orderInfo.startTime).format('YYYY年MM月DD日'),
                  },
                  keyword5: {
                    value: dayjs(orderInfo.endTime).format('YYYY年MM月DD日'),
                  },
                  keyword6: {
                    value: dayjs().format('YYYY年MM月DD日'),
                  },
                  keyword7: {
                    value: `${Math.round(order.totalMoney / 100)}元`,
                  },
                  keyword8: {
                    value: '支付过期，订单已失效',
                  },
                  keyword9: {
                    value: '退款将于24小时内退还到支付账户',
                  },
                });
              } catch (e) {
                ctx.logger.error(e);
                return reject(e);
              }
              ctx.logger.error('支付超时', { xml, order });
              return resolve(`<xml>
                <return_code><![CDATA[SUCCESS]]></return_code>
                <return_msg><![CDATA[OK]]></return_msg>
              </xml>`
                .replace(/\n\s*/g, ''));
            }
            try {
              await ctx.service.transaction.payOrderTransaction(orderTransactionId, 0, order, xml.openid);
            } catch (e) {
              ctx.logger.error(e);
              return reject(e);
            }
            console.log('处理成功');
            ctx.logger.info(xml);
            return resolve(`<xml>
                <return_code><![CDATA[SUCCESS]]></return_code>
                <return_msg><![CDATA[OK]]></return_msg>
              </xml>`
              .replace(/\n\s*/g, ''));
          });
        })
      );
    } catch (e) {
      ctx.logger.error(e);
      ctx.status = 400;
      ctx.body = {
        error: e.message,
      };
    }
  }

  async payActionRefund() {
    const { ctx, app } = this;
    const wechatConfig = app.config.wechat;
    let data = '';
    try {
      ctx.body = await new Promise((resolve, reject) =>
        ctx.req.on('data', chunk => {
          data += chunk;
        }).on('end', () => {
          xml2js.parseString(data, { explicitArray: false }, async (error, result) => {
            if (error) {
              ctx.logger.error(error);
              return reject(error);
            }
            const xml = result.xml;
            if (xml.result_code !== 'SUCCESS') {
              ctx.logger.info(xml.return_msg, xml);
              return resolve(`<xml>
                <return_code><![CDATA[SUCCESS]]></return_code>
                <return_msg><![CDATA[OK]]></return_msg>
              </xml>`
                .replace(/\n\s*/g, ''));
            }
            xml2js.parseString(wechatUtil.refundDecrypt(wechatConfig.key, xml.req_info), { explicitArray: false }, async (error, result) => {
              if (error) {
                ctx.logger.error(error);
                return reject(error);
              }
              const root = result.root;
              if (root.refund_status !== 'SUCCESS') {
                ctx.logger.error('退款失败', xml);
                return resolve(`<xml>
                  <return_code><![CDATA[SUCCESS]]></return_code>
                  <return_msg><![CDATA[OK]]></return_msg>
                </xml>`
                  .replace(/\n\s*/g, ''));
              }
              let orderTransaction;
              try {
                orderTransaction = await ctx.service.transaction.queryOrderTransactionById(root.out_refund_no);
              } catch (e) {
                ctx.logger.error(e);
                return reject(e);
              }
              if (orderTransaction.status !== 0) {
                ctx.logger.info('交易状态异常', { orderTransaction, xml });
                return resolve(`<xml>
                  <return_code><![CDATA[SUCCESS]]></return_code>
                  <return_msg><![CDATA[OK]]></return_msg>
                </xml>`
                  .replace(/\n\s*/g, ''));
              }
              // todo 价格判断
              // if (app.config.env === 'prod' ? orderTransaction.money.toString() : wechatConfig.fee.toString() !== root.refund_fee) {
              //   ctx.logger.info('金额不符', { orderTransaction, xml });
              //   return resolve(`<xml>
              //     <return_code><![CDATA[SUCCESS]]></return_code>
              //     <return_msg><![CDATA[OK]]></return_msg>
              //   </xml>`
              //     .replace(/\n\s*/g, ''));
              // }
              try {
                const statuses = await ctx.service.order.queryOrderStatusTimeLine(orderTransaction.Order_id);
                if (statuses.some(status => status._OrderStatus_id === OrderStatus.REJECT)) {
                  await ctx.service.transaction.refundOrderTransaction(orderTransaction, root.settlement_refund_fee, OrderStatus.REFUND_COMPLETE, OrderStatus.REJECT);
                } else if (statuses.some(status => status._OrderStatus_id === OrderStatus.CHECK_IN)) {
                  await ctx.service.transaction.refundOrderTransaction(orderTransaction, root.settlement_refund_fee, OrderStatus.REFUND_COMPLETE, OrderStatus.REFUND_COMPLETE);
                } else {
                  await ctx.service.transaction.refundOrderTransaction(orderTransaction, root.settlement_refund_fee, OrderStatus.REFUND_COMPLETE, OrderStatus.CANCEL);
                }
              } catch (e) {
                ctx.logger.error(e);
                return reject(e);
              }
              console.log('处理成功');
              return resolve(`<xml>
                  <return_code><![CDATA[SUCCESS]]></return_code>
                  <return_msg><![CDATA[OK]]></return_msg>
                </xml>`
                .replace(/\n\s*/g, ''));
            });
          });
        })
      );
    } catch (e) {
      ctx.logger.error(e);
      ctx.status = 400;
      ctx.body = {
        error: e.message,
      };
    }
  }
}

module.exports = WechatController;
