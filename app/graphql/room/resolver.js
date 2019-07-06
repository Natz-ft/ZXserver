'use strict';

const { Role, StaffType } = require('../../util/constant');

module.exports = {
  StaffRoomType: {
    __resolveType(_, ctx) {
      return ctx.helper.resolveType(ctx, [
        {
          roles: [ StaffType.ADMIN, StaffType.BACK ],
          type: 'AdminRoomType',
        },
        {
          roles: [ StaffType.SWEEPER ],
          type: 'SweeperRoomType',
        },
      ]);
    },
  },
  StaffRoom: {
    __resolveType(_, ctx) {
      return ctx.helper.resolveType(ctx, [
        {
          roles: [ StaffType.ADMIN, StaffType.BACK ],
          type: 'AdminRoom',
        },
        {
          roles: [ StaffType.SWEEPER ],
          type: 'SweeperRoom',
        },
      ]);
    },
  },
  StaffRoomBase: {
    __resolveType(_, ctx) {
      return ctx.helper.resolveType(ctx, [
        {
          roles: [ StaffType.ADMIN, StaffType.BACK ],
          type: 'AdminRoomBase',
        },
        {
          roles: [ StaffType.SWEEPER ],
          type: 'SweeperRoomBase',
        },
      ]);
    },
  },
  AdminRoomType: {
    roomCount({ id }, _, ctx) {
      return ctx.connector.room.getRoomTypeRoomCount(id);
    },
    workPrice({ id }, _, ctx) {
      return ctx.connector.room.getRoomTypePriceByType(id, 0);
    },
    weekendPrice({ id }, _, ctx) {
      return ctx.connector.room.getRoomTypePriceByType(id, 1);
    },
    specialTime({ id }, _, ctx) {
      return ctx.connector.room.getSpecialPrice(id);
    },
    tags({ id }, _, ctx) {
      return ctx.connector.room.getRoomTypeTag(id);
    },
    internet({ internet }) {
      return JSON.parse(internet);
    },
    pictures({ id }, _, ctx) {
      return ctx.connector.room.getRoomTypeImage(id);
    },
  },
  AdminRoom: {
    roomType({ RoomType_id }, _, ctx) {
      return ctx.connector.room.getRoomTypeById(RoomType_id);
    },
    status({ _RoomStatus_id }, _, ctx) {
      return ctx.connector.room.getRoomStatus(_RoomStatus_id);
    },
    isHourly({ isHourly }) {
      return isHourly === 1;
    },
  },
  SweeperRoom: {
    roomType({ RoomType_id }, _, ctx) {
      return ctx.connector.room.getRoomTypeById(RoomType_id);
    },
    status({ _RoomStatus_id }, _, ctx) {
      return ctx.connector.room.getRoomStatus(_RoomStatus_id);
    },
    isLockIP({ lockIP }) {
      return lockIP !== null;
    },
    isHourly({ isHourly }) {
      return isHourly === 1;
    },
  },
  AdminRoomBase: {
    roomType({ RoomType_id }, _, ctx) {
      return ctx.connector.room.getRoomTypeById(RoomType_id);
    },
    roomStatus({ _RoomStatus_id }) {
      return _RoomStatus_id;
    },
  },
  SweeperRoomBase: {
    isHourly({ isHourly }) {
      return isHourly === 1;
    },
  },
  RoomCheckInMan: {
    orderRoomId({ OrderRoom_id }) {
      return OrderRoom_id;
    },
    checkInMan({ CheckInMan_id }, _, ctx) {
      return ctx.connector.room.getCheckInMen(CheckInMan_id);
    },
  },
  OwnRoom: {
    room({ Room_id }, _, ctx) {
      return ctx.connector.room.getRoomById(Room_id);
    },
    roomCheckInMen({ id }, _, ctx) {
      return ctx.connector.room.getRoomCheckInManByOrderRoomId(id);
    },
  },
  RoomType: {
    labels({ id }, _, ctx) {
      return ctx.connector.room.getRoomTypeLabel(id);
    },
    prices({ id }, _, ctx) {
      return ctx.connector.room.getRoomTypePrice(id);
    },
    specialPrices({ id }, _, ctx) {
      return ctx.connector.room.getSpecialPrice(id);
    },
    currentCount({ id, startTime, endTime }, _, ctx) {
      if (startTime) {
        return ctx.connector.room.getRoomTypeCurrentCount(id, startTime, endTime);
      }
      return null;
    },
  },
  PublicRoom: {
    roomType({ RoomType_id }, _, ctx) {
      return ctx.connector.room.getRoomTypeById(RoomType_id);
    },
  },
  OrderRoom: {
    orderId({ Order_id }) {
      return Order_id;
    },
    room({ Room_id }, _, ctx) {
      return ctx.connector.room.getRoomById(Room_id);
    },
    isConsumed({ isConsumed }) {
      return isConsumed === 1;
    },
    roomCheckInMen({ id }, _, ctx) {
      return ctx.connector.room.getOrderRoomCheckInMan(id);
    },
    consumptions({ id, isConsumed }, _, ctx) {
      if (isConsumed) {
        return ctx.connector.room.getOrderRoomConsumption(id);
      }
      return [];
    },
  },
  SweepOrderRoom: {
    isConsumed({ isConsumed }) {
      return isConsumed === 1;
    },
    consumptions({ id, isConsumed }, _, ctx) {
      if (isConsumed) {
        return ctx.connector.merchandise.getConsumptionByOrderRoomId(id);
      }
      return [];
    },
    merchandises({ id }, _, ctx) {
      return ctx.connector.merchandise.getHotelMerchandiseByOrderRoomId(id);
    },
  },
  Query: {
    freeRooms(_, { roomTypeId, startTime, endTime }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.MEMBER ],
          func: () => {
            return ctx.connector.room.getFreeRoom(roomTypeId, startTime, endTime);
          },
        },
      ]);
    },
    ownRooms(_, { orderId }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.MEMBER ],
          func: role => {
            return ctx.connector.room.getOwnRoom(role, orderId);
          },
        },
      ]);
    },
    roomsByHotelId(_, { hotelId, statuses }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.room.getRoomByHotelId(hotelId, statuses);
          },
        },
      ]);
    },
    roomTypesByHotelId(_, { hotelId }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.room.getRoomTypeByHotelId(hotelId);
          },
        },
      ]);
    },
    changeableRooms(_, { id }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.room.getChangeableRoom(id);
          },
        },
      ]);
    },
    roomBasesByHotelId(_, { hotelId }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.room.getRoomBaseByHotelId(hotelId);
          },
        },
      ]);
    },
    sweepOrderRoom(_, { id }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.room.getSweepOrderRoom(id);
          },
        },
      ]);
    },
    selectableRooms(_, { orderId }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.room.getSelectableRooms(orderId);
          },
        },
      ]);
    },
  },
  Mutation: {
    openLock(_, { id }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.room.openLockByRoomId(id);
          },
        },
      ]);
    },
    changeRoomStatus(_, { id, statusId }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.room.changeRoomStatusById(id, statusId);
          },
        },
      ]);
    },
    changeRoomTypeStatus(_, { roomTypeId, status }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.HOTEL_STAFF ],
          func: role => {
            return ctx.connector.room.changeRoomTypeStatusById(role.id, roomTypeId, status);
          },
        },
      ]);
    },
    changeRoom(_, { oldId, newId }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.room.changeRoomById(oldId, newId);
          },
        },
      ]);
    },
    addRoomType(_, roomType, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.room.addNewRoomType(roomType);
          },
        },
      ]);
    },
    removeRoomType(_, { roomTypeId }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.room.removeARoomType(roomTypeId);
          },
        },
      ]);
    },
    submitRoomType(_, roomType, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.room.auditRoomType(roomType);
          },
        },
      ]);
    },
    updateRoomType(_, roomType, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.room.updateRoomTypeInfo(roomType);
          },
        },
      ]);
    },
    addRoom(_, room, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.room.addNewRoom(room);
          },
        },
      ]);
    },
    updateRoom(_, room, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.room.updateARoom(room);
          },
        },
      ]);
    },
    removeRoom(_, { id }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.room.removeARoom(id);
          },
        },
      ]);
    },
    confirmConsume(_, { orderRoomId, merchandises, counts }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.HOTEL_STAFF ],
          func: () => {
            return ctx.connector.room.confirmOrderConsume(orderRoomId, merchandises, counts);
          },
        },
      ]);
    },
  },
};
