'use strict';

const Service = require('egg').Service;
const mysqlUtil = require('../util/mysql');
const { OrderStatus, AuthorityType } = require('../util/constant');

class OrderService extends Service {
  async queryOrderById(id) {
    const { ctx } = this;
    try {
      return await mysqlUtil.get(ctx, 'Order', { id });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryOrderChildren(id) {
    const { ctx } = this;
    try {
      return await mysqlUtil.select(ctx, 'Order', { where: { parent_id: id } });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryAllOrder() {
    const { ctx } = this;
    try {
      return await mysqlUtil.select(ctx, 'Order', {});
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryOrderHotelById(id) {
    const { ctx } = this;
    const sql = 'select `Order`.*, RoomType.name as roomTypeName, Hotel.name as hotelName, Oauth.openId ' +
      'from `Order`, RoomType, Hotel, Oauth where `Order`.id = :id and `Order`.RoomType_id = RoomType.id ' +
      'and RoomType.Hotel_id = Hotel.id and `Order`.OrderMember_id = Oauth.Member_id and Oauth.deleteTag = 0';
    try {
      return (await mysqlUtil.query(ctx, sql, { id }))[0];
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryOrderByOrderTransactionId(orderTransactionId) {
    const { ctx } = this;
    const sql = 'select `Order`.* from `Order`, OrderTransaction where OrderTransaction.id = :orderTransactionId ' +
      'and OrderTransaction.Order_id = `Order`.id';
    try {
      return (await mysqlUtil.query(ctx, sql, { orderTransactionId }))[0];
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryHotelOrder(hotelId, status, page, size) {
    const { ctx } = this;
    const offset = (page - 1) * size;
    const sql = `select \`Order\`.* from \`Order\`, RoomType where RoomType.Hotel_id = :hotelId and RoomType.deleteTag = 0 and \`Order\`.RoomType_id = RoomType.id ${status === -1 ? '' : 'and `Order`.CurrentStatus_id = :status'} and \`Order\`.deleteTag = 0 order by \`Order\`.createdTime desc`;
    try {
      const orders = await mysqlUtil.query(ctx, sql, { hotelId, status });
      return {
        total: orders.length,
        orders: orders.slice(offset, offset + size),
      };
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async createOrder(memberSource, orderMemberId, contact, memberCouponId, roomTypeId, roomCount, startTime,
    endTime, hotelCancelTime, orderPrices, deposit, totalMoney, realTotalMoney, phone) {
    const { ctx, app } = this;
    try {
      return await mysqlUtil.beginTransactionScope(ctx, async conn => {
        const id = await mysqlUtil.connInsert(ctx, 'Order', {
          _MemberSource_id: memberSource,
          OrderMember_id: orderMemberId,
          contact: mysqlUtil.aesEncrypt(ctx, contact),
          MemberCoupon_id: memberCouponId,
          RoomType_id: roomTypeId,
          roomCount,
          startTime,
          endTime,
          hotelCancelTime,
          deposit,
          totalMoney,
          realTotalMoney,
          phone,
          createdTime: new Date().getTime(),
        }, conn);
        await mysqlUtil.connInsert(ctx, 'Order_OrderStatus', {
          Order_id: id,
          _OrderStatus_id: 0,
          createdTime: new Date().getTime(),
        }, conn);
        for (const orderPrice of orderPrices) {
          await mysqlUtil.connInsert(ctx, 'OrderPrice', {
            Order_id: id,
            startTime: orderPrice.startTime,
            endTime: orderPrice.endTime,
            price: orderPrice.price,
          }, conn);
        }
        const transactionId = await mysqlUtil.connInsert(ctx, 'OrderTransaction', {
          _TransactionAction_id: 0,
          Order_id: id,
          money: totalMoney,
          createdTime: new Date().getTime(),
        }, conn);
        await app.redis.get('db15').set(`transaction:order:${transactionId}:1`, 'transaction', 'EX', 15 * 60);
        await app.redis.get('db14').zadd('transaction:order', new Date().getTime() + 15 * 60 * 1000, transactionId);
        if (memberCouponId) {
          await mysqlUtil.connUpdate(ctx, 'MemberCoupon', { status: 1 }, { where: { id: memberCouponId } }, conn);
        }
        return id;
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async createStayOrder(order, orderMemberId, memberCouponId, roomCount, endTime, orderPrices, totalMoney, realTotalMoney, inheritRooms, rooms) {
    const { ctx, app } = this;
    try {
      return await mysqlUtil.beginTransactionScope(ctx, async conn => {
        const id = await mysqlUtil.connInsert(ctx, 'Order', {
          _MemberSource_id: order._MemberSource_id,
          OrderMember_id: orderMemberId,
          contact: order.contact,
          MemberCoupon_id: memberCouponId,
          parent_id: order.id,
          RoomType_id: order.RoomType_id,
          roomCount,
          startTime: order.endTime,
          endTime,
          hotelCancelTime: order.hotelCancelTime,
          deposit: 0,
          totalMoney,
          realTotalMoney,
          phone: order.phone,
          createdTime: new Date().getTime(),
        }, conn);
        await mysqlUtil.connInsert(ctx, 'Order_OrderStatus', {
          Order_id: id,
          _OrderStatus_id: OrderStatus.NOT_PAY,
          createdTime: new Date().getTime(),
        }, conn);
        for (const orderPrice of orderPrices) {
          await mysqlUtil.connInsert(ctx, 'OrderPrice', {
            Order_id: id,
            startTime: orderPrice.startTime,
            endTime: orderPrice.endTime,
            price: orderPrice.price,
          }, conn);
        }
        const transactionId = await mysqlUtil.connInsert(ctx, 'OrderTransaction', {
          _TransactionAction_id: 0,
          Order_id: id,
          money: totalMoney,
          createdTime: new Date().getTime(),
        }, conn);
        /* for (const room of inheritRooms) {
          await mysqlUtil.connInsert(ctx, 'OrderRoom', {
            Order_id: id,
            Room_id: room,
          }, conn);
        }*/
        await app.redis.get('db15').set(`transaction:stay:${transactionId}:1`, 'transaction', 'EX', 15 * 60);
        await app.redis.get('db14').zadd('transaction:stay', new Date().getTime() + 15 * 60 * 1000, transactionId);
        await app.redis.get('db0').set(`stay:${id}`, JSON.stringify(rooms), 'EX', Math.floor((endTime - new Date().getTime()) / 1000 + 86400));
        if (memberCouponId) {
          await mysqlUtil.connUpdate(ctx, 'MemberCoupon', { status: 1 }, { where: { id: memberCouponId } }, conn);
        }
        return id;
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async updateOrderRoomCheckInMen(id, roomCheckInMen, orderCheckInMan, rooms, ids, newIds) {
    const { ctx } = this;
    try {
      return await mysqlUtil.beginTransactionScope(ctx, async conn => {
        if (roomCheckInMen.length > 0) {
          await mysqlUtil.connUpdate(ctx, 'RoomCheckInMan', { deleteTag: 1 }, {
            where: { id: roomCheckInMen.map(roomCheckInMan => roomCheckInMan.id) },
          }, conn, true);
        }
        for (const room of rooms) {
          const orderRoom = await mysqlUtil.get(ctx, 'OrderRoom', {
            Order_id: id,
            Room_id: room.roomId,
          });
          if (!room.checkInMen.includes(orderCheckInMan.id)) {
            await mysqlUtil.connInsert(ctx, 'RoomCheckInMan', {
              OrderRoom_id: orderRoom.id,
              CheckInMan_id: 0,
              role: AuthorityType.ORDER_PERSON,
              createdTime: new Date().getTime(),
            }, conn);
          }
          for (const id of room.checkInMen) {
            await mysqlUtil.connInsert(ctx, 'RoomCheckInMan', {
              OrderRoom_id: orderRoom.id,
              CheckInMan_id: newIds[ids.indexOf(id)],
              role: id === orderCheckInMan.id ? AuthorityType.ORDER_PERSON : AuthorityType.CHECK_IN_MAN,
              createdTime: new Date().getTime(),
            }, conn);
          }
        }
        return true;
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async updateOrderRoomCheckInMenAuth(id, roomCheckInMen, authMemberCheckInManIds, orderCheckInMan, rooms, ids, newIds) {
    const { ctx } = this;
    try {
      return await mysqlUtil.beginTransactionScope(ctx, async conn => {
        await mysqlUtil.connUpdate(ctx, 'RoomCheckInMan', { deleteTag: 1 }, {
          where: { id: roomCheckInMen.filter(roomCheckInMan => roomCheckInMan.CheckInMan_id !== 0).map(roomCheckInMan => roomCheckInMan.id) },
        }, conn, true);
        for (const room of rooms) {
          const orderRoom = await mysqlUtil.get(ctx, 'OrderRoom', {
            Order_id: id,
            Room_id: room.roomId,
          });
          const checkInMen = await mysqlUtil.select(ctx, 'CheckInMan', {
            where: { id: room.checkInMen },
          });
          const checkInMan = checkInMen.find(checkInMan => checkInMan.idCard === orderCheckInMan.tag);
          if (!checkInMan) {
            if ((await mysqlUtil.count(ctx, 'RoomCheckInMan', {
              OrderRoom_id: orderRoom.id,
              CheckInMan_id: 0,
            })) === 0) {
              await mysqlUtil.connInsert(ctx, 'RoomCheckInMan', {
                OrderRoom_id: orderRoom.id,
                CheckInMan_id: 0,
                role: AuthorityType.HAVE_NO_RIGHT_ORDER_PERSON,
                createdTime: new Date().getTime(),
              }, conn);
            }
          }
          for (const id of room.checkInMen) {
            if (id === orderCheckInMan.id || (checkInMan && id === checkInMan.id)) {
              await mysqlUtil.connUpdate(ctx, 'RoomCheckInMan', { deleteTag: 1 }, {
                where: { OrderRoom_id: orderRoom.id, CheckInMan_id: 0 },
              }, conn, true);
              await mysqlUtil.connInsert(ctx, 'RoomCheckInMan', {
                OrderRoom_id: orderRoom.id,
                CheckInMan_id: orderCheckInMan.id,
                role: AuthorityType.HAVE_NO_RIGHT_ORDER_PERSON,
                createdTime: new Date().getTime(),
              }, conn);
            } else {
              await mysqlUtil.connInsert(ctx, 'RoomCheckInMan', {
                OrderRoom_id: orderRoom.id,
                CheckInMan_id: newIds[ids.indexOf(id)],
                role: authMemberCheckInManIds.includes(id) ? AuthorityType.AUTHORIZED_PERSON : AuthorityType.CHECK_IN_MAN,
                createdTime: new Date().getTime(),
              }, conn);
            }
          }
        }
        return true;
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryOrderRoomCheckInMenInDB(id) {
    const { ctx } = this;
    const sql = 'select RoomCheckInMan.CheckInMan_id as checkInManId, OrderRoom.Room_id as roomId, Room.door, Room.building ' +
      'from RoomCheckInMan, OrderRoom, Room where RoomCheckInMan.deleteTag = 0 and RoomCheckInMan.OrderRoom_id = OrderRoom.id ' +
      'and OrderRoom.deleteTag = 0 and OrderRoom.Order_id = :id and Room.id = OrderRoom.Room_id';
    try {
      return await mysqlUtil.query(ctx, sql, { id });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async cancelNotPayOrderById(id, memberCouponId) {
    const { ctx } = this;
    try {
      return await mysqlUtil.beginTransactionScope(ctx, async conn => {
        if (memberCouponId) {
          await mysqlUtil.connUpdate(ctx, 'MemberCoupon', {
            status: 0,
          }, { where: { id: memberCouponId } }, conn);
        }
        await mysqlUtil.connInsert(ctx, 'Order_OrderStatus', {
          Order_id: id,
          _OrderStatus_id: OrderStatus.CANCEL,
          createdTime: new Date().getTime(),
        }, conn);
        await mysqlUtil.connUpdate(ctx, 'Order', {
          CurrentStatus_id: OrderStatus.CANCEL,
        }, { where: { id } }, conn);
        return OrderStatus.CANCEL;
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryOrderByOrderRoomId(orderRoomId) {
    const { ctx } = this;
    const sql = 'select `Order`.* from `Order`, OrderRoom where OrderRoom.id = :orderRoomId and `Order`.id = OrderRoom.Order_id';
    try {
      return (await mysqlUtil.query(ctx, sql, { orderRoomId }))[0];
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async updateOrderPrepayId(id, prepayId) {
    const { ctx } = this;
    try {
      return await mysqlUtil.update(ctx, 'Order', {
        prepayId,
      }, { where: { id } });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async checkoutOrder(id, money) {
    const { ctx } = this;
    try {
      await mysqlUtil.beginTransactionScope(ctx, async conn => {
        await mysqlUtil.connInsert(ctx, 'OrderTransaction', {
          _TransactionAction_id: 1,
          Order_id: id,
          money,
          createdTime: new Date().getTime(),
        }, conn);
        await mysqlUtil.connInsert(ctx, 'Order_OrderStatus', {
          Order_id: id,
          _OrderStatus_id: OrderStatus.PARTIAL_REFUND,
          createdTime: new Date().getTime(),
        }, conn);
        await mysqlUtil.connUpdate(ctx, 'Order', {
          CurrentStatus_id: OrderStatus.PARTIAL_REFUND,
        }, { where: { id } }, conn);
        return true;
      });
      return await this.queryOrderById(id);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async getOrderLatestById(id) {
    const { ctx } = this;
    const sql = 'select * from `Order` where id = if((select count(*) from `Order` where parent_id = :id and deleteTag = 0) > 0, ' +
      '(select id from `Order` where parent_id = :id and deleteTag = 0 order by startTime desc limit 1), :id)';
    try {
      return (await mysqlUtil.query(ctx, sql, { id }))[0];
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async confirmOrderRoom(id, roomIds, startTime, endTime) {
    const { ctx, app } = this;
    const timingConfig = app.config.timing;
    try {
      return await mysqlUtil.beginTransactionScope(ctx, async conn => {
        await mysqlUtil.connUpdate(ctx, 'OrderRoom', { deleteTag: 1 }, {
          where: { Order_id: id },
        }, conn, true);
        for (let i = 0; i < roomIds.length; i++) {
          await mysqlUtil.connInsert(ctx, 'OrderRoom', {
            Order_id: id,
            Room_id: roomIds[i],
          }, conn);
        }
        await mysqlUtil.connInsert(ctx, 'Order_OrderStatus', {
          Order_id: id,
          _OrderStatus_id: OrderStatus.NOT_CHECK_IN,
          createdTime: new Date().getTime(),
        }, conn);
        await mysqlUtil.connUpdate(ctx, 'Order', { CurrentStatus_id: OrderStatus.NOT_CHECK_IN }, {
          where: { id },
        }, conn);
        let time = Math.floor((startTime - new Date().getTime()) / 1000 + (id % timingConfig.delayNumber));
        if (time > 0) {
          await app.redis.get('db15').set(`start:order:${id}:1`, 'expire', 'EX', time);
          await app.redis.get('db14').zadd('start:order', new Date().getTime() + time * 1000, id);
        } else {
          await app.redis.get('db15').set(`start:order:${id}:1`, 'expire', 'EX', 10);
          await app.redis.get('db14').zadd('start:order', new Date().getTime() + 10 * 1000, id);
        }
        time = Math.floor((endTime - new Date().getTime()) / 1000 + (id % timingConfig.delayNumber));
        if (time > 0) {
          await app.redis.get('db15').set(`expire:order:${id}:1`, 'expire', 'EX', time);
          await app.redis.get('db14').zadd('expire:order', new Date().getTime() + time * 1000, id);
        }
        return true;
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async confirmStayOrderRoom(parentRoomCheckInMen, orderCheckInManId, rooms, orderRooms) {
    const { ctx } = this;
    const indexes = [];
    const roomCheckInMen = orderRooms.map(orderRoom => {
      let index = rooms.findIndex(room => room.roomId === orderRoom.Room_id);
      if (index === -1) {
        index = rooms.findIndex((room, i) => room.roomId === 0 && !indexes.includes(i));
      }
      indexes.push(index);
      const checkInManIds = rooms[index].checkInMen;
      if (!checkInManIds.includes(orderCheckInManId)) {
        checkInManIds.push(0);
      }
      const roles = [];
      checkInManIds.forEach(checkInManId => {
        if (checkInManId === 0) {
          roles.push(AuthorityType.HAVE_NO_RIGHT_ORDER_PERSON);
        } else {
          const roomCheckInMen = parentRoomCheckInMen.filter(parentRoomCheckInMan => parentRoomCheckInMan.OrderRoom_id === rooms[index].originOrderRoomId && parentRoomCheckInMan.CheckInMan_id === checkInManId);
          if (roomCheckInMen.length > 1) {
            roles.push(roomCheckInMen[0].role);
          } else {
            roles.push(AuthorityType.CHECK_IN_MAN);
          }
        }
      });
      if (!roles.includes(AuthorityType.ORDER_PERSON) && !roles.includes(AuthorityType.AUTHORIZED_PERSON)) {
        roles[roles.findIndex(role => role === AuthorityType.HAVE_NO_RIGHT_ORDER_PERSON)] = AuthorityType.ORDER_PERSON;
      }
      return {
        orderRoomId: orderRoom.id,
        checkInManIds,
        roles,
      };
    });
    const sql = `insert into RoomCheckInMan(OrderRoom_id, CheckInMan_id, role, createdTime) values ${roomCheckInMen.map(room => room.checkInManIds.map((checkInManId, index) => `(${room.orderRoomId}, ${checkInManId}, ${room.roles[index]}, ${new Date().getTime()})`).join(',')).join(',')}`;
    try {
      return await mysqlUtil.query(ctx, sql, {});
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async rejectHotelReason(id, reason) {
    const { ctx } = this;
    try {
      return await mysqlUtil.beginTransactionScope(ctx, async conn => {
        await mysqlUtil.connInsert(ctx, 'Order_OrderStatus', {
          Order_id: id,
          _OrderStatus_id: OrderStatus.REJECT,
          createdTime: new Date().getTime(),
        }, conn);
        await mysqlUtil.connUpdate(ctx, 'Order', {
          CurrentStatus_id: OrderStatus.REJECT,
          reason,
        }, { where: { id } }, conn);
        return true;
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryOrderRoomById(orderRoomId) {
    const { ctx } = this;
    try {
      return await mysqlUtil.get(ctx, 'OrderRoom', { id: orderRoomId });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryOrderRoomByOrderId(id) {
    const { ctx } = this;
    try {
      return await mysqlUtil.select(ctx, 'OrderRoom', {
        where: { Order_id: id },
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryOrderStatusTimeLine(id) {
    const { ctx } = this;
    try {
      return await mysqlUtil.select(ctx, 'Order_OrderStatus', {
        where: { Order_id: id },
        orders: [[ 'createdTime', 'desc' ]],
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryOrderTransaction(id) {
    const { ctx } = this;
    try {
      return await mysqlUtil.select(ctx, 'OrderTransaction', {
        where: { Order_id: id },
        orders: [[ 'createdTime', 'desc' ]],
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryOrderMemberIdByOrderRoomId(orderRoomId) {
    const { ctx } = this;
    const sql = 'select `Order`.OrderMember_id from `Order`, OrderRoom where OrderRoom.id = :orderRoomId and `Order`.id = OrderRoom.Order_id';
    try {
      return (await mysqlUtil.query(ctx, sql, { orderRoomId }))[0].OrderMember_id;
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryNowOrderByRoomId(roomId) {
    const { ctx } = this;
    const sql = 'select `Order`.RoomType_id, `Order`.startTime, `Order`.endTime, OrderRoom.id as orderRoomId ' +
      'from `Order`, OrderRoom where OrderRoom.Room_id = :roomId and OrderRoom.deleteTag = 0 and OrderRoom.Order_id = `Order`.id ' +
      'and `Order`.deleteTag = 0 and `Order`.CurrentStatus_id in (2, 3)';
    try {
      return (await mysqlUtil.query(ctx, sql, { roomId }))[0];
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryRoomCheckInManByOrderId(id) {
    const { ctx } = this;
    const sql = 'select RoomCheckInMan.* from RoomCheckInMan, OrderRoom where OrderRoom.Order_id = :id and OrderRoom.deleteTag = 0 ' +
      'and OrderRoom.status != 2 and RoomCheckInMan.OrderRoom_id = OrderRoom.id and RoomCheckInMan.deleteTag = 0';
    try {
      return await mysqlUtil.query(ctx, sql, { id });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async verifyRoomCheckInMan(roomCheckInManIds, verifyTime) {
    const { ctx } = this;
    try {
      return await mysqlUtil.update(ctx, 'RoomCheckInMan', { verifyTime }, {
        where: { id: roomCheckInManIds },
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryRoomCheckInManByCheckInManIdsAndVerifyTime(checkInManIds, verifyTime) {
    const { ctx } = this;
    const sql1 = `select \`Order\`.id from \`Order\`, OrderRoom, RoomCheckInMan where RoomCheckInMan.CheckInMan_id in (${checkInManIds.join(',')}) and RoomCheckInMan.deleteTag = 0 and RoomCheckInMan.verifyTime is null and OrderRoom.id = RoomCheckInMan.OrderRoom_id and OrderRoom.deleteTag = 0 and \`Order\`.id = OrderRoom.Order_id and \`Order\`.deleteTag = 0 and parent_id is null and (startTime + 8 * 60 * 60 * 1000) < :verifyTime and (endTime + 8 * 60 * 60 * 1000) > :verifyTime`;
    try {
      const originOrder = (await mysqlUtil.query(ctx, sql1, { verifyTime }))[0];
      if (!originOrder) {
        return [];
      }
      const stayOrders = await mysqlUtil.select(ctx, 'Order', {
        where: { parent_id: originOrder.id },
      });
      let orderIds;
      if (stayOrders.length > 0) {
        orderIds = stayOrders.map(order => order.id).push(originOrder.id);
      } else {
        orderIds = [ originOrder.id ];
      }
      const sql2 = `select RoomCheckInMan.* from RoomCheckInMan, OrderRoom where OrderRoom.Order_id in (${orderIds.join(',')}) and OrderRoom.deleteTag = 0 and RoomCheckInMan.OrderRoom_id = OrderRoom.id and RoomCheckInMan.deleteTag = 0 and RoomCheckInMan.CheckInMan_id in (${checkInManIds.join(',')}) and RoomCheckInMan.verifyTime is null`;
      return await mysqlUtil.query(ctx, sql2, {});
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async changeOrderStatus(id, status) {
    const { ctx } = this;
    try {
      return await mysqlUtil.beginTransactionScope(ctx, async conn => {
        await mysqlUtil.connInsert(ctx, 'Order_OrderStatus', {
          Order_id: id,
          _OrderStatus_id: status,
          createdTime: new Date().getTime(),
        }, conn);
        await mysqlUtil.connUpdate(ctx, 'Order', {
          CurrentStatus_id: status,
        }, { where: { id } }, conn);
        return true;
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryOrderPriceByOrderId(id) {
    const { ctx } = this;
    try {
      return await mysqlUtil.select(ctx, 'OrderPrice', {
        where: { Order_id: id },
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryOrderPriceByTime(id, time) {
    const { ctx } = this;
    const sql = 'select * from OrderPrice where Order_id = :orderId and deleteTag = 0 and startTime >= :time';
    try {
      return await mysqlUtil.query(ctx, sql, { orderId: id, time });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async checkoutOrderRooms(orderRoomIds) {
    const { ctx } = this;
    try {
      return await mysqlUtil.update(ctx, 'OrderRoom', {
        status: 2,
        checkoutTime: new Date().getTime(),
      }, {
        where: { id: orderRoomIds },
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryOrderDetailById(id) {
    const { ctx } = this;
    try {
      const { contact, CurrentStatus_id, parent_id, RoomType_id, phone, isLocked, isCommented, isConsumed, ...order } = await mysqlUtil.get(ctx, 'Order', { id });
      const info = await mysqlUtil.get(ctx, 'RoomType', { id: RoomType_id });
      const roomType = {
        ...info,
        prices: (await mysqlUtil.select(ctx, 'Price', {
          where: { RoomType_id: info.id },
          orders: [[ 'month', 'asc' ], [ 'isWeekend', 'asc' ]],
        })).map(price => price.price),
        specialPrices: await mysqlUtil.select(ctx, 'SpecialPrice', { where: { RoomType_id: info.id } }),
        currentCount: await ctx.service.room.queryRoomTypeCurrentCount(info.id, order.startTime, order.endTime),
      };
      return {
        ...order,
        contact,
        status: CurrentStatus_id,
        parentId: parent_id,
        roomType,
        phone: ctx.helper.omit(mysqlUtil.aesDecrypt(ctx, phone), 3, { end: 4, replacer: '*'.repeat(4) }),
        isLocked: isLocked === 1,
        isCommented: isCommented === 1,
        isConsumed: isConsumed === 1,
      };
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }
}

module.exports = OrderService;
