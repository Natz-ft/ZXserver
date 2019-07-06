'use strict';

const dayjs = require('dayjs');
const lodash = require('lodash');
const mysqlUtil = require('../../util/mysql');
const { ErrorCode, OrderStatus, AuthorityType } = require('../../util/constant');

const ONE_DAY = 24 * 60 * 60 * 1000;

class OrderConnector {
  constructor(ctx) {
    this.ctx = ctx;
  }

  getOrderById(id) {
    const { ctx } = this;
    return ctx.service.order.queryOrderById(id);
  }

  getOrderChildren(id) {
    const { ctx } = this;
    return ctx.service.order.queryOrderChildren(id);
  }

  getAllOrder() {
    const { ctx } = this;
    return ctx.service.order.queryAllOrder();
  }

  async getOrderStatus(id) {
    const { ctx } = this;
    let order;
    try {
      order = await ctx.service.order.queryOrderById(id);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (!order) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_NOT_EXIST, { id });
    }
    if (order.deleteTag === 1) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_INVALID, { order });
    }
    return order.CurrentStatus_id;
  }

  getHotelOrder(hotelId, status, page, size) {
    const { ctx } = this;
    return ctx.service.order.queryHotelOrder(hotelId, status, page, size);
  }

  async orderRoom(fields) {
    const { ctx } = this;
    const { memberSource, orderMemberId, contact, memberCouponId, roomTypeId, roomCount, startTime,
      endTime, hotelCancelTime, orderPrices, deposit, totalMoney, realTotalMoney, phone } = fields;
    // 验证优惠券合法
    let coupon;
    if (memberCouponId) {
      try {
        coupon = await ctx.service.coupon.verifyMemberCoupon(memberCouponId, orderMemberId);
      } catch (e) {
        ctx.logger.error(e);
        throw e;
      }
      const couponLegitimate = coupon && coupon.notUsed && coupon.notOthers && coupon.inTime && coupon.inPeriod;
      if (!couponLegitimate) {
        ctx.helper.errorLog(ctx, ErrorCode.coupon.COUPON_INVALID, coupon);
      }
    }
    // 计算价格合法
    const days = dayjs(endTime).diff(dayjs(startTime), 'day');
    let prices;
    let specialPrices;
    let weekend;
    try {
      prices = (await ctx.service.room.queryRoomTypePrice(roomTypeId)).map(price => price.price);
      specialPrices = await ctx.service.room.querySpecialPriceInTime(roomTypeId, startTime, endTime);
      const roomType = await ctx.service.room.queryRoomTypeById(roomTypeId);
      weekend = JSON.parse(await ctx.service.hotel.queryWeekendByHotelId(roomType.Hotel_id));
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    const dayPrices = Array.from({ length: days }).map((_, i) => {
      const time = startTime + i * ONE_DAY;
      const day = dayjs(time);
      const index = 2 * day.month() + (weekend.includes(day.day()) ? 1 : 0);
      const specialPrice = specialPrices.find(specialPrice => specialPrice.startTime <= time && specialPrice.endTime > time);
      return {
        time,
        price: specialPrice ? specialPrice.price : prices[index],
      };
    });
    const newOrderPrices = [{
      startTime: dayPrices[0].time,
      endTime: dayPrices[0].time + ONE_DAY,
      price: dayPrices[0].price,
    }];
    let index = 0;
    for (let i = 1; i < dayPrices.length; i++) {
      if (dayPrices[i].price === newOrderPrices[index].price) {
        newOrderPrices[index].endTime += ONE_DAY;
      } else {
        newOrderPrices.push({
          startTime: dayPrices[i].time,
          endTime: dayPrices[i].time + ONE_DAY,
          price: dayPrices[i].price,
        });
        index += 1;
      }
    }
    if (!lodash.isEqual(orderPrices, newOrderPrices)) {
      ctx.helper.errorLog(ctx, ErrorCode.order.PRICE_INVALID, { fields, days, newOrderPrices });
    }
    let total = 0;
    newOrderPrices.forEach(newOrderPrice => {
      total += dayjs(newOrderPrice.endTime).diff(dayjs(newOrderPrice.startTime), 'day') * newOrderPrice.price;
    });
    if ((total * roomCount + deposit !== realTotalMoney) || (realTotalMoney - (coupon ? coupon.discount : 0) !== totalMoney)) {
      ctx.helper.errorLog(ctx, ErrorCode.order.PRICE_INVALID, { fields, days, newOrderPrices, total });
    }
    // 记录手机号
    let aesPhone = phone;
    if (phone.indexOf('*') > -1) {
      try {
        aesPhone = (await ctx.service.member.queryMemberById(orderMemberId)).phone;
      } catch (e) {
        ctx.logger.error(e);
        throw e;
      }
    } else {
      aesPhone = mysqlUtil.aesEncrypt(ctx, phone);
    }
    // 当前房型剩余
    let count;
    try {
      count = (await ctx.service.room.queryFreeRoom(roomTypeId, startTime, endTime)).length;
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    // 下单
    if (count >= roomCount) {
      try {
        const id = await ctx.service.order.createOrder(memberSource, orderMemberId, contact, memberCouponId,
          roomTypeId, roomCount, startTime, endTime, hotelCancelTime, orderPrices, deposit,
          totalMoney, realTotalMoney, aesPhone);
        return ctx.service.order.queryOrderById(id);
      } catch (e) {
        ctx.logger.error(e);
        throw e;
      }
    } else {
      ctx.helper.errorLog(ctx, ErrorCode.order.NOT_ENOUGH_ROOM, { count, roomCount });
    }
  }

  async cancelMemberOrder(id, memberId) {
    const { ctx } = this;
    let order;
    try {
      order = await ctx.service.order.queryOrderHotelById(id);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (memberId !== order.OrderMember_id) {
      ctx.helper.errorLog(ctx, ErrorCode.member.ORDER_OWNER_NOT_CONFORMITY, { order, memberId });
    }
    if (![ OrderStatus.NOT_PAY, OrderStatus.NOT_CONFIRM, OrderStatus.NOT_CHECK_IN ].includes(order.CurrentStatus_id)) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_CAN_NOT_CANCEL, { order, memberId });
    }
    if (OrderStatus.NOT_PAY === order.CurrentStatus_id) {
      return ctx.service.order.cancelNotPayOrderById(id, order.MemberCoupon_id);
    }
    try {
      const orderTransaction = await ctx.service.transaction.queryPaidOrderTransactionByOrderIdAndMoney(order.id, order.totalMoney);
      await ctx.service.wechat.refund({
        id: order.id,
        totalMoney: order.totalMoney,
      }, orderTransaction.id, order.totalMoney);
      await ctx.service.order.changeOrderStatus(order.id, OrderStatus.TOTAL_REFUND);
      if (order.MemberCoupon_id) {
        await ctx.service.coupon.unlockMemberCouponByMemberCouponId(order.MemberCoupon_id);
      }
      const wechatConfig = ctx.app.config.wechat;
      await ctx.service.wechat.sendTemplateMessage(order.openId, wechatConfig.template.refundNotify, order.prepayId, {
        keyword1: {
          value: order.hotelName,
        },
        keyword2: {
          value: order.roomTypeName,
        },
        keyword3: {
          value: `${order.roomCount}间`,
        },
        keyword4: {
          value: dayjs(order.startTime).format('YYYY年MM月DD日'),
        },
        keyword5: {
          value: dayjs(order.endTime).format('YYYY年MM月DD日'),
        },
        keyword6: {
          value: `${Math.round(order.deposit / 100)}元`,
        },
        keyword7: {
          value: `${Math.round(order.totalMoney / 100)}元`,
        },
        keyword8: {
          value: `${Math.round(order.totalMoney / 100)}元`,
        },
        keyword9: {
          value: '用户入住前取消',
        },
        keyword10: {
          value: dayjs().format('YYYY年MM月DD日'),
        },
      });
      const roomType = await ctx.service.room.queryRoomTypeById(order.RoomType_id);
      await ctx.service.io.emitHotel(roomType.Hotel_id, 'order.cancel', { order: await ctx.service.order.queryOrderDetailById(order.id) });
      return OrderStatus.TOTAL_REFUND;
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async checkoutOrderRoom(role, orderRoomIds) {
    const { ctx } = this;
    if (orderRoomIds.length > 0) {
      const time = new Date().getTime();
      let order;
      try {
        order = await ctx.service.order.queryOrderByOrderRoomId(orderRoomIds[0]);
      } catch (e) {
        ctx.logger.error(e);
        throw e;
      }
      if (!order) {
        ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_NOT_EXIST, { role, orderRoomIds });
      }
      if (order.deleteTag === 1) {
        ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_INVALID, { role, orderRoomIds, order });
      }
      if (![ OrderStatus.NOT_CHECK_IN, OrderStatus.CHECK_IN ].includes(order.CurrentStatus_id)) {
        ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_STATUS_IS_NOT_CHECK_IN_OR_NOT_CHECK_IN, { role, orderRoomIds });
      }
      let roomCheckInMen;
      try {
        const checkInManIds = await ctx.service.member.queryCheckInManIdsByOrderMemberIdAndMemberId(order.OrderMember_id, role.id);
        roomCheckInMen = (await ctx.service.order.queryRoomCheckInManByOrderId(order.id)).filter(roomCheckInMan =>
          checkInManIds.includes(roomCheckInMan.CheckInMan_id) && ((order.OrderMember_id === role.id) ?
            [ AuthorityType.ORDER_PERSON, AuthorityType.HAVE_NO_RIGHT_ORDER_PERSON ].includes(roomCheckInMan.role)
            : roomCheckInMan.role === AuthorityType.AUTHORIZED_PERSON)
        );
      } catch (e) {
        ctx.logger.error(e);
        throw e;
      }
      const allOrderRoomIds = roomCheckInMen.map(roomCheckInMan => roomCheckInMan.OrderRoom_id);
      if (!orderRoomIds.every(orderRoomId => allOrderRoomIds.includes(orderRoomId))) {
        ctx.helper.errorLog(ctx, ErrorCode.member.PART_ROOM_HAVE_NO_RIGHT_CHECK_OUT, { role, orderRoomIds });
      }
      const days = dayjs(order.endTime + parseInt(order.hotelCancelTime.split(':')[0]) * 60 * 60 * 1000 + parseInt(order.hotelCancelTime.split(':')[1]) * 60 * 1000).diff(time, 'day');
      try {
        await ctx.service.order.checkoutOrderRooms(orderRoomIds);
        const roomType = await ctx.service.room.queryRoomTypeById(order.RoomType_id);
        const orderRooms = await ctx.service.order.queryOrderRoomByOrderId(order.id);
        const rooms = [];
        for (let i = 0; i < orderRoomIds.length; i++) {
          rooms.push(await ctx.service.room.queryRoomById(orderRooms.find(orderRoom => orderRoom.id === orderRoomIds[i]).Room_id));
        }
        await ctx.service.io.emitSweeper(roomType.Hotel_id, { rooms });
        if (orderRooms.every(orderRoom => orderRoom.status === 2)) {
          await ctx.service.order.changeOrderStatus(order.id, OrderStatus.PARTIAL_REFUND);
          await ctx.service.io.emitHotel(roomType.Hotel_id, 'order.checkout', { order: await ctx.service.order.queryOrderDetailById(order.id) });
        }
        if (days > 0) {
          const today = new Date();
          const todayTime = dayjs(`${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`).valueOf();
          const orderPrices = await ctx.service.order.queryOrderPriceByTime(order.id, todayTime);
          let money = 0;
          orderPrices.forEach(orderPrice => {
            const days = dayjs(orderPrice.endTime).diff(todayTime <= orderPrice.startTime ? todayTime : orderPrice.startTime, 'day');
            money += days * orderPrice.price;
          });
          const orderTransaction = await ctx.service.transaction.queryPaidOrderTransactionByOrderIdAndMoney(order.id, order.totalMoney);
          await ctx.service.wechat.refund({
            id: order.id,
            totalMoney: order.totalMoney,
          }, orderTransaction.id, orderRoomIds.length * money);
        }
        return await ctx.service.order.queryOrderById(order.id);
      } catch (e) {
        ctx.logger.error(e);
        throw e;
      }
    } else {
      ctx.helper.errorLog(ctx, ErrorCode.order.CHECK_OUT_ROOM_LIST_CAN_NOT_BE_NULL, { role, orderRoomIds });
    }
  }

  async stayRoom(role, fields) {
    const { ctx } = this;
    const { id, orderMemberId, memberCouponId, roomCount, endTime, orderPrices, totalMoney, realTotalMoney, inheritRooms, rooms } = fields;
    let order;
    try {
      order = await ctx.service.order.queryOrderById(id);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    // 验证订单
    if (!order) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_NOT_EXIST, fields);
    }
    if (order.deleteTag === 1) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_INVALID, { fields, order });
    }
    let orderChildren;
    try {
      orderChildren = await ctx.service.order.queryOrderChildren(id);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (orderChildren.some(order => [ OrderStatus.NOT_PAY, OrderStatus.NOT_CONFIRM, OrderStatus.NOT_CHECK_IN, OrderStatus.CHECK_IN ].includes(order.CurrentStatus_id))) {
      ctx.helper.errorLog(ctx, ErrorCode.order.STAY_CONDITION_NOT_CONFORMITY, { fields, order });
    }
    // 验证优惠券合法
    let coupon;
    if (memberCouponId) {
      try {
        coupon = await ctx.service.coupon.verifyMemberCoupon(memberCouponId, orderMemberId);
      } catch (e) {
        ctx.logger.error(e);
        throw e;
      }
      const couponLegitimate = Object.keys(coupon).length > 0 && coupon.notUsed && coupon.notOthers && coupon.inTime && coupon.inPeriod;
      if (!couponLegitimate) {
        ctx.helper.errorLog(ctx, ErrorCode.coupon.COUPON_INVALID, { coupon, fields });
      }
    }
    const days = dayjs(endTime).diff(dayjs(order.endTime), 'day');
    let prices;
    let specialPrices;
    let weekend;
    try {
      prices = (await ctx.service.room.queryRoomTypePrice(order.RoomType_id)).map(price => price.price);
      specialPrices = await ctx.service.room.querySpecialPriceInTime(order.RoomType_id, order.endTime, endTime);
      const roomType = await ctx.service.room.queryRoomTypeById(order.RoomType_id);
      weekend = JSON.parse(await ctx.service.hotel.queryWeekendByHotelId(roomType.Hotel_id));
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    const dayPrices = Array.from({ length: days }).map((_, i) => {
      const time = order.endTime + i * ONE_DAY;
      const day = dayjs(time);
      const index = 2 * day.month() + (weekend.includes(day.day()) ? 1 : 0);
      const specialPrice = specialPrices.find(specialPrice => specialPrice.startTime <= time && specialPrice.endTime > time);
      return {
        time,
        price: specialPrice ? specialPrice.price : prices[index],
      };
    });
    const newOrderPrices = [{
      startTime: dayPrices[0].time,
      endTime: dayPrices[0].time + ONE_DAY,
      price: dayPrices[0].price,
    }];
    let index = 0;
    for (let i = 1; i < dayPrices.length; i++) {
      if (dayPrices[i].price === newOrderPrices[index].price) {
        newOrderPrices[index].endTime += ONE_DAY;
      } else {
        newOrderPrices.push({
          startTime: dayPrices[i].time,
          endTime: dayPrices[i].time + ONE_DAY,
          price: dayPrices[i].price,
        });
        index += 1;
      }
    }
    if (!lodash.isEqual(orderPrices, newOrderPrices)) {
      console.log(order);
      ctx.helper.errorLog(ctx, ErrorCode.order.PRICE_INVALID, { fields, days, newOrderPrices });
    }
    let total = 0;
    newOrderPrices.forEach(newOrderPrice => {
      total += dayjs(newOrderPrice.endTime).diff(dayjs(newOrderPrice.startTime), 'day') * newOrderPrice.price;
    });
    if ((total * roomCount !== realTotalMoney) || (realTotalMoney - (coupon ? coupon.discount : 0) !== totalMoney)) {
      ctx.helper.errorLog(ctx, ErrorCode.order.PRICE_INVALID, { fields, days, newOrderPrices, total });
    }
    // 当前房型剩余
    let freeRooms;
    try {
      freeRooms = (await ctx.service.room.queryFreeRoom(order.RoomType_id, order.endTime, endTime)).map(room => room.id);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    const count = freeRooms.length;
    // 下单
    if (count >= roomCount) {
      try {
        const id = await ctx.service.order.createStayOrder(order, orderMemberId, memberCouponId, roomCount, endTime,
          orderPrices, totalMoney, realTotalMoney, inheritRooms.filter(room => freeRooms.includes(room)), rooms);
        return ctx.service.order.queryOrderById(id);
      } catch (e) {
        ctx.logger.error(e);
        throw e;
      }
    } else {
      ctx.helper.errorLog(ctx, ErrorCode.order.NOT_ENOUGH_ROOM, { count, roomCount });
    }
  }

  async confirmOrderRoomCheckInMen(role, id, rooms) {
    const { ctx } = this;
    let order;
    try {
      order = await ctx.service.order.queryOrderById(id);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (![ OrderStatus.NOT_CHECK_IN, OrderStatus.CHECK_IN ].includes(order.CurrentStatus_id)) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_STATUS_IS_NOT_CHECK_IN_OR_NOT_CHECK_IN, { order, role, rooms });
    }
    const isOrderMember = role.id === order.OrderMember_id;
    let orderCheckInMan;
    let authCheckInMan;
    try {
      orderCheckInMan = await ctx.service.member.queryCheckInManByMemberId(order.OrderMember_id);
      if (!isOrderMember) {
        authCheckInMan = await ctx.service.member.queryCheckInManByMemberId(role.id);
      }
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (!isOrderMember && !authCheckInMan) {
      ctx.helper.errorLog(ctx, ErrorCode.member.AUTH_MAN_NOT_REAL_NAME, { order, role, rooms });
    }
    const ids = [ ...new Set(rooms.reduce((s, i) => ({ checkInMen: [ ...s.checkInMen, ...i.checkInMen ] })).checkInMen) ];
    const newIds = [];
    let roomCheckInMen;
    try {
      if (ids.length > 0) {
        const requestCheckInMen = await mysqlUtil.unionSelect(ctx, 'CheckInMan', ids);
        const memberCheckInMen = await ctx.service.member.queryCheckInMenByMemberId(order.OrderMember_id);
        for (const checkInMan of requestCheckInMen) {
          if (memberCheckInMen.every(memberCheckInMan => memberCheckInMan.idCard !== checkInMan.idCard)) {
            newIds.push(await ctx.service.member.copyCheckInMan(order.OrderMember_id, checkInMan));
          } else {
            newIds.push(checkInMan.id);
          }
        }
      }
      roomCheckInMen = await ctx.service.order.queryRoomCheckInManByOrderId(id);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (isOrderMember) {
      try {
        return await ctx.service.order.updateOrderRoomCheckInMen(id, roomCheckInMen, orderCheckInMan, rooms, ids, newIds);
      } catch (e) {
        ctx.logger.error(e);
        throw e;
      }
    } else if (roomCheckInMen.length === 0) {
      ctx.helper.errorLog(ctx, ErrorCode.member.AUTH_MAN_NOT_CHECK_IN_MAN, { order, role, rooms });
    }
    try {
      const authMemberCheckInManIds = await ctx.service.member.queryCheckInManIdsByMemberId(role.id);
      return await ctx.service.order.updateOrderRoomCheckInMenAuth(id, roomCheckInMen, authMemberCheckInManIds, orderCheckInMan, rooms, ids, newIds);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async memberOpenRoomLock(role, orderRoomId) {
    const { ctx } = this;
    let orderRoom;
    try {
      orderRoom = await ctx.service.order.queryOrderRoomById(orderRoomId);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (!orderRoom) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_ROOM_NOT_EXIST, { role, orderRoomId });
    }
    if (orderRoom.deleteTag === 1) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_ROOM_INVALID, { role, orderRoom });
    }
    if (orderRoom.status === 2) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_ROOM_EXITED, { role, orderRoom });
    }
    let order;
    try {
      order = await ctx.service.order.queryOrderById(orderRoom.Order_id);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (!order) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_NOT_EXIST, { role, orderRoom });
    }
    if (order.deleteTag === 1) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_INVALID, { role, orderRoom, order });
    }
    if (![ OrderStatus.NOT_CHECK_IN, OrderStatus.CHECK_IN ].includes(order.CurrentStatus_id)) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_STATUS_IS_NOT_CHECK_IN_OR_NOT_CHECK_IN, { role, orderRoom, order });
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
      ctx.helper.errorLog(ctx, ErrorCode.member.HAVE_NO_RIGHT_OF_THIS_ORDER_ROOM, { role, orderRoom, order });
    }
    try {
      // todo 开锁
      if (order.CurrentStatus_id === OrderStatus.NOT_CHECK_IN) {
        await ctx.service.order.changeOrderStatus(order.id, OrderStatus.CHECK_IN);
      }
      return true;
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async confirmHotelOrder(id, roomIds) {
    const { ctx, app } = this;
    let order;
    try {
      order = await ctx.service.order.queryOrderById(id);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (!order) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_NOT_EXIST, { id, roomIds });
    }
    if (order.deleteTag === 1) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_INVALID, { order, roomIds });
    }
    if (order.CurrentStatus_id !== OrderStatus.NOT_CONFIRM) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_STATUS_ABNORMAL, { order, roomIds });
    }
    if (roomIds.length !== order.roomCount) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_ROOM_COUNT_NOT_CONFORMITY, { order, roomIds });
    }
    try {
      await ctx.service.order.confirmOrderRoom(id, roomIds, order.startTime, order.endTime);
      if (order.parent_id) {
        const rooms = JSON.parse(await app.redis.get('db0').get(`stay:${id}`));
        if (rooms.length > 0) {
          const parentRoomCheckInMen = await ctx.service.order.queryRoomCheckInManByOrderId(order.parent_id);
          const orderCheckInManId = (await ctx.service.member.queryCheckInManByMemberId(order.OrderMember_id)).id;
          const orderRooms = await ctx.service.order.queryOrderRoomByOrderId(id);
          await ctx.service.order.confirmStayOrderRoom(parentRoomCheckInMen, orderCheckInManId, rooms, orderRooms);
          return true;
        }
        return true;
      }
      return true;
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async rejectHotelOrder(id, reason) {
    const { ctx } = this;
    let order;
    try {
      order = await ctx.service.order.queryOrderHotelById(id);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (!order) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_NOT_EXIST, { id, reason });
    }
    if (order.deleteTag === 1) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_INVALID, { order, reason });
    }
    if (order.CurrentStatus_id !== OrderStatus.NOT_CONFIRM) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_STATUS_ABNORMAL, { order, reason });
    }
    try {
      if (reason && reason.length > 0) {
        await ctx.service.baidu.commentAudit(reason);
      }
      // 更新订单
      await ctx.service.order.rejectHotelReason(id, reason);
      const orderTransaction = await ctx.service.transaction.queryPaidOrderTransactionByOrderIdAndMoney(order.id, order.totalMoney);
      await ctx.service.wechat.refund({
        id: order.id,
        totalMoney: order.totalMoney,
      }, orderTransaction.id, order.totalMoney);
      await ctx.service.order.changeOrderStatus(order.id, OrderStatus.TOTAL_REFUND);
      const wechatConfig = ctx.app.config.wechat;
      await ctx.service.wechat.sendTemplateMessage(order.openId, wechatConfig.template.orderFail, order.prepayId, {
        keyword1: {
          value: order.hotelName,
        },
        keyword2: {
          value: order.roomTypeName,
        },
        keyword3: {
          value: `${order.roomCount}间`,
        },
        keyword4: {
          value: dayjs(order.startTime).format('YYYY年MM月DD日'),
        },
        keyword5: {
          value: dayjs(order.endTime).format('YYYY年MM月DD日'),
        },
        keyword6: {
          value: dayjs().format('YYYY年MM月DD日'),
        },
        keyword7: {
          value: `${Math.round(order.totalMoney / 100)}元`,
        },
        keyword8: {
          value: `酒店拒绝订单，${reason}`,
        },
        keyword9: {
          value: '退款将于24小时内退还到支付账户',
        },
      });
      return true;
      // const orderTransaction = await ctx.service.transaction.queryPaidOrderTransactionByOrderIdAndMoney(id, order.totalMoney);
      // return await ctx.service.wechat.refund(order, orderTransaction.id, order.totalMoney);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  getOrderMember(orderMemberId) {
    const { ctx } = this;
    return ctx.service.member.queryMemberById(orderMemberId);
  }

  getOrderPriceByOrderId(id) {
    const { ctx } = this;
    return ctx.service.order.queryOrderPriceByOrderId(id);
  }

  getHotelByRoomType(roomTypeId) {
    const { ctx } = this;
    return ctx.service.hotel.queryHotelByRoomType(roomTypeId);
  }

  getOrderRoomType(roomTypeId) {
    const { ctx } = this;
    return ctx.connector.room.getRoomTypeById(roomTypeId);
  }

  getOrderRoomByOrderId(id) {
    const { ctx } = this;
    return ctx.service.order.queryOrderRoomByOrderId(id);
  }

  getOrderStatusTimeLine(id) {
    const { ctx } = this;
    return ctx.service.order.queryOrderStatusTimeLine(id);
  }

  getOrderTransaction(id) {
    const { ctx } = this;
    return ctx.service.order.queryOrderTransaction(id);
  }
}

module.exports = OrderConnector;
