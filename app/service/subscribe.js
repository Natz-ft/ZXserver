'use strict';

const Service = require('egg').Service;
const dayjs = require('dayjs');
const mysqlUtil = require('../util/mysql');
const { OrderStatus } = require('../util/constant');

class SubscribeService extends Service {
  async subscribeRedis() {
    const { ctx, app } = this;
    app.redis.get('subscribe').subscribe('__keyevent@15__:expired', (error, count) => {
      if (error) {
        ctx.logger.error(error, count);
      }
      app.redis.get('subscribe').on('message', async (channel, message) => {
        const messages = message.split(':');
        switch (messages[0]) {
          case 'transaction':
            await this.dealTransaction(messages[1], messages[2], messages[3]);
            break;
          case 'start':
            await this.dealStart(messages[1], messages[2], messages[3]);
            break;
          case 'expire':
            await this.dealExpire(messages[1], messages[2], messages[3]);
            break;
          default:
            break;
        }
      });
    });
  }

  async dealTransaction(type, transactionId, times) {
    const { ctx, app } = this;
    try {
      const transaction = await mysqlUtil.get(ctx, 'OrderTransaction', { id: transactionId });
      if (!transaction || transaction.deleteTag === 1) {
        ctx.logger.error('交易不存在或已删除', { transaction });
      } else if (transaction.status !== 0) {
        ctx.logger.info('交易已处理', { transaction });
      } else {
        const order = await mysqlUtil.get(ctx, 'Order', { id: transaction.Order_id });
        await mysqlUtil.beginTransactionScope(ctx, async conn => {
          await mysqlUtil.connUpdate(ctx, 'OrderTransaction', {
            status: 2,
            transactionTime: new Date().getTime(),
          }, { where: { id: transactionId } }, conn);
          if (order.MemberCoupon_id) {
            await mysqlUtil.connUpdate(ctx, 'MemberCoupon', {
              status: 0,
            }, { where: { id: order.MemberCoupon_id } }, conn);
          }
          await mysqlUtil.connInsert(ctx, 'Order_OrderStatus', {
            Order_id: order.id,
            _OrderStatus_id: 8,
            createdTime: new Date().getTime(),
          }, conn);
          await mysqlUtil.connUpdate(ctx, 'Order', {
            CurrentStatus_id: 8,
            deleteTag: type === 'order' ? 0 : 1,
          }, { where: { id: order.id } }, conn, type !== 'order');
          return true;
        });
      }
      await app.redis.get('db14').zrem(`transaction:${type}`, transactionId);
    } catch (e) {
      if (times <= 3) {
        await app.redis.get('db15').set(`transaction:${type}:${transactionId}:${times + 1}`, 'expire', 'EX', 10);
        await app.redis.get('db14').zincrby(`transaction:${type}`, 10 * 1000, transactionId);
      }
      ctx.logger.error(e, '定时错误');
    }
  }

  async dealStart(type, typeId, times) {
    if (type === 'order') {
      const { ctx, app } = this;
      let order;
      try {
        order = await ctx.service.order.queryOrderHotelById(typeId);
        if (order.status === OrderStatus.NOT_CONFIRM) {
          const orderTransaction = await ctx.service.transaction.queryPaidOrderTransactionByOrderIdAndMoney(order.id, order.totalMoney);
          await ctx.service.wechat.refund({
            id: order.id,
            totalMoney: order.totalMoney,
          }, orderTransaction.id, order.totalMoney);
          await ctx.service.order.changeOrderStatus(order.id, OrderStatus.TOTAL_REFUND);
          const wechatConfig = ctx.app.config.wechat;
          await ctx.service.wechat.sendTemplateMessage(order.openId, wechatConfig.template.orderFail, order.prepayId, {
            keyword1: {
              value: order.hotelName,
            },
            keyword2: {
              value: order.roomTypeName,
            },
            keyword3: {
              value: `${order.roomCount}间`,
            },
            keyword4: {
              value: dayjs(order.startTime).format('YYYY年MM月DD日'),
            },
            keyword5: {
              value: dayjs(order.endTime).format('YYYY年MM月DD日'),
            },
            keyword6: {
              value: dayjs().format('YYYY年MM月DD日'),
            },
            keyword7: {
              value: `${Math.round(order.totalMoney / 100)}元`,
            },
            keyword8: {
              value: '酒店超时未确认订单',
            },
            keyword9: {
              value: '退款将于24小时内退还到支付账户',
            },
          });
        } else if (order.status !== OrderStatus.NOT_CHECK_IN) {
          ctx.logger.info('订单已处理', { order });
        } else {
          await ctx.service.order.changeOrderStatus(typeId, OrderStatus.CHECK_IN);
        }
        await app.redis.get('db14').zrem(`start:${type}`, typeId);
      } catch (e) {
        if (times <= 3) {
          await app.redis.get('db15').set(`start:${type}:${typeId}:${times + 1}`, 'expire', 'EX', 10);
          await app.redis.get('db14').zincrby(`start:${type}`, 10 * 1000, typeId);
        }
        ctx.logger.error(e, '定时错误');
      }
    }
  }

  async dealExpire(type, typeId, times) {
    if (type === 'order') {
      const { ctx, app } = this;
      let order;
      try {
        order = await ctx.service.order.queryOrderById(typeId);
        if (order.status !== OrderStatus.CHECK_IN) {
          ctx.logger.info('交易已处理', { order });
        } else {
          const roomType = await ctx.service.room.queryRoomTypeById(order.RoomType_id);
          const orderRooms = (await ctx.service.order.queryOrderRoomByOrderId(typeId)).filter(orderRoom => orderRoom.status !== 2);
          const rooms = [];
          for (let i = 0; i < orderRooms.length; i++) {
            rooms.push(await ctx.service.room.queryRoomById(orderRooms[i].Room_id));
          }
          await ctx.service.io.emitSweeper(roomType.Hotel_id, { rooms });
          await ctx.service.io.emitHotel(roomType.Hotel_id, 'order.checkout', { order: await ctx.service.order.queryOrderDetailById(typeId) });
          await ctx.service.order.changeOrderStatus(typeId, OrderStatus.PARTIAL_REFUND);
        }
        await app.redis.get('db14').zrem(`expire:${type}`, typeId);
      } catch (e) {
        if (times <= 3) {
          await app.redis.get('db15').set(`expire:${type}:${typeId}:${times + 1}`, 'expire', 'EX', 10);
          await app.redis.get('db14').zincrby(`expire:${type}`, 10 * 1000, typeId);
        }
        ctx.logger.error(e, '定时错误');
      }
    }
  }
}

module.exports = SubscribeService;
