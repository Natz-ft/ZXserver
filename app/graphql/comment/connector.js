'use strict';

const { ErrorCode } = require('../../util/constant');

class ClientCommentConnector {
  constructor(ctx) {
    this.ctx = ctx;
  }

  getCommentById(id) {
    const { ctx } = this;
    return ctx.service.comment.queryCommentById(id);
  }

  getCommentByOrder(orderId) {
    const { ctx } = this;
    return ctx.service.comment.queryCommentByOrder(orderId);
  }

  getCommentByMemberId(memberId, page, size) {
    const { ctx } = this;
    return ctx.service.comment.queryCommentByMemberId(memberId, page, size);
  }

  getHotelCommentCount(hotelId) {
    const { ctx } = this;
    return ctx.service.comment.queryHotelCommentCount(hotelId);
  }

  getCommentByHotelId(hotelId, page, size, type) {
    const { ctx } = this;
    return ctx.service.comment.queryCommentByHotelId(hotelId, page, size, type);
  }

  async addComment(memberId, orderId, serviceRate, hygieneRate, positionRate, deviceRate, content) {
    const { ctx } = this;
    if (content && content.length > 0) {
      try {
        await ctx.service.baidu.commentAudit(content);
      } catch (e) {
        ctx.logger.error(e);
        throw e;
      }
    }
    let order;
    try {
      order = await ctx.service.order.queryOrderById(orderId);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (!order) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_NOT_EXIST, { memberId, orderId, serviceRate, hygieneRate, positionRate, deviceRate, content });
    }
    if (order.deleteTag === 1) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_INVALID, { memberId, order, serviceRate, hygieneRate, positionRate, deviceRate, content });
    }
    if (order.isCommented === 1) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_COMMENTED, { memberId, order, serviceRate, hygieneRate, positionRate, deviceRate, content });
    }
    if (memberId !== order.OrderMember_id) {
      ctx.helper.errorLog(ctx, ErrorCode.member.ORDER_OWNER_NOT_CONFORMITY, { memberId, order, serviceRate, hygieneRate, positionRate, deviceRate, content });
    }
    return ctx.service.comment.insertOrderComment(orderId, serviceRate, hygieneRate, positionRate, deviceRate, content);
  }

  async replyComment(role, commentId, content) {
    const { ctx } = this;
    let reply;
    try {
      reply = await ctx.service.comment.queryCommentReply(commentId);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (reply) {
      return ctx.service.comment.updateAReply(role, reply.id, content);
    }
    return ctx.service.comment.insertReply(role, commentId, content);
  }

  getCommentSuggestion(id) {
    const { ctx } = this;
    return ctx.service.comment.queryCommentSuggestion(id);
  }

  getCommentViewCount(id) {
    const { ctx } = this;
    return ctx.service.comment.queryCommentViewCount(id);
  }

  getOrderMemberByOrderId(orderId) {
    const { ctx } = this;
    return ctx.service.comment.queryOrderMemberByOrderId(orderId);
  }

  getCommentLikeCount(id) {
    const { ctx } = this;
    return ctx.service.comment.queryCommentLikeCount(id);
  }

  getCommentReply(id) {
    const { ctx } = this;
    return ctx.service.comment.queryCommentReply(id);
  }

  getCommentMember(id) {
    const { ctx } = this;
    return ctx.service.comment.queryCommentMember(id);
  }
}

module.exports = ClientCommentConnector;
