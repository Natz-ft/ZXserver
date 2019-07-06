'use strict';

const Service = require('egg').Service;
const dayjs = require('dayjs');
const mysqlUtil = require('../util/mysql');
const { RoomStatus, ImageType, AuditType } = require('../util/constant');

class RoomService extends Service {
  async queryRoomsByRoomtype(RoomType_id) { // syk
    const { ctx } = this;
    try {
      return await mysqlUtil.select(ctx, 'Room', { where: { RoomType_id } });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryRoomById(id) {
    const { ctx } = this;
    try {
      return await mysqlUtil.get(ctx, 'Room', { id });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryRoomTypeById(roomTypeId) {
    const { ctx } = this;
    try {
      return await mysqlUtil.get(ctx, 'RoomType', { id: roomTypeId });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryRoomTypeLabel(roomTypeId) {
    const { ctx } = this;
    try {
      return await mysqlUtil.select(ctx, 'RoomTypeLabel', { where: { RoomType_id: roomTypeId } });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryRoomTypeImage(roomTypeId) {
    const { ctx } = this;
    try {
      return await mysqlUtil.select(ctx, 'HotelImage', {
        where: {
          _ImageType_id: ImageType.ROOM_TYPE,
          tableId: roomTypeId,
        },
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryRoomTypePrice(roomTypeId) {
    const { ctx } = this;
    try {
      return await mysqlUtil.select(ctx, 'Price', {
        where: { RoomType_id: roomTypeId },
        orders: [[ 'month', 'asc' ], [ 'isWeekend', 'asc' ]],
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async querySpecialPrice(roomTypeId) {
    const { ctx } = this;
    try {
      return await mysqlUtil.select(ctx, 'SpecialPrice', { where: { RoomType_id: roomTypeId } });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async querySpecialPriceInTime(roomTypeId, startTime, endTime) {
    const { ctx } = this;
    const sql = 'select * from SpecialPrice where RoomType_id = :roomTypeId and deleteTag = 0 and startTime < :endTime and endTime > :startTime';
    try {
      return await mysqlUtil.query(ctx, sql, { roomTypeId, startTime, endTime });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryHotelRoomType(hotelId, startTime, endTime) {
    const { ctx } = this;
    try {
      const roomTypes = await mysqlUtil.select(ctx, 'RoomType', { where: { Hotel_id: hotelId, auditStatus: 1, status: 0 } });
      return roomTypes.map(roomType => ({
        ...roomType,
        startTime,
        endTime,
      }));
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryRooms(ids) {
    const { ctx } = this;
    try {
      return await mysqlUtil.unionSelect(ctx, 'Room', ids);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryRoomTypes(roomTypeIds) {
    const { ctx } = this;
    try {
      return await mysqlUtil.unionSelect(ctx, 'RoomType', roomTypeIds);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryRoomTypeCurrentCount(roomTypeId, startTime, endTime) {
    const { ctx } = this;
    const sql = 'select sum(roomCount) as sum from `Order` where RoomType_id = :roomTypeId and deleteTag = 0 and ((startTime >= :startTime ' +
      'and startTime < :endTime) or (endTime > :startTime and endTime <= :endTime))';
    try {
      const sum = (await mysqlUtil.query(ctx, sql, { roomTypeId, startTime, endTime }))[0].sum;
      return await mysqlUtil.count(ctx, 'Room', { RoomType_id: roomTypeId, _RoomStatus_id: 0 }) - (sum ? sum : 0);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryRoomStatuses(roomStatusIds) {
    const { ctx } = this;
    try {
      return await mysqlUtil.unionSelect(ctx, '_RoomStatus', roomStatusIds);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryRoomTypeRoomCount(roomTypeId) {
    const { ctx } = this;
    try {
      return await mysqlUtil.count(ctx, 'Room', { RoomType_id: roomTypeId });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryRoomTypePriceByType(roomTypeId, isWeekend) {
    const { ctx } = this;
    const currentMonth = dayjs().month();
    const month = [ currentMonth, currentMonth + 1, currentMonth + 2 ];
    try {
      return await mysqlUtil.select(ctx, 'Price', {
        where: { RoomType_id: roomTypeId, isWeekend, month },
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryRoomCheckInManByOrderRoomId(orderRoomId) {
    const { ctx } = this;
    try {
      return await mysqlUtil.select(ctx, 'RoomCheckInMan', {
        where: { OrderRoom_id: orderRoomId },
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryFreeRoom(roomTypeId, startTime, endTime) {
    const { ctx } = this;
    const sql = 'select * from Room where RoomType_id = :roomTypeId and deleteTag = 0 and `_RoomStatus_id` = 0 and ' +
      'id not in (select distinct OrderRoom.Room_id from `Order`, OrderRoom where RoomType_id = :roomTypeId and `Order`.deleteTag = 0 ' +
      'and (startTime < :endTime and endTime > :startTime) and ((`Order`.parent_id is null and CurrentStatus_id in (2, 3)) ' +
      'or (`Order`.parent_id is not null and CurrentStatus_id in (0, 1, 2, 3))) and `Order`.id = OrderRoom.Order_id and OrderRoom.deleteTag = 0)';
    try {
      return await mysqlUtil.query(ctx, sql, { roomTypeId, startTime, endTime });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryNoManFreeRoom(roomTypeId, startTime, endTime) {
    const { ctx } = this;
    const sql1 = 'select * from `Order` where RoomType_id = :roomTypeId and deleteTag = 0 and ' +
      '(startTime < :endTime and endTime > :startTime) and ((`Order`.parent_id is null and CurrentStatus_id in (2, 3)) ' +
      'or (`Order`.parent_id is not null and CurrentStatus_id in (0, 1, 2, 3)))';
    try {
      const orders = await mysqlUtil.query(ctx, sql1, { roomTypeId, startTime, endTime });
      const orderRooms = await mysqlUtil.select(ctx, 'OrderRoom', {
        where: { Order_id: orders.map(order => order.id) },
      });
      const sql2 = `select * from Room where RoomType_id = :roomTypeId and deleteTag = 0 and \`_RoomStatus_id\` = 0 and isNoMan = 1 and id not in (${orderRooms.map(orderRoom => orderRoom.Room_id).join(',')})`;
      return await mysqlUtil.query(ctx, sql2, { roomTypeId });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryRoomByHotelId(hotelId, statuses) {
    const { ctx } = this;
    let newStatuses = [];
    if (statuses.includes(-1)) {
      Object.keys(RoomStatus).forEach(status => {
        if (status !== RoomStatus.ALL) {
          newStatuses.push(RoomStatus[status]);
        }
      });
    } else {
      newStatuses = statuses.slice();
    }
    const sql = `select Room.* from RoomType, Room where RoomType.Hotel_id = :hotelId and RoomType.deleteTag = 0 and Room.RoomType_id = RoomType.id 
    and Room.deleteTag = 0 and \`_RoomStatus_id\` in (${newStatuses.join(',')}) order by RoomType.id, building, floor, door`;
    try {
      return await mysqlUtil.query(ctx, sql, { hotelId });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryRoomTypeByHotelId(hotelId) {
    const { ctx } = this;
    try {
      return await mysqlUtil.select(ctx, 'RoomType', { where: { Hotel_id: hotelId } });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryRoomBaseByHotelId(hotelId) {
    const { ctx } = this;
    const sql = 'select Room.* from Room, RoomType where RoomType.Hotel_id = :hotelId and RoomType.deleteTag = 0 ' +
      'and Room.RoomType_id = RoomType.id and Room.deleteTag = 0';
    try {
      return await mysqlUtil.query(ctx, sql, { hotelId });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async querySweepOrderRoom(id) {
    const { ctx } = this;
    const sql = 'select OrderRoom.id, `Order`.startTime, `Order`.endTime, OrderRoom.isConsumed from `Order`, OrderRoom ' +
      'where OrderRoom.Room_id = :id and OrderRoom.deleteTag = 0 and `Order`.id = OrderRoom.Order_id and `Order`.deleteTag = 0 ' +
      'and `Order`.CurrentStatus_id = 5 order by `Order`.endTime desc limit 1';
    try {
      const data = await mysqlUtil.query(ctx, sql, { id });
      return data.length > 0 ? data[0] : null;
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryOrderRoomCheckInMan(orderRoomId) {
    const { ctx } = this;
    try {
      return await mysqlUtil.select(ctx, 'RoomCheckInMan', { where: { OrderRoom_id: orderRoomId } });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryOrderRoomConsumption(orderRoomId) {
    const { ctx } = this;
    try {
      return await mysqlUtil.select(ctx, 'Consumption', { where: { OrderRoom_id: orderRoomId } });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async updateRoomStatus(id, statusId) {
    const { ctx } = this;
    try {
      return await mysqlUtil.update(ctx, 'Room', { _RoomStatus_id: statusId }, { where: { id } });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryRoomTypeByStaffId(staffId) {
    const { ctx } = this;
    const sql = 'select RoomType.id, RoomType.status from Staff, RoomType where Staff.id = :staffId ' +
      'and Staff.Hotel_id = RoomType.Hotel_id and RoomType.deleteTag = 0';
    try {
      return await mysqlUtil.query(ctx, sql, { staffId });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async updateRoomTypeStatus(roomTypeId, status) {
    const { ctx } = this;
    try {
      return await mysqlUtil.update(ctx, 'RoomType', { status }, {
        where: { id: roomTypeId },
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async changeRoomByNewId(oldId, newId, orderRoomId) {
    const { ctx } = this;
    try {
      return await mysqlUtil.beginTransactionScope(ctx, async conn => {
        await mysqlUtil.connUpdate(ctx, 'Room', { _RoomStatus_id: RoomStatus.SWEEP }, {
          where: { id: oldId },
        }, conn);
        await mysqlUtil.connUpdate(ctx, 'Room', { _RoomStatus_id: RoomStatus.USING }, {
          where: { id: newId },
        }, conn);
        await mysqlUtil.connUpdate(ctx, 'OrderRoom', { Room_id: newId }, {
          where: { id: orderRoomId },
        }, conn);
        return true;
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryRoomTypeNameCount(hotelId, name) {
    const { ctx } = this;
    try {
      return await mysqlUtil.count(ctx, 'RoomType', { Hotel_id: hotelId, name });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async insertRoomType(roomType) {
    const { ctx } = this;
    const {
      hotelId, name, capacity, introduction, status, hourlyRoom, hourlyPrice, hourlyOutOfPrice, workPrice,
      weekendPrice, specialTime, tags, toilet, toiletries, shower, hotWater, blower, internet, airCleaner } = roomType;
    const workStart = workPrice[0].month;
    const weekendStart = weekendPrice[0].month;
    try {
      const id = await mysqlUtil.beginTransactionScope(ctx, async conn => {
        const id = await mysqlUtil.connInsert(ctx, 'RoomType', {
          Hotel_id: hotelId,
          name,
          capacity,
          introduction,
          status,
          hourlyRoom,
          hourlyPrice,
          hourlyOutOfPrice,
          toilet,
          toiletries,
          shower,
          hotWater,
          blower,
          internet: JSON.stringify(internet),
          airCleaner,
        }, conn);
        let price;
        for (let i = 0; i < 12; i++) {
          price = workPrice[0].price;
          if (i === workStart + 1) {
            price = workPrice[1].price;
          } else if (i === workStart + 2) {
            price = workPrice[2].price;
          }
          await mysqlUtil.connInsert(ctx, 'Price', {
            RoomType_id: id,
            month: i,
            isWeekend: 0,
            price,
          }, conn);
        }
        for (let i = 0; i < 12; i++) {
          price = weekendPrice[0].price;
          if (i === weekendStart + 1) {
            price = weekendPrice[1].price;
          } else if (i === weekendStart + 2) {
            price = weekendPrice[2].price;
          }
          await mysqlUtil.connInsert(ctx, 'Price', {
            RoomType_id: id,
            month: i,
            isWeekend: 1,
            price,
          }, conn);
        }
        let special;
        for (let i = 0; i < specialTime.length; i++) {
          special = specialTime[i];
          await mysqlUtil.connInsert(ctx, 'SpecialPrice', {
            RoomType_id: id,
            startTime: special.startTime,
            endTime: special.endTime,
            price: special.price,
            description: special.description,
          }, conn);
        }
        for (let i = 0; i < tags.length; i++) {
          await mysqlUtil.connInsert(ctx, 'RoomTypeLabel', {
            RoomType_id: id,
            description: tags[i],
          }, conn);
        }
        return id;
      });
      return await mysqlUtil.get(ctx, 'RoomType', { id });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async deleteRoomType(roomTypeId) {
    const { ctx } = this;
    try {
      return await mysqlUtil.beginTransactionScope(ctx, async conn => {
        await mysqlUtil.connUpdate(ctx, 'RoomType', { deleteTag: 1 }, {
          where: { id: roomTypeId },
        }, conn, true);
        await mysqlUtil.connUpdate(ctx, 'Audit', { deleteTag: 1 }, {
          where: { _AuditType_id: AuditType.ROOM_TYPE, tableId: roomTypeId },
        }, conn, true);
        return true;
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async insertAuditRoomType(roomType) {
    const { ctx } = this;
    const { id, ...info } = roomType;
    const modified = JSON.stringify(info);
    try {
      return await mysqlUtil.insert(ctx, 'Audit', {
        _AuditType_id: AuditType.ROOM_TYPE,
        tableId: id,
        modified,
        createdTime: new Date().getTime(),
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async updateRoomTypeBaseInfo(roomType) {
    const { ctx } = this;
    const { id, status, hourlyRoom, toilet, toiletries, shower, hotWater, blower, internet, airCleaner } = roomType;
    try {
      return await mysqlUtil.update(ctx, 'RoomType', {
        status,
        hourlyRoom,
        toilet,
        toiletries,
        shower,
        hotWater,
        blower,
        internet: JSON.stringify(internet),
        airCleaner,
      }, {
        where: { id },
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async insertRoom(room) {
    const { ctx } = this;
    const { roomTypeId, building, floor, door, lockIP, isNoMan, isHourly } = room;
    try {
      return await mysqlUtil.insert(ctx, 'Room', {
        RoomType_id: roomTypeId,
        building,
        floor,
        door,
        lockIP,
        isNoMan,
        isHourly,
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async updateARoomInfo(room) {
    const { ctx } = this;
    const { id, roomTypeId, status, building, floor, door, lockIP, isNoMan, isHourly } = room;
    try {
      return await mysqlUtil.update(ctx, 'Room', {
        RoomType_id: roomTypeId,
        _RoomStatus_id: status,
        building,
        floor,
        door,
        lockIP,
        isNoMan,
        isHourly,
      }, {
        where: { id },
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async deleteRoom(id) {
    const { ctx } = this;
    try {
      return await mysqlUtil.update(ctx, 'Room', { deleteTag: 1 }, {
        where: { id },
      }, true);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async confirmOrderRoomConsumption(orderRoomId, orderId, merchandises, counts) {
    const { ctx } = this;
    const sql = 'select * from OrderRoom where Order_id = (select Order_id from OrderRoom where id = :orderRoomId) and id != :orderRoomId';
    try {
      const orderRooms = await mysqlUtil.query(ctx, sql, { orderRoomId });
      await mysqlUtil.update(ctx, 'Consumption', { deleteTag: 1 }, {
        where: { OrderRoom_id: orderRoomId },
      }, true);
      return await mysqlUtil.beginTransactionScope(ctx, async conn => {
        if (merchandises.length > 0) {
          const sql = `insert into Consumption (OrderRoom_id, Merchandise_id, quantity) values ${merchandises.map((m, i) => `(${orderRoomId}, ${m}, ${counts[i]})`).join(',')}`;
          await mysqlUtil.query(ctx, sql, {});
        }
        await mysqlUtil.connUpdate(ctx, 'OrderRoom', { isConsumed: 1 }, {
          where: { id: orderRoomId },
        }, conn);
        if (orderRooms.every(orderRoom => orderRoom.isConsumed)) {
          await mysqlUtil.connUpdate(ctx, 'Order', { isConsumed: 1 }, {
            where: { id: orderId },
          }, conn);
        }
        return true;
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }
}

module.exports = RoomService;
