'use strict';

const Service = require('egg').Service;
const mysqlUtil = require('../util/mysql');
const { OrderStatus, AuthorityType } = require('../util/constant');

class MemberService extends Service {
  async registerMember(userInfo, phone = null) {
    const { ctx } = this;
    try {
      // todo 派发优惠券
      return await mysqlUtil.insert(ctx, 'Member', {
        nickname: userInfo.nickName,
        avatar: userInfo.avatarUrl,
        gender: userInfo.gender,
        phone: phone ? mysqlUtil.aesEncrypt(ctx, phone) : null,
        createdTime: new Date().getTime(),
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async unregisterMember(id) {
    const { ctx } = this;
    try {
      return await mysqlUtil.update(ctx, 'Member', { deleteTag: 1 }, {
        where: { id },
      }, true);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryMemberById(id) {
    const { ctx } = this;
    try {
      return await mysqlUtil.get(ctx, 'Member', { id });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryMemberByPhone(phone) {
    const { ctx } = this;
    try {
      return await mysqlUtil.get(ctx, 'Member', { phone });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryMemberLevels(levelIds) {
    const { ctx } = this;
    try {
      return await mysqlUtil.select(ctx, '_MemberLevel', { where: { id: levelIds } });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryCheckInMenByIds(checkInManIds) {
    const { ctx } = this;
    try {
      return await mysqlUtil.unionSelect(ctx, 'CheckInMan', checkInManIds);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryMemberCheckInMan(id) {
    const { ctx } = this;
    try {
      return await mysqlUtil.select(ctx, 'CheckInMan', { where: { Member_id: id }, orders: [[ 'isSelf', 'desc' ]] });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryMemberCoupon(id) {
    const { ctx } = this;
    try {
      return await mysqlUtil.select(ctx, 'MemberCoupon', { where: { Member_id: id } });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryMemberCouponCountByCouponIdAndMemberId(id, couponId) {
    const { ctx } = this;
    try {
      return await mysqlUtil.count(ctx, 'MemberCoupon', {
        Member_id: id,
        Coupon_id: couponId,
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryMemberHotel(id, longitude, latitude, page, size, type) {
    const { ctx, app } = this;
    const offset = (page - 1) * size;
    try {
      let total;
      let hotels;
      if (type === 1) {
        const sql1 = 'select count(`Order`.id) as total from `Order`, RoomType, Hotel where `Order`.OrderMember_id = :id and `Order`.deleteTag = 0 ' +
          'and `Order`.CurrentStatus_id in (3, 5, 6) and `Order`.RoomType_id = RoomType.id and RoomType.Hotel_id = Hotel.id';
        const sql2 = 'select `Order`.id, Hotel.id as Hotel_id, `Order`.startTime as createdTime, :longitude as longitudeParam, ' +
          ':latitude as latitudeParam, :type as typeParam from `Order`, RoomType, Hotel where `Order`.OrderMember_id = :id ' +
          'and `Order`.deleteTag = 0 and `Order`.CurrentStatus_id in (3, 5, 6) and `Order`.RoomType_id = RoomType.id and RoomType.Hotel_id = Hotel.id ' +
          'order by `Order`.startTime desc, id desc limit :offset, :size';
        total = (await mysqlUtil.query(ctx, sql1, { id }))[0].total;
        hotels = await mysqlUtil.query(ctx, sql2, { longitude, latitude, type, id, offset, size });
      } else {
        total = await app.redis.get('db1').zcard(`${type === 0 ? 'collection' : 'view'}:${id}`);
        const data = await app.redis.get('db1').zrange(`${type === 0 ? 'collection' : 'view'}:${id}`, -page * size, -offset - 1, 'WITHSCORES');
        hotels = data.filter((_, i) => (i % 2) === 0)
          .map((d, i) => ({
            id: i,
            Hotel_id: parseInt(d),
            createdTime: parseInt(data[2 * i + 1]),
            longitudeParam: longitude,
            latitudeParam: latitude,
            typeParam: type,
          }));
      }
      return {
        total,
        hotels,
      };
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryMemberNotCommentOrder(id, page, size) {
    const { ctx } = this;
    try {
      return {
        total: await mysqlUtil.count(ctx, 'Order', {
          OrderMember_id: id,
          isCommented: 0,
          CurrentStatus_id: [ OrderStatus.PARTIAL_REFUND, OrderStatus.REFUND_COMPLETE ],
        }),
        orders: await mysqlUtil.select(ctx, 'Order', {
          where: {
            OrderMember_id: id,
            isCommented: 0,
            CurrentStatus_id: [ OrderStatus.PARTIAL_REFUND, OrderStatus.REFUND_COMPLETE ],
          },
          orders: [[ 'createdTime', 'desc' ]],
          limit: size,
          offset: (page - 1) * size,
        }),
      };
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryAuthRoomCheckInMan(orderRoomId) {
    const { ctx } = this;
    try {
      return await mysqlUtil.get(ctx, 'RoomCheckInMan', {
        OrderRoom_id: orderRoomId,
        role: [ AuthorityType.ORDER_PERSON, AuthorityType.AUTHORIZED_PERSON ],
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryMemberIdByOtherCheckInMan(checkInManId) {
    const { ctx } = this;
    const sql = 'select Member_id from CheckInMan, (select idCard from CheckInMan where id = :checkInManId) as CheckInManIdCard ' +
      'where CheckInMan.idCard = CheckInManIdCard.idCard and deleteTag = 0 and isSelf = 1';
    try {
      return (await mysqlUtil.query(ctx, sql, { checkInManId }))[0];
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async updatePhone(id, phone) {
    const { ctx } = this;
    try {
      return await mysqlUtil.update(ctx, 'Member', { phone: mysqlUtil.aesEncrypt(ctx, phone) }, { where: { id } });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async updateNickname(id, nickname) {
    const { ctx } = this;
    try {
      return await mysqlUtil.update(ctx, 'Member', { nickname }, { where: { id } });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async updateAvatar(id, avatar) {
    const { ctx } = this;
    try {
      return await mysqlUtil.update(ctx, 'Member', { avatar }, { where: { id } });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async updateOauth(id, oldId) {
    const { ctx } = this;
    try {
      return await mysqlUtil.update(ctx, 'Oauth', { Member_id: id }, {
        where: { Member_id: oldId, platform: 0 },
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async countMemberCheckInMan(memberId, idCard) {
    const { ctx } = this;
    try {
      return await mysqlUtil.count(ctx, 'CheckInMan', {
        Member_id: memberId,
        idCard,
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async insertCheckInMan(id, isSelf, card) {
    const { ctx } = this;
    try {
      const location = await ctx.service.amap.geoAddress(card.address);
      return await mysqlUtil.insert(ctx, 'CheckInMan', {
        Member_id: id,
        isSelf,
        name: mysqlUtil.aesEncrypt(ctx, card.name),
        idCard: mysqlUtil.aesEncrypt(ctx, card.idCard),
        gender: card.gender,
        birth: card.birth,
        nation: card.nation,
        address: card.address,
        province: location.province,
        city: location.city,
        createdTime: new Date().getTime(),
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async insertCheckInMenWithNameAndIdCard(id, name, idCard) {
    const { ctx } = this;
    try {
      return await mysqlUtil.insert(ctx, 'CheckInMan', {
        Member_id: id,
        name: mysqlUtil.aesEncrypt(ctx, name),
        idCard: mysqlUtil.aesEncrypt(ctx, idCard),
        createdTime: new Date().getTime(),
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async delMemberCheckInMan(checkInManId) {
    const { ctx } = this;
    try {
      return await mysqlUtil.update(ctx, 'CheckInMan', { deleteTag: 1 }, {
        where: { id: checkInManId },
      }, true);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryCheckInManById(checkInManId) {
    const { ctx } = this;
    try {
      return await mysqlUtil.get(ctx, 'CheckInMan', { id: checkInManId });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryOnProcessingOrder(id) {
    const { ctx } = this;
    try {
      return await mysqlUtil.select(ctx, 'Order', { where: { OrderMember_id: id, CurrentStatus_id: [ 0, 5 ] } });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryMemberCollectionView(id, type) {
    const { ctx, app } = this;
    try {
      const data = await app.redis.get('db1').zrange(`${type === 0 ? 'collection' : 'view'}:${id}`, 0, -1, 'WITHSCORES');
      return data.filter((_, i) => (i % 2) === 0)
        .map((id, i) => ({
          hotelId: parseInt(id),
          createdTime: parseInt(data[2 * i + 1]),
        }));
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async addMemberCollectHotel(id, hotelId) {
    const { ctx, app } = this;
    try {
      await app.redis.get('db1').zadd(`collection:${id}`, new Date().getTime(), hotelId);
      return true;
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async deleteMemberCollectHotel(id, memberCollectionIds) {
    const { ctx, app } = this;
    try {
      await app.redis.get('db1').zrem(`collection:${id}`, memberCollectionIds);
      return true;
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async deleteMemberViews(id) {
    const { ctx, app } = this;
    try {
      await app.redis.get('db1').zremrangebyrank(`view:${id}`, 0, -1);
      return true;
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async memberLikeAComment(role, commentId) {
    const { ctx, app } = this;
    try {
      // todo 点赞
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryMemberOrder(id, statuses, page, size) {
    const { ctx } = this;
    const offset = (page - 1) * size;
    let newStatuses = [];
    if (statuses.includes(-1)) {
      Object.keys(OrderStatus).forEach(status => {
        if (status !== OrderStatus.ALL) {
          newStatuses.push(OrderStatus[status]);
        }
      });
    } else {
      newStatuses = statuses.slice();
    }
    try {
      const checkInManIds = await this.queryCheckInManIdsByMemberId(id);
      const sql = `select * from \`Order\` where CurrentStatus_id in (${newStatuses.join(',')}) and (OrderMember_id = :id or id in 
      (select \`Order\`.id from \`Order\`, OrderRoom, RoomCheckInMan where RoomCheckInMan.CheckInMan_id in (${checkInManIds.join(',')}) 
      and RoomCheckInMan.deleteTag = 0 and RoomCheckInMan.role in (0, 1, 2) and RoomCheckInMan.OrderRoom_id = OrderRoom.id and OrderRoom.deleteTag = 0 and 
      OrderRoom.Order_id = \`Order\`.id)) and \`Order\`.deleteTag = 0 order by \`Order\`.createdTime desc`;
      const orders = await mysqlUtil.query(ctx, sql, { id });
      return {
        total: orders.length,
        orders: orders.slice(offset, offset + size),
      };
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async unlockMemberCouponByMemberCouponId(memberCouponId) {
    const { ctx } = this;
    try {
      return await mysqlUtil.update(ctx, 'MemberCoupon', {
        status: 0,
      }, { where: { id: memberCouponId } });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async insertMemberView(id, hotelId, createdTime) {
    const { ctx, app } = this;
    try {
      await app.redis.get('db1').zadd(`view:${id}`, createdTime, hotelId);
      return true;
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async coverCheckInMan(id, name, idCard) {
    const { ctx } = this;
    try {
      return await mysqlUtil.update(ctx, 'CheckInMan', {
        name: mysqlUtil.aesEncrypt(ctx, name), idCard: mysqlUtil.aesEncrypt(ctx, idCard),
      }, {
        where: { Member_id: id, isSelf: 1 },
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryCheckInManByMemberId(memberId) {
    const { ctx } = this;
    try {
      const checkInMan = await mysqlUtil.get(ctx, 'CheckInMan', { Member_id: memberId, isSelf: 1 });
      if (checkInMan) {
        return {
          id: checkInMan.id,
          name: mysqlUtil.aesDecrypt(ctx, checkInMan.name),
          idCard: mysqlUtil.aesDecrypt(ctx, checkInMan.idCard),
          tag: checkInMan.idCard,
        };
      }
      return null;
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryCheckInManIdsByMemberId(id) {
    const { ctx } = this;
    const sql = 'select CheckInMan.id from CheckInMan, (select CheckInMan.idCard from CheckInMan where Member_id = :id ' +
      'and CheckInMan.deleteTag = 0 and CheckInMan.isSelf = 1) as CheckInManIdCard ' +
      'where CheckInMan.idCard = CheckInManIdCard.idCard and deleteTag = 0';
    try {
      return (await mysqlUtil.query(ctx, sql, { id })).map(checkInMan => checkInMan.id);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryCheckInManIdsByOrderMemberIdAndMemberId(orderMemberId, id) {
    const { ctx } = this;
    try {
      if (orderMemberId === id) {
        return [
          0,
          (await mysqlUtil.select(ctx, 'CheckInMan', { Member_id: id, isSelf: 1 })).id,
        ];
      }
      const sql = 'select CheckInMan.id from CheckInMan, (select CheckInMan.idCard from CheckInMan where Member_id = :id ' +
        'and CheckInMan.deleteTag = 0 and CheckInMan.isSelf = 1) as CheckInManIdCard where CheckInMan.idCard = CheckInManIdCard.idCard ' +
        'and CheckInMan.Member_id = :orderRoomId and deleteTag = 0';
      return [ (await mysqlUtil.query(ctx, sql, { id, orderMemberId })).id ];
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryCheckInMenByMemberId(id) {
    const { ctx } = this;
    try {
      return await mysqlUtil.select(ctx, 'CheckInMan', {
        where: { Member_id: id },
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryCheckInManByMemberIdAndIdCard(id, idCard) {
    const { ctx } = this;
    try {
      return await mysqlUtil.get(ctx, 'CheckInMan', { Member_id: id, idCard: mysqlUtil.aesEncrypt(ctx, idCard) });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async copyCheckInMan(id, checkInMan) {
    const { ctx } = this;
    try {
      const data = await mysqlUtil.get(ctx, 'CheckInMan', { Member_id: id, idCard: checkInMan.idCard });
      if (data) {
        return data.id;
      }
      return await mysqlUtil.insert(ctx, 'CheckInMan', {
        Member_id: id,
        isSelf: 0,
        name: checkInMan.name,
        idCard: checkInMan.idCard,
        gender: checkInMan.gender,
        birth: checkInMan.birth,
        nation: checkInMan.nation,
        address: checkInMan.address,
        province: checkInMan.province,
        city: checkInMan.city,
        createdTime: new Date().getTime(),
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryCheckInManByIdCard(idCard) {
    const { ctx } = this;
    try {
      return await mysqlUtil.select(ctx, 'CheckInMan', { where: { idCard: mysqlUtil.aesEncrypt(ctx, idCard) } });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async querySelfCheckInManByIdCard(idCard) {
    const { ctx } = this;
    try {
      return await mysqlUtil.select(ctx, 'CheckInMan', { where: { isSelf: 1, idCard } });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async updateCheckInMan(checkInManIds, data, picUrl, url) {
    const { ctx } = this;
    try {
      const location = await ctx.service.amap.geoAddress(data.address.trim());
      return await mysqlUtil.update(ctx, 'CheckInMan', {
        name: mysqlUtil.aesEncrypt(ctx, data.name.trim()),
        gender: data.sex.trim() === '男' ? 1 : 2,
        birth: data.birth.trim(),
        nation: data.nation.trim(),
        address: data.address.trim(),
        province: location.province,
        city: location.city,
        pic: picUrl,
        realTimePic: url,
      }, { where: { id: checkInManIds } });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryMemberByCommentId(commentId) {
    const { ctx } = this;
    const sql = 'select Member.* from Member, `Order`, Comment where Comment.id = :commentId and `Order`.id = Comment.Order_id ' +
      'and Member.id = `Order`.OrderMember_id';
    try {
      return (await mysqlUtil.query(ctx, sql, { commentId }))[0];
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryWechatOauthByMemberId(memberId) {
    const { ctx } = this;
    try {
      return await mysqlUtil.get(ctx, 'Oauth', { Member_id: memberId, platform: 0 });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryWechatOauthByOpenId(openId) {
    const { ctx } = this;
    try {
      return await mysqlUtil.get(ctx, 'Oauth', { platform: 0, openId });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }
}

module.exports = MemberService;
