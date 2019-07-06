'use strict';
const { Role } = require('../../util/constant');

module.exports = {
  RequestCheckIn: {
    orderId({ Order_id }) {
      return Order_id;
    },
    originMember({ OriginMember_id }, _, ctx) {
      return ctx.connector.share.getMember(OriginMember_id);
    },
    targetMember({ TargetMember_id }, _, ctx) {
      return ctx.connector.share.getMember(TargetMember_id);
    },
    isConfirmed({ isConfirmed }) {
      return isConfirmed === 1;
    },
    checkInMan({ TargetMember_id }, _, ctx) {
      return ctx.connector.share.getCheckInManByMemberId(TargetMember_id);
    },
  },
  RequestAuthority: {
    orderRoom({ OrderRoom_id }, _, ctx) {
      return ctx.connector.share.getOrderRoom(OrderRoom_id);
    },
    originMember({ OriginMember_id }, _, ctx) {
      return ctx.connector.share.getMember(OriginMember_id);
    },
    targetMember({ TargetMember_id }, _, ctx) {
      return ctx.connector.share.getMember(TargetMember_id);
    },
    isConfirmed({ isConfirmed }) {
      return isConfirmed === 1;
    },
    checkInMan({ Member_id }, _, ctx) {
      return ctx.connector.share.getCheckInManByMemberId(Member_id);
    },
  },
  Query: {
    requestCheckInInfo(_, { orderId, memberId }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.MEMBER ],
          func: () => {
            return ctx.connector.share.getRequestCheckInInfo(orderId, memberId);
          },
        },
      ]);
    },
    requestAuthorityInfo(_, { orderRoomId, openId }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.MEMBER ],
          func: () => {
            return ctx.connector.share.getRequestAuthorityInfo(orderRoomId, openId);
          },
        },
      ]);
    },
    requestCheckIns(_, { orderId }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.MEMBER ],
          func: () => {
            return ctx.connector.share.getRequestCheckIns(orderId);
          },
        },
      ]);
    },
    requestAuthorities(_, { orderRoomId }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.MEMBER ],
          func: () => {
            return ctx.connector.share.getRequestAuthorityCheckIn(orderRoomId);
          },
        },
      ]);
    },
    isAuthorMan(_, { originMemberId, orderRoomId }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.MEMBER ],
          func: () => {
            return ctx.connector.share.getIsAuthorMan(originMemberId, orderRoomId);
          },
        },
      ]);
    },
  },
  Mutation: {
    requestCheckIn(_, { orderId, originMemberId, targetMemberId, name, idCard }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.MEMBER ],
          func: () => {
            return ctx.connector.share.requestCheckInOrder(orderId, originMemberId, targetMemberId, name, idCard);
          },
        },
      ], targetMemberId);
    },
    requestAuthority(_, { orderRoomId, originMemberId, targetMemberId }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.MEMBER ],
          func: () => {
            return ctx.connector.share.requestRoomAuthority(orderRoomId, originMemberId, targetMemberId);
          },
        },
      ], targetMemberId);
    },
    confirmAuthority(_, { orderRoomId, originMemberId, targetMemberId }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.MEMBER ],
          func: () => {
            return ctx.connector.share.confirmShareAuthority(orderRoomId, originMemberId, targetMemberId);
          },
        },
      ], originMemberId);
    },
  },
};
