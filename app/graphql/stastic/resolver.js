'use strict';

const { Role } = require('../../util/constant');
const mysqlUtil = require('../../util/mysql');

module.exports = {
  orderStatisc: {
    roomType({ RoomType_id }, _, ctx) {
      return ctx.connector.order.getOrderRoomType(RoomType_id);
    },
  },
  Query: {
    roomTypeStatisc(_, { hotelId }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.HOTEL_STAFF ],
          func: () => {
            const roomtypeStatic = ctx.connector.stastic.queryRoomStatic(hotelId);
            return roomtypeStatic;
          },
        },
      ]);
    },

    orderStatisc(_, { hotelId, startTime, endTime }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.HOTEL_STAFF ],
          func: () => {
            const stastics = ctx.connector.stastic.orderStatic(hotelId, startTime, endTime);
            return stastics;
          },
        },
      ]);
    },
  },
};
