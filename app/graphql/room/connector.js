'use strict';

const DataLoader = require('dataloader');
const { ErrorCode, AuthorityType } = require('../../util/constant');

class RoomConnector {
  constructor(ctx) {
    this.ctx = ctx;
    this.roomLoader = new DataLoader(this.getRooms.bind(this), { cache: false });
    this.roomTypeLoader = new DataLoader(this.getRoomTypes.bind(this), { cache: false });
    this.roomStatusLoader = new DataLoader(this.getRoomStatuses.bind(this));
  }

  async getCheckInMen(checkInManId) {
    const { ctx } = this;
    return ctx.connector.member.getCheckInManById(checkInManId);
  }

  getRoomTypeLabel(roomTypeId) {
    const { ctx } = this;
    return ctx.service.room.queryRoomTypeLabel(roomTypeId);
  }

  async getRoomTypeTag(roomTypeId) {
    const { ctx } = this;
    try {
      const labels = await ctx.service.room.queryRoomTypeLabel(roomTypeId);
      return labels.map(label => label.description);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async getRoomTypeImage(roomTypeId) {
    const { ctx } = this;
    try {
      const images = await ctx.service.room.queryRoomTypeImage(roomTypeId);
      return images.map(image => image.url);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async getRoomTypePrice(roomTypeId) {
    const { ctx } = this;
    return (await ctx.service.room.queryRoomTypePrice(roomTypeId)).map(price => price.price);
  }

  getSpecialPrice(roomTypeId) {
    const { ctx } = this;
    return ctx.service.room.querySpecialPrice(roomTypeId);
  }

  getRoomTypeCurrentCount(id, startTime, endTime) {
    const { ctx } = this;
    return ctx.service.room.queryRoomTypeCurrentCount(id, startTime, endTime);
  }

  getRooms(ids) {
    const { ctx } = this;
    return ctx.service.room.queryRooms(ids);
  }

  getRoomById(id) {
    return this.roomLoader.load(id);
  }

  getRoomTypes(roomTypeIds) {
    const { ctx } = this;
    return ctx.service.room.queryRoomTypes(roomTypeIds);
  }

  getRoomTypeById(roomTypeId) {
    return this.roomTypeLoader.load(roomTypeId);
  }

  getRoomStatuses(roomStatusIds) {
    const { ctx } = this;
    return ctx.service.room.queryRoomStatuses(roomStatusIds);
  }

  getRoomStatus(roomStatusId) {
    return this.roomStatusLoader.load(roomStatusId);
  }

  getRoomTypeRoomCount(roomTypeId) {
    const { ctx } = this;
    return ctx.service.room.queryRoomTypeRoomCount(roomTypeId);
  }

  getRoomTypePriceByType(roomTypeId, isWeekend) {
    const { ctx } = this;
    return ctx.service.room.queryRoomTypePriceByType(roomTypeId, isWeekend);
  }

  getRoomCheckInManByOrderRoomId(orderRoomId) {
    const { ctx } = this;
    return ctx.service.room.queryRoomCheckInManByOrderRoomId(orderRoomId);
  }

  async getFreeRoom(roomTypeId, startTime, endTime) {
    const { ctx } = this;
    try {
      return (await ctx.service.room.queryFreeRoom(roomTypeId, startTime, endTime)).map(room => room.id);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async getOwnRoom(role, orderId) {
    const { ctx } = this;
    let order;
    try {
      order = await ctx.service.order.queryOrderById(orderId);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (!order) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_NOT_EXIST, { role, orderId });
    }
    if (order.deleteTag === 1) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_INVALID, { role, order });
    }
    let checkInMan;
    try {
      checkInMan = await ctx.service.member.queryCheckInManByMemberId(role.id);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (!checkInMan) {
      ctx.helper.errorLog(ctx, ErrorCode.member.PLEASE_REAL_NAME_FIRST, { role, order });
    }
    let checkInManIds;
    if (role.id === order.OrderMember_id) {
      checkInManIds = [ 0, (checkInMan).id ];
    } else {
      let belongCheckInMan;
      try {
        belongCheckInMan = await ctx.service.member.queryCheckInManByMemberIdAndIdCard(order.OrderMember_id, checkInMan.idCard);
      } catch (e) {
        ctx.logger.error(e);
        throw e;
      }
      if (!belongCheckInMan) {
        ctx.helper.errorLog(ctx, ErrorCode.member.AUTH_MAN_NOT_CHECK_IN_MAN, { role, order });
      }
      checkInManIds = [ (belongCheckInMan).id ];
    }
    try {
      const orderRooms = await ctx.service.order.queryOrderRoomByOrderId(orderId);
      let roomCheckInMen;
      const ownRooms = [];
      for (let i = 0; i < orderRooms.length; i++) {
        roomCheckInMen = await ctx.service.room.queryRoomCheckInManByOrderRoomId(orderRooms[i].id);
        if (roomCheckInMen.some(roomCheckInMan => checkInManIds.includes(roomCheckInMan.CheckInMan_id) && roomCheckInMan.role === (role.id === order.OrderMember_id ? AuthorityType.ORDER_PERSON : AuthorityType.AUTHORIZED_PERSON))) {
          ownRooms.push(orderRooms[i]);
        }
      }
      return ownRooms;
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  getRoomByHotelId(hotelId, statuses) {
    const { ctx } = this;
    return ctx.service.room.queryRoomByHotelId(hotelId, statuses);
  }

  getRoomTypeByHotelId(hotelId) {
    const { ctx } = this;
    return ctx.service.room.queryRoomTypeByHotelId(hotelId);
  }

  async getChangeableRoom(id) {
    const { ctx } = this;
    let order;
    try {
      order = await ctx.service.order.queryNowOrderByRoomId(id);
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
    try {
      return await ctx.service.room.queryFreeRoom(order.RoomType_id, order.startTime, order.endTime);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  getRoomBaseByHotelId(hotelId) {
    const { ctx } = this;
    return ctx.service.room.queryRoomBaseByHotelId(hotelId);
  }

  getSweepOrderRoom(id) {
    const { ctx } = this;
    return ctx.service.room.querySweepOrderRoom(id);
  }

  async getSelectableRooms(orderId) {
    const { ctx } = this;
    let order;
    try {
      order = await ctx.service.order.queryOrderById(orderId);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (!order) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_NOT_EXIST, { orderId });
    }
    if (order.deleteTag === 1) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_INVALID, { order });
    }
    try {
      return await ctx.service.room.queryFreeRoom(order.RoomType_id, order.startTime, order.endTime);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  getOrderRoomCheckInMan(orderRoomId) {
    const { ctx } = this;
    return ctx.service.room.queryOrderRoomCheckInMan(orderRoomId);
  }

  getOrderRoomConsumption(orderRoomId) {
    const { ctx } = this;
    return ctx.service.room.queryOrderRoomConsumption(orderRoomId);
  }

  async openLockByRoomId(id) {
    const { ctx } = this;
    let room;
    try {
      room = await ctx.service.room.queryRoomById(id);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (!room) {
      ctx.helper.errorLog(ctx, ErrorCode.room.ROOM_NOT_EXIST, { id });
    }
    if (room.deleteTag === 1) {
      ctx.helper.errorLog(ctx, ErrorCode.room.ROOM_INVALID, { room });
    }
    if (!room.lockIP) {
      ctx.helper.errorLog(ctx, ErrorCode.room.ROOM_CAN_NOT_ONE_KEY_OPEN_LOCK, room);
    }
    return await ctx.service.guojia.openLock(room.lockIP);
  }

  changeRoomStatusById(id, statusId) {
    const { ctx } = this;
    return ctx.service.room.updateRoomStatus(id, statusId);
  }

  async changeRoomTypeStatusById(staffId, roomTypeId, status) {
    const { ctx } = this;
    let roomTypes;
    try {
      roomTypes = await ctx.service.room.queryRoomTypeByStaffId(staffId);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    const roomType = roomTypes.find(r => r.id === roomTypeId);
    if (!roomType) {
      ctx.helper.errorLog(ctx, ErrorCode.room.ROOM_TYPE_NOT_EXIST, { staffId, roomTypes, roomTypeId, status });
    }
    if (roomType.deleteTag === 1) {
      ctx.helper.errorLog(ctx, ErrorCode.room.ROOM_TYPE_INVALID, { staffId, roomTypes, roomType, status });
    }
    if (roomType.status !== status) {
      try {
        return await ctx.service.room.updateRoomTypeStatus(roomTypeId, status);
      } catch (e) {
        ctx.logger.error(e);
        throw e;
      }
    } else {
      return true;
    }
  }

  async changeRoomById(oldId, newId) {
    const { ctx } = this;
    let order;
    try {
      order = await ctx.service.order.queryNowOrderByRoomId(oldId);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (!order) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_NOT_EXIST, { oldId });
    }
    if (order.deleteTag === 1) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_INVALID, { order });
    }
    let changeableRooms;
    try {
      changeableRooms = (await ctx.service.room.queryFreeRoom(order.RoomType_id, order.startTime, order.endTime)).map(room => room.id);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (!changeableRooms.includes(newId)) {
      ctx.helper.errorLog(ctx, ErrorCode.room.NEW_ROOM_CAN_NOT_CHANGE, oldId);
    }
    try {
      return await ctx.service.room.changeRoomByNewId(oldId, newId, order.orderRoomId);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async addNewRoomType(roomType) {
    const { ctx } = this;
    let count;
    try {
      count = await ctx.service.room.queryRoomTypeNameCount(roomType.hotelId, roomType.name);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (count > 0) {
      ctx.helper.errorLog(ctx, ErrorCode.room.ROOM_TYPE_NAME_EXISTED, { roomType });
    }
    return await ctx.service.room.insertRoomType(roomType);
  }

  removeARoomType(roomTypeId) {
    const { ctx } = this;
    return ctx.service.room.deleteRoomType(roomTypeId);
  }

  auditRoomType(roomType) {
    const { ctx } = this;
    return ctx.service.room.insertAuditRoomType(roomType);
  }

  updateRoomTypeInfo(roomType) {
    const { ctx } = this;
    return ctx.service.room.updateRoomTypeBaseInfo(roomType);
  }

  addNewRoom(room) {
    const { ctx } = this;
    return ctx.service.room.insertRoom(room);
  }

  updateARoom(room) {
    const { ctx } = this;
    return ctx.service.room.updateARoomInfo(room);
  }

  removeARoom(id) {
    const { ctx } = this;
    return ctx.service.room.deleteRoom(id);
  }

  async confirmOrderConsume(orderRoomId, merchandises, counts) {
    const { ctx } = this;
    let orderRoom;
    try {
      orderRoom = await ctx.service.order.queryOrderRoomById(orderRoomId);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (!orderRoom) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_ROOM_NOT_EXIST, { orderRoomId, merchandises, counts });
    }
    if (orderRoom.deleteTag === 1) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_ROOM_INVALID, { orderRoom, merchandises, counts });
    }
    if (orderRoom.isConsumed) {
      ctx.helper.errorLog(ctx, ErrorCode.order.ORDER_ROOM_CONSUMPTION_CONFIRMED, { orderRoom, merchandises, counts });
    }
    try {
      return await ctx.service.room.confirmOrderRoomConsumption(orderRoomId, orderRoom.Order_id, merchandises, counts);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }
}

module.exports = RoomConnector;
