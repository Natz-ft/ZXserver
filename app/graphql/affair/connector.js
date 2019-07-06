'use strict';

const { ErrorCode, OrderStatus, AuthorityType } = require('../../util/constant');

class AffairConnector {
  constructor(ctx) {
    this.ctx = ctx;
  }

  async startAAffair(role, orderRoomId, type, expectTime, content) {
    const { ctx } = this;
    let orderRoom;
    try {
      orderRoom = await ctx.service.order.queryOrderRoomById(orderRoomId);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (!orderRoom) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_ROOM_NOT_EXIST, { role, orderRoomId, type, expectTime, content });
    }
    if (orderRoom.deleteTag === 1) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_ROOM_INVALID, { role, orderRoom, type, expectTime, content });
    }
    if (orderRoom.status === 2) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_ROOM_EXITED, { role, orderRoom, type, expectTime, content });
    }
    let order;
    try {
      order = await ctx.service.order.queryOrderById(orderRoom.Order_id);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (!order) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_NOT_EXIST, { role, orderRoom, type, expectTime, content });
    }
    if (order.deleteTag === 1) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_INVALID, { role, orderRoom, type, expectTime, content, order });
    }
    if (order.CurrentStatus_id !== OrderStatus.CHECK_IN) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_STATUS_IS_NOT_CHECK_IN, { role, orderRoom, type, expectTime, content, order });
    }
    let roomCheckInMan;
    try {
      const roomCheckInMen = await ctx.service.room.queryRoomCheckInManByOrderRoomId(orderRoomId);
      if (role.id === order.OrderMember_id) {
        roomCheckInMan = roomCheckInMen.find(roomCheckInMan => roomCheckInMan.role === AuthorityType.ORDER_PERSON);
      } else {
        const selfCheckInMan = await ctx.service.member.queryCheckInManByMemberId(role.id);
        const checkInMan = await ctx.service.member.queryCheckInManByMemberIdAndIdCard(order.OrderMember_id, selfCheckInMan.idCard);
        roomCheckInMan = roomCheckInMen.find(roomCheckInMan => roomCheckInMan.role === AuthorityType.AUTHORIZED_PERSON && roomCheckInMan.CheckInMan_id === checkInMan.id);
      }
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (!roomCheckInMan) {
      ctx.helper.errorLog(ctx, ErrorCode.member.HAVE_NO_RIGHT_OF_THIS_ORDER_ROOM, { role, orderRoom, type, expectTime, content, order });
    }
    try {
      await ctx.service.affair.insertAffair(role.id, orderRoomId, type, expectTime, content);
      // todo 事务通知
      return true;
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }
}

module.exports = AffairConnector;
