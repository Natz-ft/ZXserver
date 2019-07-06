'use strict';

const { Role, StaffType } = require('../../util/constant');

module.exports = {
  StaffHotel: {
    __resolveType(_, ctx) {
      return ctx.helper.resolveType(ctx, [
        {
          roles: [ StaffType.ADMIN, StaffType.BACK ],
          type: 'AdminHotel',
        },
        {
          roles: [ StaffType.SWEEPER ],
          type: 'SweeperHotel',
        },
      ]);
    },
  },
  HotelInfo: {
    weekend({ weekend }) {
      return JSON.parse(weekend);
    },
  },
  HotelLandLine: {
    hotelId({ Hotel_id }) {
      return Hotel_id;
    },
  },
  HotelPhone: {
    hotelId({ Hotel_id }) {
      return Hotel_id;
    },
  },
  License: {
    hotelId({ Hotel_id }) {
      return Hotel_id;
    },
  },
  OrderHotel: {
    star({ _HotelStar_id }, _, ctx) {
      return ctx.connector.hotel.getHotelStar(_HotelStar_id);
    },
    info({ id }, _, ctx) {
      return ctx.connector.hotel.getHotelInfoByHotelId(id);
    },
    hasSmartLock({ hasSmartLock }) {
      return hasSmartLock === 1;
    },
  },
  MemberHotel: {
    hotel({ Hotel_id, longitudeParam, latitudeParam }, _, ctx) {
      return ctx.connector.hotel.getMemberHotelDetail(Hotel_id, longitudeParam, latitudeParam);
    },
  },
  Hotel: {
    info({ id }, _, ctx) {
      return ctx.connector.hotel.getHotelInfoByHotelId(id);
    },
    star({ _HotelStar_id }, _, ctx) {
      return ctx.connector.hotel.getHotelStar(_HotelStar_id);
    },
    labels({ id, startTimeParam }, _, ctx) {
      return ctx.connector.hotel.getHotelLabel(id, startTimeParam);
    },
    hasSmartLock({ hasSmartLock }) {
      return hasSmartLock === 1;
    },
  },
  HotelDetail: {
    info({ id }, _, ctx) {
      return ctx.connector.hotel.getHotelInfoByHotelId(id);
    },
    star({ _HotelStar_id }, _, ctx) {
      return ctx.connector.hotel.getHotelStar(_HotelStar_id);
    },
    roomTypes({ id, startTimeParam, endTimeParam }, _, ctx) {
      return ctx.connector.hotel.getHotelRoomTypes(id, startTimeParam, endTimeParam);
    },
    images({ id }, _, ctx) {
      return ctx.connector.hotel.getHotelImage(id);
    },
    landLines({ id }, _, ctx) {
      return ctx.connector.hotel.getHotelLandLine(id);
    },
    phones({ id }, _, ctx) {
      return ctx.connector.hotel.getHotelPhone(id);
    },
    coupons({ id }, _, ctx) {
      return ctx.connector.hotel.getHotelCoupon(id);
    },
  },
  HotelRoomType: {
    roomTypes({ id, startTimeParam, endTimeParam }, _, ctx) {
      return ctx.connector.hotel.getHotelRoomTypes(id, startTimeParam, endTimeParam);
    },
  },
  AdminHotel: {
    hasSmartLock({ hasSmartLock }) {
      return hasSmartLock === 1;
    },
    baseHotelInfo({ id }, _c, ctx) {
      return ctx.connector.hotel.getBaseHotelInfo(id);
    },
    higherHotelInfo({ id }, _, ctx) {
      return ctx.connector.hotel.getHigherHotelInfo(id);
    },
  },
  SweeperHotel: {
    hasSmartLock({ hasSmartLock }) {
      return hasSmartLock === 1;
    },
  },
  BaseHotelInfo: {
    async landLines({ id }, _, ctx) {
      const landLines = await ctx.connector.hotel.getHotelLandLine(id);
      return landLines.map(landLine => landLine.number);
    },
    async phones({ id }, _, ctx) {
      const phones = await ctx.connector.hotel.getHotelPhone(id);
      return phones.map(phone => phone.phone);
    },
  },
  HigherHotelInfo: {
    hotelType({ _HotelType_id }) {
      return _HotelType_id;
    },
    weekend({ weekend }) {
      return JSON.parse(weekend);
    },
  },
  Query: {
    hotels(_, { startTime, endTime, longitude, latitude, page, size, orders }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.MEMBER, Role.VISITOR ],
          func: () => {
            return ctx.connector.hotel.getHotelList(startTime, endTime, longitude, latitude, page, size, orders);
          },
        },
      ]);
    },
    hotelDetail(_, { hotelId, startTime, endTime, longitude, latitude }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.MEMBER, Role.VISITOR ],
          func: () => {
            return ctx.connector.hotel.getHotelDetail(hotelId, startTime, endTime, longitude, latitude);
          },
        },
      ]);
    },
    hotelRoomTypes(_, { hotelId, startTime, endTime }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.MEMBER, Role.VISITOR ],
          func: () => {
            return ctx.connector.hotel.getHotelRoomType(hotelId, startTime, endTime);
          },
        },
      ]);
    },
    hotelByStaffId(_, { staffId }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.hotel.getHotelByStaffId(staffId);
          },
        },
      ], staffId);
    },
    hotelLicense(_, { id }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.SYSTEM_STAFF, Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.hotel.getHotelLicense(id);
          },
        },
      ]);
    },
    staffHotel(_, { id }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.SYSTEM_STAFF, Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.hotel.getHotelById(id);
          },
        },
      ]);
    },
    baseHotelInfo(_, { id }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.hotel.getBaseHotelInfo(id);
          },
        },
      ]);
    },
    higherHotelInfo(_, { id }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.hotel.getHigherHotelInfo(id);
          },
        },
      ]);
    },
  },
  Mutation: {
    viewHotel(_, { id, memberId }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.MEMBER, Role.VISITOR ],
          func: () => {
            return ctx.connector.hotel.addHotelView(id, memberId);
          },
        },
      ], memberId);
    },
    submitLicense(_, license, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.hotel.auditLicense(license);
          },
        },
      ]);
    },
    submitBaseHotelInfo(_, { baseHotelInfo }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.hotel.auditBaseHotelInfo(baseHotelInfo);
          },
        },
      ]);
    },
    submitHigherHotelInfo(_, { higherHotelInfo }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.hotel.auditHigherHotelInfo(higherHotelInfo);
          },
        },
      ]);
    },
  },
};
