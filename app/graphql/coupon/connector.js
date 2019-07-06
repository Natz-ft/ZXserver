'use strict';

const DataLoader = require('dataloader');
const { ErrorCode } = require('../../util/constant');

class CouponConnector {
  constructor(ctx) {
    this.ctx = ctx;
    this.loader = new DataLoader(this.getCoupons.bind(this), { cache: false });
  }

  getCoupons(ids) {
    const { ctx } = this;
    return ctx.service.coupon.queryCoupons(ids);
  }

  getCoupon(id) {
    return this.loader.load(id);
  }

  getHotelCoupons(hotelId) {
    const { ctx } = this;
    return ctx.service.coupon.queryHotelCoupons(hotelId);
  }

  async memberCollectCoupon(role, id) {
    const { ctx } = this;
    let coupon;
    try {
      coupon = await ctx.service.coupon.queryCouponById(id);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (!coupon) {
      ctx.helper.errorLog(ctx, ErrorCode.coupon.COUPON_NOT_EXIST, { role, id });
    }
    if (coupon.deleteTag === 1) {
      ctx.helper.errorLog(ctx, ErrorCode.coupon.COUPON_INVALID, { role, coupon });
    }
    if (coupon.stock <= 0) {
      ctx.helper.errorLog(ctx, ErrorCode.coupon.COUPON_HAS_BEEN_RECEIVE_ENDS, { role, coupon });
    }
    let count;
    try {
      count = await ctx.service.member.queryMemberCouponCountByCouponIdAndMemberId(role.id, id);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (count >= coupon.quantity) {
      ctx.helper.errorLog(ctx, ErrorCode.coupon.CAN_NOT_GIT_AGAIN, { role, coupon, count });
    }
    try {
      await ctx.service.coupon.insertMemberCoupon(id, coupon.stock, role.id);
      return await ctx.service.coupon.queryCouponStock(id);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async addACoupon(role, fields) {
    const { ctx } = this;
    let staff;
    try {
      staff = await ctx.service.staff.queryStaffById(role.id);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (!staff) {
      ctx.helper.errorLog(ctx, ErrorCode.staff.STAFF_NOT_EXIST, { role, fields });
    }
    if (staff.Hotel_id !== fields.hotelId) {
      ctx.helper.errorLog(ctx, ErrorCode.staff.STAFF_HOTEL_NOT_CONFORMITY, { role, staff, fields });
    }
    try {
      const id = await ctx.service.coupon.insetCoupon(fields);
      return this.getCoupon(id);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async deleteACoupon(role, id) {
    const { ctx } = this;
    let coupon;
    try {
      coupon = await ctx.service.coupon.queryCouponById(id);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (!coupon) {
      ctx.helper.errorLog(ctx, ErrorCode.coupon.COUPON_NOT_EXIST, { role, id });
    }
    if (coupon.deleteTag === 1) {
      ctx.helper.errorLog(ctx, ErrorCode.coupon.COUPON_INVALID, { role, coupon });
    }
    if (coupon.stock < coupon.total) {
      ctx.helper.errorLog(ctx, ErrorCode.coupon.COUPON_CAN_NOT_DELETE, { role, coupon });
    }
    let staff;
    try {
      staff = await ctx.service.staff.queryStaffById(role.id);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (!staff) {
      ctx.helper.errorLog(ctx, ErrorCode.staff.STAFF_NOT_EXIST, { role, coupon });
    }
    if (staff.Hotel_id !== coupon.Hotel_id) {
      ctx.helper.errorLog(ctx, ErrorCode.staff.STAFF_HOTEL_NOT_CONFORMITY, { role, staff, coupon });
    }
    try {
      await ctx.service.coupon.deleteCouponById(id);
      return true;
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }
}

module.exports = CouponConnector;
