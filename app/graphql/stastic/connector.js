'use strict';

const dayjs = require('dayjs');
const mysqlUtil = require('../../util/mysql');
const { OrderStatus } = require('../../util/constant');

class StasticConnector {
  constructor(ctx) {
    this.ctx = ctx;
  }
  async queryRoomStatic(hotelId) {
    const { ctx } = this;
    try {
      const roomTypes = await ctx.service.room.queryRoomTypeByHotelId(hotelId);
      const roomStatic = [];
      for (const roomType of roomTypes) {
        roomStatic.push({
          id: roomType.id,
          name: roomType.name,
          number: 0,
        });
      }
      for (let i = 0; i < roomStatic.length; i++) {
        try {
          const rooms = await ctx.service.room.queryRoomsByRoomtype(roomStatic[i].id);
          roomStatic[i].number = rooms.length;
        } catch (e) {
          ctx.logger.error(e);
          throw e;
        }
      }
      return roomStatic;
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async orderStatic(hotelId, startTime, endTime) {
    const { ctx } = this;
    try {
      const stastics = [];
      const orders = await ctx.service.statisc.selectOrderByHotelId(hotelId, startTime, endTime);
      for (const order of orders) {
        let find = false;
        for (const stastic of stastics) {
          if (stastic.RoomType_id == order.RoomType_id) {
            stastic.orders.push(order);
            find = true;
          }
        }
        if (!find) {
          stastics.push({
            RoomType_id: order.RoomType_id,
            orders: [],
          });
        }
      }
      return stastics;
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }
}

module.exports = StasticConnector;
