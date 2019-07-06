'use strict';

const Service = require('egg').Service;
const mysqlUtil = require('../util/mysql');

class CouponService extends Service {
  async queryHotelCoupon(hotelId) {
    const { ctx } = this;
    const sql = 'select * from Coupon where Hotel_id in (0, :hotelId) and deleteTag = 0 and outTime >= unix_timestamp(now()) * 1000';
    try {
      return await mysqlUtil.query(ctx, sql, { hotelId });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryCouponById(id) {
    const { ctx } = this;
    try {
      return await mysqlUtil.get(ctx, 'Coupon', { id });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryCoupons(ids) {
    const { ctx } = this;
    try {
      return await mysqlUtil.unionSelect(ctx, 'Coupon', ids);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryHotelCoupons(hotelId) {
    const { ctx } = this;
    try {
      return await mysqlUtil.select(ctx, 'Coupon', {
        where: { Hotel_id: [ 0, hotelId ] },
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async insertMemberCoupon(id, stock, memberId) {
    // todo redis优惠券领取
    const { ctx } = this;
    try {
      return await mysqlUtil.beginTransactionScope(ctx, async conn => {
        await mysqlUtil.connUpdate(ctx, 'Coupon', { stock: stock - 1 }, {
          where: { id },
        }, conn);
        await mysqlUtil.connInsert(ctx, 'MemberCoupon', {
          Member_id: memberId,
          Coupon_id: id,
          createdTime: new Date().getTime(),
        }, conn);
        return true;
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryCouponStock(id) {
    const { ctx } = this;
    try {
      return await mysqlUtil.get(ctx, 'Coupon', { id });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async verifyMemberCoupon(id, memberId) {
    const { ctx } = this;
    const sql = 'select Coupon.discount, if(MemberCoupon.status = 0, 1, 0) as notUsed, ' +
      'if(MemberCoupon.Member_id = :memberId, 1, 0) as notOthers, if (startTime <= unix_timestamp(now()) * 1000 ' +
      'and endTime >= unix_timestamp(now()) * 1000, 1, 0) as inTime, if(instr(Coupon.period, date_format(now(),\'%w\')) > 0, 1, 0) as inPeriod ' +
      'from MemberCoupon, Coupon where MemberCoupon.id = :id and MemberCoupon.deleteTag = 0 and MemberCoupon.Coupon_id = Coupon.id';
    try {
      return (await mysqlUtil.query(ctx, sql, { id, memberId }))[0];
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async insetCoupon(fields) {
    const { ctx } = this;
    const { hotelId, roomTypeId, memberLevelId, name, condition, discount, period, startTime, endTime, total, releaseTime, outTime } = fields;
    try {
      return await mysqlUtil.insert(ctx, 'Coupon', {
        Hotel_id: hotelId,
        RoomType_id: roomTypeId,
        _MemberLevel_id: memberLevelId,
        name,
        condition,
        discount,
        period: JSON.stringify(period),
        startTime,
        endTime,
        stock: total,
        total,
        releaseTime,
        outTime,
        createdTime: new Date().getTime(),
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async deleteCouponById(id) {
    const { ctx } = this;
    try {
      return await mysqlUtil.update(ctx, 'Coupon', { deleteTag: 1 }, {
        where: { id },
      }, true);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }
}

module.exports = CouponService;
