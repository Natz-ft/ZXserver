'use strict';

const Service = require('egg').Service;
const mysqlUtil = require('../util/mysql');
const { AuditType } = require('../util/constant');

class MerchandiseService extends Service {
  async insertMerchandise(hotelId, name, unit, price, cover) {
    const { ctx } = this;
    try {
      const id = await mysqlUtil.insert(ctx, 'Merchandise', {
        Hotel_id: hotelId,
        name,
        unit,
        price,
        cover,
      });
      await mysqlUtil.insert(ctx, 'Audit', {
        _AuditType_id: AuditType.MERCHANDISE,
        tableId: id,
        modified: JSON.stringify({ name, unit, price, cover }),
        createdTime: new Date().getTime(),
      });
      return await mysqlUtil.get(ctx, 'Merchandise', { id });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async updateMerchandiseById(id, name, unit, price, cover) {
    const { ctx } = this;
    try {
      await mysqlUtil.insert(ctx, 'Audit', {
        _AuditType_id: AuditType.MERCHANDISE,
        tableId: id,
        modified: JSON.stringify({ name, unit, price, cover }),
        createdTime: new Date().getTime(),
      });
      return true;
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async deleteMerchandiseById(id) {
    const { ctx } = this;
    try {
      return await mysqlUtil.beginTransactionScope(ctx, async conn => {
        await mysqlUtil.connUpdate(ctx, 'Merchandise', { deleteTag: 1 }, {
          where: { id },
        }, conn, true);
        await mysqlUtil.connUpdate(ctx, 'Audit', { deleteTag: 1 }, {
          where: { _AuditType_id: AuditType.MERCHANDISE, tableId: id },
        }, conn, true);
        return true;
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryHotelMerchandise(hotelId) {
    const { ctx } = this;
    try {
      return await mysqlUtil.select(ctx, 'Merchandise', { where: { Hotel_id: hotelId } });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryMerchandiseByIds(ids) {
    const { ctx } = this;
    try {
      return await mysqlUtil.unionSelect(ctx, 'Merchandise', ids);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryConsumptionByOrderRoomId(orderRoomId) {
    const { ctx } = this;
    try {
      return await mysqlUtil.select(ctx, 'Consumption', { where: { OrderRoom_id: orderRoomId } });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryHotelMerchandiseByOrderRoomId(orderRoomId) {
    const { ctx } = this;
    const sql = 'select Merchandise.* from Merchandise, RoomType, `Order`, OrderRoom where OrderRoom.id = :orderRoomId ' +
      'and OrderRoom.deleteTag = 0 and OrderRoom.Order_id = `Order`.id and `Order`.RoomType_id = RoomType.id ' +
      'and Merchandise.Hotel_id = RoomType.Hotel_id and Merchandise.deleteTag = 0 and Merchandise.status = 1';
    try {
      return await mysqlUtil.query(ctx, sql, { orderRoomId });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }
}

module.exports = MerchandiseService;
