'use strict';

const { ErrorCode, AuthorityType } = require('../../util/constant');

class ShareConnector {
  constructor(ctx) {
    this.ctx = ctx;
  }

  getRequestCheckInInfo(orderId, memberId) {
    const { ctx } = this;
    return ctx.service.share.queryRequestCheckInInfo(orderId, memberId);
  }

  async getRequestAuthorityInfo(orderRoomId, openId) {
    const { ctx } = this;
    let orderRoom;
    try {
      orderRoom = await ctx.service.order.queryOrderRoomById(orderRoomId);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (!orderRoom) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_ROOM_NOT_EXIST, { orderRoomId, openId });
    }
    if (orderRoom.deleteTag === 1) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_ROOM_INVALID, { orderRoom, openId });
    }
    let oauth;
    try {
      oauth = await ctx.service.member.queryWechatOauthByOpenId(openId);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (!oauth) {
      ctx.helper.errorLog(ctx, ErrorCode.member.PLEASE_AUTH_AND_LOGIN_FIRST, { orderRoomId, openId });
    }
    try {
      return await ctx.service.share.queryRequestAuthorityByOrderRoomIdAndTargetMemberId(orderRoomId, oauth.Member_id);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  getRequestCheckIns(orderId) {
    const { ctx } = this;
    return ctx.service.share.queryRequestCheckIns(orderId);
  }

  getRequestAuthorityCheckIn(orderRoomId) {
    const { ctx } = this;
    return ctx.service.share.queryRequestAuthorityCheckIn(orderRoomId);
  }

  async getIsAuthorMan(originMemberId, orderRoomId) {
    const { ctx } = this;
    let orderRoom;
    try {
      orderRoom = await ctx.service.order.queryOrderRoomById(orderRoomId);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (!orderRoom) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_ROOM_NOT_EXIST, { originMemberId, orderRoomId });
    }
    if (orderRoom.deleteTag === 1) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_ROOM_INVALID, { originMemberId, orderRoom });
    }
    let selfRoomCheckInMan;
    try {
      const order = await ctx.service.order.queryOrderById(orderRoom.Order_id);
      const roomCheckInMen = await ctx.service.room.queryRoomCheckInManByOrderRoomId(orderRoomId);
      let checkInManIds;
      if (originMemberId === order.OrderMember_id) {
        checkInManIds = [ 0, (await ctx.service.member.queryCheckInManByMemberId(originMemberId)).id ];
      } else {
        checkInManIds = await ctx.service.member.queryCheckInManIdsByMemberId(originMemberId);
      }
      selfRoomCheckInMan = roomCheckInMen.filter(roomCheckInMan => checkInManIds.includes(roomCheckInMan.CheckInMan_id))[0];
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (!selfRoomCheckInMan) {
      ctx.helper.errorLog(ctx, ErrorCode.share.SHARE_MEMBER_NOT_IN_ORDER, { originMemberId, orderRoom });
    }
    return [ AuthorityType.ORDER_PERSON, AuthorityType.AUTHORIZED_PERSON ].includes(selfRoomCheckInMan.role);
  }

  async requestCheckInOrder(orderId, originMemberId, targetMemberId, name, idCard) {
    const { ctx } = this;
    try {
      console.log(orderId, originMemberId, targetMemberId, name, idCard);
      await ctx.service.member.coverCheckInMan(targetMemberId, name, idCard);
      return await ctx.service.share.insertRequestCheckIn(orderId, originMemberId, targetMemberId);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  requestRoomAuthority(orderRoomId, originMemberId, targetMemberId) {
    const { ctx } = this;
    return ctx.service.share.insertRequestAuthority(orderRoomId, originMemberId, targetMemberId);
  }

  async confirmShareAuthority(orderRoomId, originMemberId, targetMemberId) {
    const { ctx } = this;
    let orderMemberId;
    try {
      orderMemberId = await ctx.service.order.queryOrderMemberIdByOrderRoomId(orderRoomId);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    let targetRoomCheckInMan;
    try {
      targetRoomCheckInMan = await ctx.service.share.queryTargetRoomCheckInMan(orderRoomId, targetMemberId, targetMemberId === orderRoomId);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (!targetRoomCheckInMan) {
      ctx.helper.errorLog(ctx, ErrorCode.member.CHECK_IN_MAN_NOT_IN_ORDER_ROOM, { orderRoomId, originMemberId, targetMemberId });
    }
    if ([ AuthorityType.ORDER_PERSON, AuthorityType.AUTHORIZED_PERSON ].includes(targetRoomCheckInMan.role)) {
      ctx.helper.errorLog(ctx, ErrorCode.share.TARGET_MEMBER_ALREADY_HAS_AUTHORITY, { orderRoomId, originMemberId, targetMemberId });
    }
    let checkInMan;
    try {
      checkInMan = await ctx.service.member.queryCheckInManByMemberId(originMemberId);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (!checkInMan && targetMemberId !== orderMemberId) {
      ctx.helper.errorLog(ctx, ErrorCode.share.ORIGIN_MEMBER_NOT_REAL_NAME, { orderRoomId, originMemberId, targetMemberId, orderMemberId });
    }
    let originRoomCheckInMan;
    try {
      if (!checkInMan && originMemberId === orderMemberId) {
        originRoomCheckInMan = await ctx.service.share.queryOriginRoomCheckInMan(orderRoomId, 0);
      } else {
        originRoomCheckInMan = await ctx.service.share.queryOriginRoomCheckInMan(orderRoomId, checkInMan.id);
      }
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (!originRoomCheckInMan) {
      ctx.helper.errorLog(ctx, ErrorCode.share.ORIGIN_MEMBER_NOT_EXIST, { orderRoomId, originMemberId, targetMemberId, orderMemberId, checkInMan });
    }
    if (![ AuthorityType.ORDER_PERSON, AuthorityType.AUTHORIZED_PERSON ].includes(originRoomCheckInMan.role)) {
      ctx.helper.errorLog(ctx, ErrorCode.share.ORIGIN_MEMBER_HAS_NO_RIGHT, { orderRoomId, originMemberId, targetMemberId });
    }
    try {
      return await ctx.service.share.confirmCheckInManAuthority(originRoomCheckInMan, targetRoomCheckInMan, orderRoomId, targetMemberId);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  getMember(memberId) {
    const { ctx } = this;
    return ctx.connector.member.getMemberById(memberId);
  }

  getCheckInManByMemberId(memberId) {
    const { ctx } = this;
    return ctx.service.member.queryCheckInManByMemberId(memberId);
  }

  getOrderRoom(orderRoomId) {
    const { ctx } = this;
    return ctx.service.room.queryOrderRoomById(orderRoomId);
  }
}

module.exports = ShareConnector;
