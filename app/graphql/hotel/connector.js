'use strict';

const DataLoader = require('dataloader');

class HotelConnector {
  constructor(ctx) {
    this.ctx = ctx;
    this.hotelLoader = new DataLoader(this.getHotels.bind(this), { cache: false });
    this.starLoader = new DataLoader(this.getHotelStars.bind(this));
    this.typeLoader = new DataLoader(this.getHotelTypes.bind(this));
  }

  getHotelList(startTime, endTime, longitude, latitude, page, size, orders) {
    const { ctx } = this;
    return ctx.service.hotel.queryHotelList(startTime, endTime, longitude, latitude, page, size, orders);
  }

  getHotelDetail(hotelId, startTime, endTime, longitude, latitude) {
    const { ctx } = this;
    return ctx.service.hotel.queryHotelDetail(hotelId, startTime, endTime, longitude, latitude);
  }

  getHotelRoomType(hotelId, startTime, endTime) {
    return {
      id: hotelId,
      startTimeParam: startTime,
      endTimeParam: endTime,
    };
  }

  getHotelByStaffId(staffId) {
    const { ctx } = this;
    return ctx.service.hotel.queryHotelByStaffId(staffId);
  }

  getHotelLicense(id) {
    const { ctx } = this;
    return ctx.service.hotel.queryHotelLicense(id);
  }

  getHotelStars(starIds) {
    const { ctx } = this;
    return ctx.service.hotel.queryHotelStars(starIds);
  }

  getHotelStar(hotelStarId) {
    return this.starLoader.load(hotelStarId);
  }

  getHotelTypes(typeIds) {
    const { ctx } = this;
    return ctx.service.hotel.queryHotelTypes(typeIds);
  }

  getHotelType(hotelTypeId) {
    return this.typeLoader.load(hotelTypeId);
  }

  getHotelInfoByHotelId(id) {
    const { ctx } = this;
    return ctx.service.hotel.queryHotelInfoByHotelId(id);
  }

  getHotelLabel(id, startTime) {
    const { ctx } = this;
    return ctx.service.hotel.queryHotelLabel(id, startTime);
  }

  getHotelRoomTypes(id, startTime, endTime) {
    const { ctx } = this;
    return ctx.service.room.queryHotelRoomType(id, startTime, endTime);
  }

  getHotelImage(id) {
    const { ctx } = this;
    return ctx.service.hotel.queryHotelImage(id);
  }

  getHotelLandLine(id) {
    const { ctx } = this;
    return ctx.service.hotel.queryHotelLandLine(id);
  }

  getHotelPhone(id) {
    const { ctx } = this;
    return ctx.service.hotel.queryHotelPhone(id);
  }

  getHotelCoupon(id) {
    const { ctx } = this;
    return ctx.service.coupon.queryHotelCoupon(id);
  }

  getHotels(ids) {
    const { ctx } = this;
    return ctx.service.hotel.queryHotels(ids);
  }

  getHotelById(id) {
    return this.hotelLoader.load(id);
  }

  async addHotelView(id, memberId) {
    const { ctx } = this;
    const createdTime = new Date().getTime();
    try {
      if (memberId) {
        await ctx.service.member.insertMemberView(memberId, id, createdTime);
      }
      await ctx.service.hotel.updateHotelViews(id);
      return createdTime;
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  getMemberHotelDetail(id, longitude, latitude) {
    const { ctx } = this;
    return ctx.service.hotel.queryMemberHotelDetail(id, longitude, latitude);
  }

  getBaseHotelInfo(id) {
    const { ctx } = this;
    return ctx.service.hotel.queryBaseHotelInfo(id);
  }

  getHigherHotelInfo(id) {
    const { ctx } = this;
    return ctx.service.hotel.queryHigherHotelInfo(id);
  }

  auditLicense(license) {
    const { ctx } = this;
    return ctx.service.hotel.insertAuditLicense(license);
  }

  auditBaseHotelInfo(baseHotelInfo) {
    const { ctx } = this;
    return ctx.service.hotel.insertAuditBaseHotelInfo(baseHotelInfo);
  }

  auditHigherHotelInfo(higherHotelInfo) {
    const { ctx } = this;
    return ctx.service.hotel.insertAuditHigherHotelInfo(higherHotelInfo);
  }
}


module.exports = HotelConnector;
