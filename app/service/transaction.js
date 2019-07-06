'use strict';

const Service = require('egg').Service;
const mysqlUtil = require('../util/mysql');

class TransactionService extends Service {
  async queryOrderTransactionById(id) {
    const { ctx } = this;
    try {
      return await mysqlUtil.get(ctx, 'OrderTransaction', { id });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryPaidOrderTransactionByOrderIdAndMoney(orderId, money) {
    const { ctx } = this;
    try {
      return await mysqlUtil.get(ctx, 'OrderTransaction', {
        _TransactionAction_id: 0,
        Order_id: orderId,
        money,
        status: 1,
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async payOrderTransaction(id, mode, order, openid, isValid = true) {
    const { ctx, app } = this;
    try {
      await mysqlUtil.beginTransactionScope(ctx, async conn => {
        const oauth = await mysqlUtil.get(ctx, 'Oauth', { platform: mode, openId: openid });
        await mysqlUtil.connUpdate(ctx, 'OrderTransaction', {
          mode,
          status: 1,
          transactionTime: new Date().getTime(),
        }, { where: { id } }, conn);
        if (order.MemberCoupon_id) {
          await mysqlUtil.connUpdate(ctx, 'MemberCoupon', {
            status: isValid ? 2 : 0,
            usedTime: isValid ? new Date().getTime() : null,
          }, { where: { id: order.MemberCoupon_id } }, conn);
        }
        await mysqlUtil.connInsert(ctx, 'Order_OrderStatus', {
          Order_id: order.id,
          _OrderStatus_id: 1,
          createdTime: new Date().getTime(),
        }, conn);
        const rows = {
          PayMember_id: oauth ? oauth.Member_id : null,
        };
        if (isValid) {
          rows.CurrentStatus_id = 1;
        }
        await mysqlUtil.connUpdate(ctx, 'Order', rows, { where: { id: order.id } }, conn);
        return true;
      });
      if (isValid) {
        const orderInfo = await ctx.service.order.queryOrderById(order.id);
        const noManFreeRoomIds = (await ctx.service.room.queryNoManFreeRoom(orderInfo.RoomType_id)).map(room => room.id);
        if (noManFreeRoomIds.length >= orderInfo.roomCount) {
          // 自动确认
          let rooms;
          if (orderInfo.parent_id) {
            const roomIds = JSON.parse(await app.redis.get('db0').set(`stay:${order.id}`)).map(room => room.roomId);
            rooms = roomIds.map(roomId => {
              if (noManFreeRoomIds.includes(roomId)) {
                return roomId;
              }
              return noManFreeRoomIds.find(noManFreeRoomId => !roomIds.includes(noManFreeRoomId));
            });
          } else {
            rooms = noManFreeRoomIds.slice(0, orderInfo.roomCount);
          }
          await ctx.connector.order.confirmHotelOrder(order.id, rooms);
        }
        const roomType = await ctx.service.room.queryRoomTypeById(orderInfo.RoomType_id);
        await ctx.service.io.emitHotel(roomType.Hotel_id, 'order.order', { order: await ctx.service.order.queryOrderDetailById(order.id) });
      }
      return true;
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async refundOrderTransaction(orderTransaction, settlementRefundFee, orderStatus, currentStatus) {
    const { ctx } = this;
    try {
      return mysqlUtil.beginTransactionScope(ctx, async conn => {
        const rows = {
          status: 1,
          transactionTime: new Date().getTime(),
        };
        if (orderTransaction.money > settlementRefundFee) {
          rows.message = `${settlementRefundFee}/${orderTransaction.money}`;
        }
        await mysqlUtil.connUpdate(ctx, 'OrderTransaction', rows, { where: { id: orderTransaction.id } }, conn);
        await mysqlUtil.connInsert(ctx, 'Order_OrderStatus', {
          Order_id: orderTransaction.Order_id,
          _OrderStatus_id: orderStatus,
          createdTime: new Date().getTime(),
        }, conn);
        await mysqlUtil.connUpdate(ctx, 'Order', {
          CurrentStatus_id: currentStatus,
        }, { where: { id: orderTransaction.Order_id } }, conn);
        return true;
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }
}

module.exports = TransactionService;
