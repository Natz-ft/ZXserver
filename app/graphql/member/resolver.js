'use strict';

const { Role } = require('../../util/constant');
const mysqlUtil = require('../../util/mysql');

module.exports = {
  CommentMember: {
    level({ _MemberLevel_id }, _, ctx) {
      return ctx.connector.member.getMemberLevel(_MemberLevel_id);
    },
  },
  CheckInMan: {
    isSelf({ isSelf }) {
      return isSelf === 1;
    },
    name({ name }, _, ctx) {
      return mysqlUtil.aesDecrypt(ctx, name);
    },
    idCard({ idCard }, _, ctx) {
      if (idCard) {
        return ctx.helper.omit(mysqlUtil.aesDecrypt(ctx, idCard), 3, { end: 4, replacer: '*'.repeat(11) });
      }
      return null;
    },
    tag({ idCard }) {
      return idCard;
    },
  },
  MemberCoupon: {
    coupon({ Coupon_id }, _, ctx) {
      return ctx.connector.coupon.getCoupon(Coupon_id);
    },
  },
  Member: {
    openId({ id }, _, ctx) {
      return ctx.connector.member.getMemberOpenId(id);
    },
    level({ _MemberLevel_id }, _, ctx) {
      return ctx.connector.member.getMemberLevel(_MemberLevel_id);
    },
    phone({ phone }, _, ctx) {
      return phone ? ctx.helper.omit(mysqlUtil.aesDecrypt(ctx, phone), 3, { end: 4, replacer: '*'.repeat(4) }) : phone;
    },
    isRead({ isRead }) {
      return isRead === 1;
    },
    checkInMen({ id }, _, ctx) {
      return ctx.connector.member.getMemberCheckInMan(id);
    },
    coupons({ id }, _, ctx) {
      return ctx.connector.member.getMemberCoupon(id);
    },
    onProcessingOrders({ id }, _, ctx) {
      return ctx.connector.member.getOnProcessingOrder(id);
    },
    collections({ id }, _, ctx) {
      return ctx.connector.member.getMemberCollectionView(id, 0);
    },
    views({ id }, _, ctx) {
      return ctx.connector.member.getMemberCollectionView(id, 1);
    },
  },
  PublicMember: {
    level({ _MemberLevel_id }, _, ctx) {
      return ctx.connector.member.getMemberLevel(_MemberLevel_id);
    },
  },
  Query: {
    memberOrders(_, { id, statuses, page, size }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.MEMBER ],
          func: () => {
            return ctx.connector.member.getMemberOrder(id, statuses, page, size);
          },
        },
      ], id);
    },
    memberHotels(_, { id, longitude, latitude, page, size, type }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.MEMBER ],
          func: () => {
            return ctx.connector.member.getMemberHotel(id, longitude, latitude, page, size, type);
          },
        },
      ], id);
    },
    memberNotCommentOrders(_, { id, page, size }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.MEMBER ],
          func: () => {
            return ctx.connector.member.getMemberNotCommentOrder(id, page, size);
          },
        },
      ], id);
    },
    member(_, { id }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.MEMBER ],
          func: () => {
            return ctx.connector.member.getMemberById(id);
          },
        },
      ], id);
    },
    authMember(_, { orderRoomId }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.MEMBER, Role.VISITOR ],
          func: () => {
            return ctx.connector.member.getAuthMember(orderRoomId);
          },
        },
      ]);
    },
  },
  Mutation: {
    phoneLogin(_, { phone, code, memberId, source, authCode }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.MEMBER, Role.VISITOR ],
          func: () => {
            return ctx.connector.member.memberPhoneLogin(phone, code, memberId, source, authCode);
          },
        },
      ]);
    },
    bindPhone(_, { id, phone, code }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.MEMBER ],
          func: () => {
            return ctx.connector.member.bindMemberPhone(id, phone, code);
          },
        },
      ], id);
    },
    nickname(_, { id, nickname }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.MEMBER ],
          func: () => {
            return ctx.connector.member.changeNickname(id, nickname);
          },
        },
      ], id);
    },
    addCheckInMan(_, { id, name, idCard }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.MEMBER ],
          func: () => {
            return ctx.connector.member.addCheckInMenWithNameAndIdCard(id, name, idCard);
          },
        },
      ], id);
    },
    deleteCheckInMan(_, { id, checkInManId }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.MEMBER ],
          func: () => {
            return ctx.connector.member.deleteMemberCheckInMan(id, checkInManId);
          },
        },
      ], id);
    },
    collectHotel(_, { id, hotelId }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.MEMBER ],
          func: () => {
            return ctx.connector.member.memberCollectHotel(id, hotelId);
          },
        },
      ], id);
    },
    cancelCollectHotel(_, { id, memberCollectionIds }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.MEMBER ],
          func: () => {
            return ctx.connector.member.memberCancelCollectHotel(id, memberCollectionIds);
          },
        },
      ], id);
    },
    clearViews(_, { id }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.MEMBER ],
          func: () => {
            return ctx.connector.member.clearMemberViews(id);
          },
        },
      ], id);
    },
    likeComment(_, { commentId }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.MEMBER ],
          func: role => {
            return ctx.connector.member.memberLikeComment(role, commentId);
          },
        },
      ]);
    },
  },
};
