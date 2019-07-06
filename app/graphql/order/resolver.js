'use strict';

const { Role } = require('../../util/constant');
const mysqlUtil = require('../../util/mysql');

module.exports = {
  OrderPrice: {
    orderId({ Order_id }) {
      return Order_id;
    },
  },
  CommentOrder: {
    hotel({ RoomType_id }, _, ctx) {
      return ctx.connector.order.getHotelByRoomType(RoomType_id);
    },
    roomType({ RoomType_id }, _, ctx) {
      return ctx.connector.order.getOrderRoomType(RoomType_id);
    },
  },
  OrderStatusTimeLine: {
    orderId({ Order_id }) {
      return Order_id;
    },
    status({ _OrderStatus_id }) {
      return _OrderStatus_id;
    },
  },
  OrderTransaction: {
    transactionAction({ _TransactionAction_id }) {
      return _TransactionAction_id;
    },
    orderId({ Order_id }) {
      return Order_id;
    },
  },
  Order: {
    orderMember({ OrderMember_id }, _, ctx) {
      return ctx.connector.order.getOrderMember(OrderMember_id);
    },
    contact({ contact }, _, ctx) {
      return mysqlUtil.aesDecrypt(ctx, contact);
    },
    orderPrices({ id }, _, ctx) {
      return ctx.connector.order.getOrderPriceByOrderId(id);
    },
    status({ CurrentStatus_id }) {
      return CurrentStatus_id;
    },
    phone({ phone }, _, ctx) {
      return ctx.helper.omit(mysqlUtil.aesDecrypt(ctx, phone), 3, { end: 4, replacer: '*'.repeat(4) });
    },
    isLocked({ isLocked }) {
      return isLocked === 1;
    },
    isCommented({ isCommented }) {
      return isCommented === 1;
    },
    isConsumed({ isConsumed }) {
      return isConsumed === 1;
    },
    hotel({ RoomType_id }, _, ctx) {
      return ctx.connector.order.getHotelByRoomType(RoomType_id);
    },
    roomType({ RoomType_id }, _, ctx) {
      return ctx.connector.order.getOrderRoomType(RoomType_id);
    },
    orderRooms({ id }, _, ctx) {
      return ctx.connector.order.getOrderRoomByOrderId(id);
    },
    statuses({ id }, _, ctx) {
      return ctx.connector.order.getOrderStatusTimeLine(id);
    },
    transactions({ id }, _, ctx) {
      return ctx.connector.order.getOrderTransaction(id);
    },
    parentId({ parent_id }) {
      return parent_id;
    },
  },
  OnProcessingOrder: {
    status({ CurrentStatus_id }) {
      return CurrentStatus_id;
    },
  },
  Query: {
    order(_, { id }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.MEMBER ],
          func: () => {
            return ctx.connector.order.getOrderById(id);
          },
        },
      ]);
    },
    orderChildren(_, { id }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.MEMBER ],
          func: () => {
            return ctx.connector.order.getOrderChildren(id);
          },
        },
      ]);
    },
    orders(_, __, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM ],
          func: () => {
            return ctx.connector.order.getAllOrder();
          },
        },
      ]);
    },
    orderStatus(_, { id }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.MEMBER, Role.VISITOR ],
          func: () => {
            return ctx.connector.order.getOrderStatus(id);
          },
        },
      ]);
    },
    hotelOrders(_, { hotelId, status, page, size }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.order.getHotelOrder(hotelId, status, page, size);
          },
        },
      ]);
    },
  },
  Mutation: {
    order(_, fields, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.MEMBER ],
          func: () => {
            return ctx.connector.order.orderRoom(fields);
          },
        },
      ], fields.orderMemberId);
    },
    cancelOrder(_, { id, memberId }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.MEMBER ],
          func: () => {
            return ctx.connector.order.cancelMemberOrder(id, memberId);
          },
        },
      ], memberId);
    },
    checkout(_, { orderRoomIds }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.MEMBER ],
          func: role => {
            return ctx.connector.order.checkoutOrderRoom(role, orderRoomIds);
          },
        },
      ]);
    },
    stay(_, fields, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.MEMBER ],
          func: role => {
            return ctx.connector.order.stayRoom(role, fields);
          },
        },
      ], fields.orderMemberId);
    },
    confirmCheckInMen(_, { id, rooms }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.MEMBER ],
          func: role => {
            return ctx.connector.order.confirmOrderRoomCheckInMen(role, id, rooms);
          },
        },
      ]);
    },
    memberOpenLock(_, { orderRoomId }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.MEMBER ],
          func: role => {
            return ctx.connector.order.memberOpenRoomLock(role, orderRoomId);
          },
        },
      ]);
    },
    confirmOrder(_, { id, roomIds }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.order.confirmHotelOrder(id, roomIds);
          },
        },
      ]);
    },
    rejectOrder(_, { id, reason }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.order.rejectHotelOrder(id, reason);
          },
        },
      ]);
    },
  },
};
