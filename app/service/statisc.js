'use strict';

const Service = require('egg').Service;
const mysqlUtil = require('../util/mysql');

class StatiscService extends Service {
  async selectOrder(fileds) {
    const { ctx } = this;
    try {
      return await mysqlUtil.select(ctx, 'Order', { where: { ...fileds } });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async selectOrderByHotelId(hotelId, startTime, endTime) {
    const { ctx } = this;
    let Orders = [];
    try {
      const RoomTypes = await mysqlUtil.select(ctx, 'RoomType', { where: { Hotel_id: hotelId } });
      await mysqlUtil.beginTransactionScope(ctx, async conn => {
        for (let i = 0; i < RoomTypes.length; i++) {
          const sql = 'select * from `Order` where RoomType_id =:id and createdTime <= :endTime and createdTime >= :startTime';
          const getOrders = await mysqlUtil.query(ctx, sql, { id: RoomTypes[i].id, startTime, endTime });
          Orders = Orders.concat(getOrders);
        }
      });
      return Orders;
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }


}

module.exports = StatiscService;
