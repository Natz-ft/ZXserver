'use strict';

const { Role } = require('../../util/constant');

module.exports = {
  Audit: {
    auditTypeId({ _AuditType_id }) {
      return _AuditType_id;
    },
    staffId({ Staff_id }) {
      return Staff_id;
    },
    name({ _AuditType_id, tableId }, _, ctx) {
      return ctx.connector.audit.getAuditName(_AuditType_id, tableId);
    },
  },
  Query: {
    licenseAudit(_, { hotelId }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.audit.getLicenseAudit(hotelId);
          },
        },
      ]);
    },
    baseHotelInfoAudit(_, { hotelId }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.audit.getBaseHotelInfoAudit(hotelId);
          },
        },
      ]);
    },
    higherHotelInfoAudit(_, { hotelId }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.audit.getHigherHotelInfoAudit(hotelId);
          },
        },
      ]);
    },
    roomTypeAudit(_, { roomTypeId }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.audit.getRoomTypeAudit(roomTypeId);
          },
        },
      ]);
    },
    commentAudit(_, { commentId }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.MEMBER ],
          func: () => {
            return ctx.connector.audit.getCommentAudit(commentId);
          },
        },
      ]);
    },
    merchandiseAudit(_, { merchandiseId }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.audit.getMerchandiseAudit(merchandiseId);
          },
        },
      ]);
    },
    requestAudits(_, { type, status, page, size }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.SYSTEM_STAFF ],
          func: () => {
            return ctx.connector.audit.getRequestAudit(type, status, page, size);
          },
        },
      ]);
    },
    upcomingAuditCount(_, __, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.SYSTEM_STAFF ],
          func: () => {
            return ctx.connector.audit.getUpcomingAuditCount();
          },
        },
      ]);
    },
  },
  Mutation: {
    audit(_, { id, status, suggestion }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM_STAFF ],
          func: role => {
            return ctx.connector.audit.auditRequest(role, id, status, suggestion);
          },
        },
      ]);
    },
  },
};
