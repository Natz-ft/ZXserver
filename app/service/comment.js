'use strict';

const Service = require('egg').Service;
const mysqlUtil = require('../util/mysql');
const { AuditType } = require('../util/constant');

class CommentService extends Service {

  async queryCommentById(id) {
    const { ctx } = this;
    try {
      return await mysqlUtil.get(ctx, 'Comment', { id });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryCommentByOrder(orderId) {
    const { ctx } = this;
    try {
      return await mysqlUtil.get(ctx, 'Comment', { Order_id: orderId });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryCommentByMemberId(memberId, page, size) {
    const { ctx } = this;
    const offset = (page - 1) * size;
    const sql1 = 'select count(Comment.id) as total from Comment, `Order` where `Order`.OrderMember_id = :memberId and `Order`.deleteTag = 0\n' +
      'and Comment.Order_id = `Order`.id and Comment.deleteTag = 0';
    const sql2 = 'select Comment.* from Comment, `Order` where `Order`.OrderMember_id = :memberId and `Order`.deleteTag = 0 ' +
      'and Comment.Order_id = `Order`.id and Comment.deleteTag = 0 order by Comment.createdTime desc limit :offset, :size';
    try {
      return {
        total: (await mysqlUtil.query(ctx, sql1, { memberId }))[0].total,
        comments: await mysqlUtil.query(ctx, sql2, { memberId, offset, size }),
      };
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryHotelCommentCount(hotelId) {
    const { ctx } = this;
    const sql = 'select count(*) as total, count(Comment.rate >= 40 or null) as good, count((Comment.rate >= 20 and Comment.rate < 40) or null) as middle, ' +
      'count(Comment.rate < 20 or null) as bad from Comment, `Order`, RoomType where RoomType.Hotel_id = :hotelId and `Order`.RoomType_id = RoomType.id ' +
      'and `Order`.deleteTag = 0 and Comment.Order_id = `Order`.id and Comment.deleteTag = 0';
    try {
      return (await mysqlUtil.query(ctx, sql, { hotelId }))[0];
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryCommentByHotelId(hotelId, page, size, type) {
    const { ctx } = this;
    let high = 51;
    let low = 0;
    if (type === 0) {
      low = 40;
    } else if (type === 1) {
      high = 40;
      low = 20;
    } else if (type === 2) {
      high = 20;
    }
    const offset = (page - 1) * size;
    const sql = 'select Comment.* from Comment, `Order`, RoomType where RoomType.Hotel_id = :hotelId and `Order`.RoomType_id = RoomType.id ' +
      'and `Order`.deleteTag = 0 and Comment.Order_id = `Order`.id and Comment.deleteTag = 0 and Comment.status = 1 ' +
      'and rate < :high and rate >= :low order by Comment.createdTime desc';
    try {
      const comments = await mysqlUtil.query(ctx, sql, { hotelId, high, low });
      return {
        total: comments.length,
        comments: comments.slice(offset, offset + size),
      };
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async insertOrderComment(orderId, serviceRate, hygieneRate, positionRate, deviceRate, content) {
    const { ctx } = this;
    const rows = {
      Order_id: orderId,
      rate: (serviceRate + hygieneRate + positionRate + deviceRate) / 4,
      serviceRate,
      hygieneRate,
      positionRate,
      deviceRate,
      content,
      createdTime: new Date().getTime(),
    };
    try {
      const id = await mysqlUtil.beginTransactionScope(ctx, async conn => {
        const id = await mysqlUtil.connInsert(ctx, 'Comment', rows, conn);
        await mysqlUtil.connUpdate(ctx, 'Order', {
          isCommented: 1,
        }, { where: { id: orderId } }, conn);
        return id;
      });
      await mysqlUtil.insert(ctx, 'Audit', {
        _AuditType_id: AuditType.COMMENT,
        tableId: id,
        modified: JSON.stringify(rows),
        createdTime: new Date().getTime(),
      });
      return id;
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async insertReply(role, commentId, content) {
    const { ctx } = this;
    const time = new Date().getTime();
    try {
      return await mysqlUtil.insert(ctx, 'Reply', {
        Comment_id: commentId,
        Staff_id: role.id,
        content,
        updatedTime: time,
        createdTime: time,
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async updateAReply(role, id, content) {
    const { ctx } = this;
    try {
      return await mysqlUtil.update(ctx, 'Reply', {
        Staff_id: role.id,
        content,
        updatedTime: new Date().getTime(),
      }, { where: { id } });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryCommentSuggestion(id) {
    const { ctx } = this;
    try {
      return (await mysqlUtil.get(ctx, 'Audit', {
        _AuditType_id: AuditType.COMMENT,
        tableId: id,
      })).suggestion;
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryCommentViewCount(id) {
    const { ctx, app } = this;
    try {
      return await app.redis.get('db1').zcard(`comment_view:${id}`);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryOrderMemberByOrderId(orderId) {
    const { ctx } = this;
    const sql = 'select Member.* from Member, `Order` where `Order`.id = :orderId and OrderMember_id = Member.id';
    try {
      return (await mysqlUtil.query(ctx, sql, { orderId }))[0];
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryCommentLikeCount(id) {
    const { ctx } = this;
    try {
      return await mysqlUtil.count(ctx, 'CommentLike', { Comment_id: id });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryCommentReply(id) {
    const { ctx } = this;
    try {
      return await mysqlUtil.get(ctx, 'Reply', { Comment_id: id });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryCommentMember(id) {
    const { ctx } = this;
    const sql = 'select Member.* from Member, `Order`, Comment where Comment.id = :id and Comment.Order_id = `Order`.id ' +
      'and `Order`.OrderMember_id = Member.id';
    try {
      return (await mysqlUtil.query(ctx, sql, { id }))[0];
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }
}

module.exports = CommentService;
