'use strict';

const { Role } = require('../../util/constant');

module.exports = {
  Coupon: {
    hotel({ Hotel_id }, _, ctx) {
      if (Hotel_id === 0) {
        return null;
      }
      return ctx.connector.hotel.getHotelById(Hotel_id);
    },
    roomType({ RoomType_id }, _, ctx) {
      if (RoomType_id === 0) {
        return null;
      }
      return ctx.connector.room.getRoomTypeById(RoomType_id);
    },
    memberLevel({ _MemberLevel_id }, _, ctx) {
      if (_MemberLevel_id === 0) {
        return null;
      }
      return ctx.connector.member.getMemberLevel(_MemberLevel_id);
    },
    period({ period }) {
      return JSON.parse(period);
    },
  },
  Query: {
    coupon(_, { id }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.MEMBER ],
          func: () => {
            return ctx.connector.coupon.getCoupon(id);
          },
        },
      ]);
    },
    hotelCoupons(_, { hotelId }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.coupon.getHotelCoupons(hotelId);
          },
        },
      ]);
    },
  },
  Mutation: {
    collectCoupon(_, { id }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.MEMBER ],
          func: role => {
            return ctx.connector.coupon.memberCollectCoupon(role, id);
          },
        },
      ]);
    },
    addCoupon(_, fields, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.HOTEL_STAFF ],
          func: role => {
            return ctx.connector.coupon.addACoupon(role, fields);
          },
        },
      ]);
    },
    deleteCoupon(_, { id }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.HOTEL_STAFF ],
          func: role => {
            return ctx.connector.coupon.deleteACoupon(role, id);
          },
        },
      ]);
    },
  },
};
