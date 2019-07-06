'use strict';

const Service = require('egg').Service;
const mysqlUtil = require('../util/mysql');
const { AuditType, ImageType } = require('../util/constant');

class HotelService extends Service {

  async queryHotelList(startTime, endTime, longitude, latitude, page, size, orders) {
    const { ctx } = this;
    const offset = (page - 1) * size;
    const month = new Date(startTime).getMonth();
    const orderBy = orders ? orders.map(order => order.join(' ')).join() : 'distance';
    const sql = `select HotelList.*, OrderCount.orderCount, CommentCount.commentCount, min(HotelPrice.Price) as minPrice, :startTime as startTimeParam 
    from (select Hotel.*, ${mysqlUtil.hotelDistanceSql(longitude, latitude)} 
    from Hotel where Hotel.deleteTag = 0 limit :offset, :size) as HotelList 
    left join (select id as hotelId, (select count(\`Order\`.id) from \`Order\`, RoomType, Order_OrderStatus where \`Order\`.deleteTag = 0 
    and \`Order\`.RoomType_id = RoomType.id and RoomType.deleteTag = 0 and RoomType.Hotel_id = Hotel.id and \`Order\`.id = Order_OrderStatus.Order_id 
    and Order_OrderStatus.deleteTag = 0 and Order_OrderStatus.\`_OrderStatus_id\` = 5) as orderCount from Hotel) as OrderCount 
    on OrderCount.hotelId = HotelList.id 
    left join (select id as hotelId, (select count(Comment.id) from Comment, \`Order\`, RoomType where Comment.deleteTag = 0 
    and Comment.Order_id = \`Order\`.id and \`Order\`.deleteTag = 0 and \`Order\`.RoomType_id = RoomType.id and RoomType.deleteTag = 0 
    and RoomType.Hotel_id = Hotel.id) as commentCount from Hotel) as CommentCount on CommentCount.hotelId = HotelList.id 
    left join (select Hotel_id, case when (select count(SpecialPrice.price) from SpecialPrice where SpecialPrice.deleteTag = 0 
    and SpecialPrice.RoomType_id = RoomType.id and SpecialPrice.startTime <= :startTime and SpecialPrice.endTime > :startTime) > 0 then 
    (select min(SpecialPrice.price) from SpecialPrice where SpecialPrice.deleteTag = 0 and SpecialPrice.RoomType_id = RoomType.id 
    and SpecialPrice.startTime <= :startTime and SpecialPrice.endTime > :startTime) else (select min(Price.price) from Price 
    where Price.deleteTag = 0 and Price.RoomType_id = RoomType.id and Price.month = :month 
    and Price.isWeekend = (select instr((select weekend from HotelInfo where HotelInfo.Hotel_id = RoomType.Hotel_id), date_format(from_unixtime(:startTime / 1000),'%w')) > 0)) 
    end as Price from RoomType where auditStatus = 1 and status = 0) as HotelPrice 
    on HotelPrice.Hotel_id = HotelList.id group by HotelList.id order by ${orderBy}`;
    try {
      return {
        total: await mysqlUtil.count(ctx, 'Hotel', {}),
        hotels: await mysqlUtil.query(ctx, sql, { offset, size, startTime, month }),
      };
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryHotelDetail(hotelId, startTime, endTime, longitude, latitude) {
    const { ctx } = this;
    const month = new Date(startTime).getMonth();
    const sql = `select HotelDetail.*, min(HotelPrice.Price) as minPrice, :startTime as startTimeParam, :endTime as endTimeParam, :longitude as longitudeParam, :latitude as latitudeParam 
    from (select *, ${mysqlUtil.hotelDistanceSql(longitude, latitude)}, (select count(\`Order\`.id) from \`Order\`, RoomType, Order_OrderStatus 
    where RoomType.Hotel_id = :id and RoomType.deleteTag = 0 and \`Order\`.RoomType_id = RoomType.id and \`Order\`.deleteTag = 0 
    and \`Order\`.id = Order_OrderStatus.Order_id and Order_OrderStatus.deleteTag = 0 and Order_OrderStatus.\`_OrderStatus_id\` = 5) as orderCount, 
    (select count(Comment.id) from Comment, \`Order\`, RoomType where RoomType.Hotel_id = :id and RoomType.deleteTag = 0 
    and \`Order\`.RoomType_id = RoomType.id and \`Order\`.deleteTag = 0 and Comment.Order_id = \`Order\`.id and Comment.deleteTag = 0) as commentCount, 
    (select count(Comment.id) from Comment, \`Order\`, RoomType where RoomType.Hotel_id = :id and RoomType.deleteTag = 0 
    and \`Order\`.RoomType_id = RoomType.id and \`Order\`.deleteTag = 0 and Comment.Order_id = \`Order\`.id and Comment.deleteTag = 0 
    and (Comment.serviceRate + Comment.hygieneRate + Comment.positionRate + Comment.deviceRate) > 120) as highRateCommentCount from Hotel 
    where Hotel.id = :id) as HotelDetail left join (select Hotel_id, case when (select count(SpecialPrice.price) from SpecialPrice 
    where SpecialPrice.deleteTag = 0 and SpecialPrice.RoomType_id = RoomType.id and SpecialPrice.startTime <= :startTime and SpecialPrice.endTime > :startTime) > 0 
    then (select min(SpecialPrice.price) from SpecialPrice where SpecialPrice.deleteTag = 0 
    and SpecialPrice.RoomType_id = RoomType.id and SpecialPrice.startTime <= :startTime and SpecialPrice.endTime > :startTime) 
    else (select min(Price.price) from Price where Price.deleteTag = 0 and Price.RoomType_id = RoomType.id and Price.month = :month 
    and Price.isWeekend = (select instr((select weekend from HotelInfo where HotelInfo.Hotel_id = RoomType.Hotel_id), 
    date_format(from_unixtime(:startTime / 1000),'%w')) > 0)) end as Price from RoomType where auditStatus = 1 and status = 0) as HotelPrice on HotelPrice.Hotel_id = :id`;
    try {
      return (await mysqlUtil.query(ctx, sql, { endTime, longitude, latitude, id: hotelId, startTime, month }))[0];
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryHotelByStaffId(staffId) {
    const { ctx } = this;
    const sql = 'select Hotel.* from Hotel, Staff where Staff.id = :staffId ' +
      'and Staff.Hotel_id = Hotel.id';
    try {
      return (await mysqlUtil.query(ctx, sql, { staffId }))[0];
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryHotelInfoByHotelId(id) {
    const { ctx } = this;
    try {
      return await mysqlUtil.get(ctx, 'HotelInfo', { Hotel_id: id });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryHotelLicense(id) {
    const { ctx } = this;
    try {
      return await mysqlUtil.get(ctx, 'HotelLicense', { Hotel_id: id });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryHotelStars(starIds) {
    const { ctx } = this;
    try {
      return await mysqlUtil.unionSelect(ctx, '_HotelStar', starIds);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryHotelTypes(typeIds) {
    const { ctx } = this;
    try {
      return await mysqlUtil.unionSelect(ctx, '_HotelType', typeIds);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryHotelImage(id) {
    const { ctx } = this;
    try {
      return await mysqlUtil.select(ctx, 'HotelImage', { where: { _ImageType_id: ImageType.HOTEL, tableId: id } });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryHotelLandLine(id) {
    const { ctx } = this;
    try {
      return await mysqlUtil.select(ctx, 'HotelLandLine', { where: { Hotel_id: id } });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryHotelPhone(id) {
    const { ctx } = this;
    try {
      return await mysqlUtil.select(ctx, 'HotelPhone', { where: { Hotel_id: id } });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryHotelLabel(hotelId, startTime) {
    // todo 检索标签
    const { ctx } = this;
    const labels = [];
    const sql = '';
    // if (await mysqlUtil.query(ctx, sql, { id: hotelId, startTime }))
    return [
      {
        name: '限时特价',
        type: 0,
      },
      {
        name: '钟点房',
        type: 2,
      },
    ];
  }

  async queryHotels(ids) {
    const { ctx } = this;
    try {
      return await mysqlUtil.unionSelect(ctx, 'Hotel', ids);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryHotelByRoomType(roomTypeId) {
    const { ctx } = this;
    const sql = 'select Hotel.* from Hotel, RoomType where RoomType.id = :roomTypeId and RoomType.Hotel_id = Hotel.id';
    try {
      return (await mysqlUtil.query(ctx, sql, { roomTypeId }))[0];
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async updateHotelViews(id) {
    const { ctx, app } = this;
    try {
      await app.redis.get('db1').zincrby('hotel_view', 1, id);
      return true;
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryMemberHotelDetail(id, longitude, latitude) {
    const { ctx } = this;
    const sql = `select HotelDetail.*, min(HotelPrice.Price) as minPrice from (select *, ${mysqlUtil.hotelDistanceSql(longitude, latitude)}, 
    (select count(\`Order\`.id) from \`Order\`, RoomType where RoomType.Hotel_id = :id and RoomType.deleteTag = 0 
    and \`Order\`.RoomType_id = RoomType.id and \`Order\`.deleteTag = 0) as orderCount, (select count(Comment.id) 
    from Comment, \`Order\`, RoomType where RoomType.Hotel_id = :id and RoomType.deleteTag = 0 and \`Order\`.RoomType_id = RoomType.id 
    and \`Order\`.deleteTag = 0 and Comment.Order_id = \`Order\`.id and Comment.deleteTag = 0) as commentCount from Hotel 
    where Hotel.id = :id) as HotelDetail left join (select Hotel_id, case when (select count(SpecialPrice.price) 
    from SpecialPrice where SpecialPrice.deleteTag = 0 and SpecialPrice.RoomType_id = RoomType.id 
    and SpecialPrice.startTime <= unix_timestamp(now()) * 1000 and SpecialPrice.endTime > unix_timestamp(now()) * 1000) > 0 
    then (select min(SpecialPrice.price) from SpecialPrice where SpecialPrice.deleteTag = 0 and SpecialPrice.RoomType_id = RoomType.id 
    and SpecialPrice.startTime <= unix_timestamp(now()) * 1000 and SpecialPrice.endTime > unix_timestamp(now()) * 1000) else (select min(Price.price) 
    from Price where Price.deleteTag = 0 and Price.RoomType_id = RoomType.id and Price.month = MONTH(CURDATE()) - 1 
    and Price.isWeekend = (select instr((select weekend from HotelInfo where HotelInfo.Hotel_id = RoomType.Hotel_id), 
    date_format(curdate(),'%w')) > 0)) end as Price from RoomType where auditStatus = 1 and status = 0) as HotelPrice on HotelPrice.Hotel_id = :id`;
    try {
      return (await mysqlUtil.query(ctx, sql, { id }))[0];
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryBaseHotelInfo(id) {
    const { ctx } = this;
    const sql = 'select id, address, longitude, latitude, status, province, city, district, 0 as auditState, null as suggestion from Hotel where id = :id';
    try {
      return (await mysqlUtil.query(ctx, sql, { id }))[0];
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryHigherHotelInfo(id) {
    const { ctx } = this;
    const sql = 'select Hotel.id, Hotel.`_HotelType_id`, Hotel.renovationTime, Hotel.introduction, HotelInfo.deposit, HotelInfo.startTime, ' +
      'HotelInfo.endTime, HotelInfo.checkoutTime, HotelInfo.cancelTime, HotelInfo.weekend, 0 as auditState, null as suggestion ' +
      'from Hotel, HotelInfo where Hotel.id = :id and Hotel.id = HotelInfo.Hotel_id';
    try {
      return (await mysqlUtil.query(ctx, sql, { id }))[0];
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async insertAuditLicense(license) {
    const { ctx } = this;
    const { id, ...info } = license;
    const modified = JSON.stringify(info);
    try {
      return await mysqlUtil.insert(ctx, 'Audit', {
        _AuditType_id: AuditType.LICENSE,
        tableId: id,
        modified,
        createdTime: new Date().getTime(),
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async insertAuditBaseHotelInfo(baseHotelInfo) {
    const { ctx } = this;
    const { id, ...info } = baseHotelInfo;
    const modified = JSON.stringify(info);
    try {
      return await mysqlUtil.insert(ctx, 'Audit', {
        _AuditType_id: AuditType.BASE_HOTEL_INFO,
        tableId: id,
        modified,
        createdTime: new Date().getTime(),
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async insertAuditHigherHotelInfo(higherHotelInfo) {
    const { ctx } = this;
    const { id, ...info } = higherHotelInfo;
    const modified = JSON.stringify(info);
    try {
      return await mysqlUtil.insert(ctx, 'Audit', {
        _AuditType_id: AuditType.HIGHER_HOTEL_INFO,
        tableId: id,
        modified,
        createdTime: new Date().getTime(),
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryWeekendByHotelId(id) {
    const { ctx } = this;
    try {
      return (await mysqlUtil.get(ctx, 'HotelInfo', { Hotel_id: id })).weekend;
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }
}

module.exports = HotelService;
