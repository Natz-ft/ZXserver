'use strict';

const { Role } = require('../../util/constant');

module.exports = {
  AdminComment: {
    orderId({ Order_id }) {
      return Order_id;
    },
    viewCount({ id }, _, ctx) {
      return ctx.connector.comment.getCommentViewCount(id);
    },
    member({ Order_id }, _, ctx) {
      return ctx.connector.comment.getOrderMemberByOrderId(Order_id);
    },
    reply({ id }, _, ctx) {
      return ctx.connector.comment.getCommentReply(id);
    },
  },
  AdminReply: {
    commentId({ Comment_id }) {
      return Comment_id;
    },
    staff({ Staff_id }, _, ctx) {
      return ctx.connector.comment.getStaffById(Staff_id);
    },
  },
  Comment: {
    suggestion({ id, status }, _, ctx) {
      if (status === 2) {
        return ctx.connector.comment.getCommentSuggestion(id);
      }
      return null;
    },
    viewCount({ id }, _, ctx) {
      return ctx.connector.comment.getCommentViewCount(id);
    },
    likeCount({ id }, _, ctx) {
      return ctx.connector.comment.getCommentLikeCount(id);
    },
    reply({ id }, _, ctx) {
      return ctx.connector.comment.getCommentReply(id);
    },
    member({ id }, _, ctx) {
      return ctx.connector.comment.getCommentMember(id);
    },
    order({ Order_id }, _, ctx) {
      return ctx.connector.order.getOrderById(Order_id);
    },
  },
  Reply: {
    commentId({ Comment_id }) {
      return Comment_id;
    },
  },
  Query: {
    comment(_, { id }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.MEMBER, Role.VISITOR, Role.HOTEL_STAFF, Role.SYSTEM_STAFF ],
          func: () => {
            return ctx.connector.comment.getCommentById(id);
          },
        },
      ]);
    },
    commentByOrder(_, { orderId }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.MEMBER ],
          func: () => {
            return ctx.connector.comment.getCommentByOrder(orderId);
          },
        },
      ]);
    },
    memberComments(_, { memberId, page, size }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.MEMBER ],
          func: () => {
            return ctx.connector.comment.getCommentByMemberId(memberId, page, size);
          },
        },
      ], memberId);
    },
    hotelCommentCount(_, { hotelId }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.MEMBER, Role.VISITOR, Role.HOTEL_STAFF, Role.SYSTEM_STAFF ],
          func: () => {
            return ctx.connector.comment.getHotelCommentCount(hotelId);
          },
        },
      ]);
    },
    hotelComments(_, { hotelId, page, size, type }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.HOTEL_STAFF, Role.SYSTEM_STAFF, Role.MEMBER, Role.VISITOR ],
          func: () => {
            return ctx.connector.comment.getCommentByHotelId(hotelId, page, size, type);
          },
        },
      ]);
    },
    hotelAdminComments(_, { hotelId, page, size, type }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.comment.getCommentByHotelId(hotelId, page, size, type);
          },
        },
      ]);
    },
  },
  Mutation: {
    comment(_, { memberId, orderId, serviceRate, hygieneRate, positionRate, deviceRate, content }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.MEMBER ],
          func: () => {
            return ctx.connector.comment.addComment(memberId, orderId, serviceRate, hygieneRate, positionRate, deviceRate, content);
          },
        },
      ], memberId);
    },
    reply(_, { commentId, content }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.HOTEL_STAFF ],
          func: role => {
            return ctx.connector.comment.replyComment(role, commentId, content);
          },
        },
      ]);
    },
  },
};
