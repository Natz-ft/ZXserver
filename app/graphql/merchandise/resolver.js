'use strict';

const { Role } = require('../../util/constant');

module.exports = {
  Merchandise: {
    hotelId({ Hotel_id }) {
      return Hotel_id;
    },
  },
  Consumption: {
    orderRoomId({ OrderRoom_id }) {
      return OrderRoom_id;
    },
    merchandise({ Merchandise_id }, _, ctx) {
      return ctx.connector.merchandise.getMerchandiseById(Merchandise_id);
    },
  },
  Query: {
    merchandise(_, { id }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.merchandise.getMerchandiseById(id);
          },
        },
      ]);
    },
    merchandises(_, { hotelId }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.merchandise.getHotelMerchandise(hotelId);
          },
        },
      ]);
    },
  },
  Mutation: {
    merchandise(_, { hotelId, name, unit, price, cover }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.merchandise.addMerchandise(hotelId, name, unit, price, cover);
          },
        },
      ]);
    },
    updateMerchandise(_, { id, name, unit, price, cover }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.merchandise.modifyMerchandise(id, name, unit, price, cover);
          },
        },
      ]);
    },
    deleteMerchandise(_, { id }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.merchandise.delMerchandise(id);
          },
        },
      ]);
    },
  },
};
