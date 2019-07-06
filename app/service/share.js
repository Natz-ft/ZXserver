'use strict';

const Service = require('egg').Service;
const mysqlUtil = require('../util/mysql');
const { AuthorityType } = require('../util/constant');

class ShareService extends Service {

  async queryRequestCheckInInfo(orderId, memberId) {
    const { ctx } = this;
    try {
      return await mysqlUtil.get(ctx, 'RequestCheckIn', {
        Order_id: orderId,
        TargetMember_id: memberId,
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryRequestCheckIns(orderId) {
    const { ctx } = this;
    try {
      return await mysqlUtil.select(ctx, 'RequestCheckIn', { where: { Order_id: orderId } });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryRequestAuthorityCheckIn(orderRoomId) {
    const { ctx } = this;
    try {
      return await mysqlUtil.select(ctx, 'RequestAuthority', { where: { OrderRoom_id: orderRoomId } });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryRequestAuthorityByOrderRoomIdAndTargetMemberId(orderRoomId, targetMemberId) {
    const { ctx } = this;
    try {
      return await mysqlUtil.get(ctx, 'RequestAuthority', { OrderRoom_id: orderRoomId, TargetMember_id: targetMemberId });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async insertRequestCheckIn(orderId, originMemberId, targetMemberId) {
    const { ctx } = this;
    try {
      return await mysqlUtil.insert(ctx, 'RequestCheckIn', {
        Order_id: orderId,
        OriginMember_id: originMemberId,
        TargetMember_id: targetMemberId,
        createdTime: new Date().getTime(),
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async insertRequestAuthority(orderRoomId, originMemberId, targetMemberId) {
    const { ctx } = this;
    try {
      await mysqlUtil.insert(ctx, 'RequestAuthority', {
        OrderRoom_id: orderRoomId,
        OriginMember_id: originMemberId,
        TargetMember_id: targetMemberId,
        createdTime: new Date().getTime(),
      });
      return true;
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryTargetRoomCheckInMan(orderRoomId, targetMemberId, isOrderMember = false) {
    const { ctx } = this;
    try {
      const ids = await ctx.service.member.queryCheckInManIdsByMemberId(targetMemberId);
      if (isOrderMember) {
        return await mysqlUtil.get(ctx, 'RoomCheckInMan', { OrderRoom_id: orderRoomId, CheckInMan_id: [ 0, ...ids ] });
      }
      return await mysqlUtil.get(ctx, 'RoomCheckInMan', { OrderRoom_id: orderRoomId, CheckInMan_id: ids });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryOriginRoomCheckInMan(orderRoomId, checkInManId) {
    const { ctx } = this;
    try {
      return await mysqlUtil.get(ctx, 'RoomCheckInMan', { OrderRoom_id: orderRoomId, CheckInMan_id: checkInManId });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async confirmCheckInManAuthority(originRoomCheckInMan, targetRoomCheckInMan, orderRoomId, targetMemberId) {
    const { ctx } = this;
    try {
      return await mysqlUtil.beginTransactionScope(ctx, async conn => {
        await mysqlUtil.connUpdate(ctx, 'RoomCheckInMan', {
          role: originRoomCheckInMan.role === AuthorityType.ORDER_PERSON ? AuthorityType.HAVE_NO_RIGHT_ORDER_PERSON : AuthorityType.CHECK_IN_MAN,
        }, {
          where: { id: originRoomCheckInMan.id },
        }, conn);
        await mysqlUtil.connUpdate(ctx, 'RoomCheckInMan', {
          role: targetRoomCheckInMan.role === AuthorityType.HAVE_NO_RIGHT_ORDER_PERSON ? AuthorityType.ORDER_PERSON : AuthorityType.AUTHORIZED_PERSON,
        }, {
          where: { id: targetRoomCheckInMan.id },
        }, conn);
        await mysqlUtil.connUpdate(ctx, 'RequestAuthority', {
          isConfirmed: 1,
          confirmedTime: new Date().getTime(),
        }, {
          where: { OrderRoom_id: orderRoomId, TargetMember_id: targetMemberId },
        }, conn);
        return true;
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }
}

module.exports = ShareService;
