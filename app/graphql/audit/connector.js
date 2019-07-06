'use strict';

const { ErrorCode, AuditType } = require('../../util/constant');

class AuditConnector {
  constructor(ctx) {
    this.ctx = ctx;
  }

  async getAuditName(type, tableId) {
    const { ctx } = this;
    if ([ AuditType.LICENSE, AuditType.BASE_HOTEL_INFO, AuditType.HIGHER_HOTEL_INFO ].includes(type)) {
      const hotel = await ctx.connector.hotel.getHotelById(tableId);
      return hotel.name + hotel.subName;
    } else if (type === AuditType.ROOM_TYPE) {
      const hotel = await ctx.service.hotel.queryHotelByRoomType(tableId);
      return hotel.name + hotel.subName;
    } else if (type === AuditType.COMMENT) {
      return (await ctx.service.member.queryMemberByCommentId(tableId)).nickname;
    }
    return '';
  }

  getLicenseAudit(hotelId) {
    const { ctx } = this;
    return ctx.service.audit.queryAuditByType(AuditType.LICENSE, hotelId);
  }

  getBaseHotelInfoAudit(hotelId) {
    const { ctx } = this;
    return ctx.service.audit.queryAuditByType(AuditType.BASE_HOTEL_INFO, hotelId);
  }

  getHigherHotelInfoAudit(hotelId) {
    const { ctx } = this;
    return ctx.service.audit.queryAuditByType(AuditType.HIGHER_HOTEL_INFO, hotelId);
  }

  getRoomTypeAudit(roomTypeId) {
    const { ctx } = this;
    return ctx.service.audit.queryAuditByType(AuditType.ROOM_TYPE, roomTypeId);
  }

  getCommentAudit(commentId) {
    const { ctx } = this;
    return ctx.service.audit.queryAuditByType(AuditType.COMMENT, commentId);
  }

  getMerchandiseAudit(merchandiseId) {
    const { ctx } = this;
    return ctx.service.audit.queryAuditByType(AuditType.MERCHANDISE, merchandiseId);
  }

  getRequestAudit(type, status, page, size) {
    const { ctx } = this;
    return ctx.service.audit.queryRequestAudit(type, status, page, size);
  }

  getUpcomingAuditCount() {
    const { ctx } = this;
    return ctx.service.audit.queryUpcomingAuditCount();
  }

  async auditRequest(role, id, status, suggestion) {
    const { ctx } = this;
    let audit;
    try {
      audit = await ctx.service.audit.queryAuditById(id);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (!audit) {
      ctx.helper.errorLog(ctx, ErrorCode.audit.AUDIT_NOT_EXIST, { role, id, status, suggestion });
    }
    if (audit.deleteTag === 1) {
      ctx.helper.errorLog(ctx, ErrorCode.audit.AUDIT_INVALID, { role, audit, status, suggestion });
    }
    if (audit.status !== 0) {
      ctx.helper.errorLog(ctx, ErrorCode.audit.AUDIT_PROCESSED, { role, audit, status, suggestion });
    }
    try {
      if (suggestion && suggestion.length > 0) {
        await ctx.service.baidu.commentAudit(suggestion);
      }
      return await ctx.service.audit.auditRequested(role, audit, status, suggestion);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }
}

module.exports = AuditConnector;
