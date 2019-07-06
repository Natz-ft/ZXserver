'use strict';

const Service = require('egg').Service;
const mysqlUtil = require('../util/mysql');
const { AuditType, ImageType } = require('../util/constant');

class AuditService extends Service {

  async queryAuditById(id) {
    const { ctx } = this;
    try {
      return await mysqlUtil.get(ctx, 'Audit', { id });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryAuditByType(type, tableId) {
    const { ctx } = this;
    const sql = 'select * from Audit where `_AuditType_id` = :type and tableId = :tableId and deleteTag = 0 order by createdTime desc limit 1';
    try {
      return (await mysqlUtil.query(ctx, sql, { type, tableId }))[0];
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryRequestAudit(type, status, page, size) {
    const { ctx } = this;
    const where = { _AuditType_id: type };
    if (status !== -1) {
      where.status = status;
    }
    try {
      return {
        total: await mysqlUtil.count(ctx, 'Audit', where),
        audits: await mysqlUtil.select(ctx, 'Audit', {
          where,
          limit: size,
          offset: (page - 1) * size,
        }),
      };
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryUpcomingAuditCount() {
    const { ctx } = this;
    const sql = 'select `_AuditType_id` as type, count(*) as count from Audit where status = 0 group by `_AuditType_id`';
    try {
      const types = await mysqlUtil.select(ctx, '_AuditType', {});
      const counts = await mysqlUtil.query(ctx, sql, {});
      return types.map((_, index) => {
        const count = counts.find(count => count.type === index);
        return count ? count.count : 0;
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async auditRequested(role, audit, status, suggestion) {
    const { ctx } = this;
    const modified = JSON.parse(audit.modified);
    const time = new Date().getTime();
    try {
      let infoId;
      if (audit._AuditType_id === AuditType.HIGHER_HOTEL_INFO) {
        infoId = (await ctx.service.hotel.queryHotelInfoByHotelId(audit.tableId)).id;
      }
      return await mysqlUtil.beginTransactionScope(ctx, async conn => {
        await mysqlUtil.connUpdate(ctx, 'Audit', {
          Staff_id: role.id,
          status,
          suggestion,
          auditedTime: time,
        }, {
          where: { id: audit.id },
        }, conn);
        switch (audit._AuditType_id) {
          case AuditType.LICENSE: {
            const license = await mysqlUtil.get(ctx, 'HotelLicense', { Hotel_id: audit.tableId });
            if (license) {
              await mysqlUtil.connUpdate(ctx, 'HotelLicense', {
                ...modified,
                updatedTime: time,
              }, {
                where: { id: license.id },
              }, conn);
            } else {
              await mysqlUtil.connInsert(ctx, 'HotelLicense', {
                Hotel_id: audit.tableId,
                ...modified,
                updatedTime: time,
                createdTime: time,
              }, conn);
            }
          }
            break;
          case AuditType.BASE_HOTEL_INFO: {
            const { landLines, phones, ...info } = modified;
            await mysqlUtil.connUpdate(ctx, 'HotelLandLine', { deleteTag: 1 }, {
              where: { Hotel_id: audit.tableId },
            }, conn, true);
            await Promise.all(landLines.map(landLine => mysqlUtil.connInsert(ctx, 'HotelLandLine', {
              Hotel_id: audit.tableId,
              number: landLine,
            }, conn)));
            await mysqlUtil.connUpdate(ctx, 'HotelPhone', { deleteTag: 1 }, {
              where: { Hotel_id: audit.tableId },
            }, conn, true);
            await Promise.all(phones.map(phone => mysqlUtil.connInsert(ctx, 'HotelPhone', {
              Hotel_id: audit.tableId,
              phone,
            }, conn)));
            await mysqlUtil.connUpdate(ctx, 'Hotel', info, {
              where: { id: audit.tableId },
            }, conn);
          }
            break;
          case AuditType.HIGHER_HOTEL_INFO: {
            const { hotelType, renovationTime, introduction, deposit, startTime, endTime, checkoutTime, cancelTime, weekend } = modified;
            await mysqlUtil.connUpdate(ctx, 'Hotel', {
              _HotelType_id: hotelType,
              introduction,
              renovationTime,
            }, {
              where: { id: audit.tableId },
            }, conn);
            await mysqlUtil.connUpdate(ctx, 'HotelInfo', {
              deposit,
              startTime,
              endTime,
              checkoutTime,
              cancelTime,
              weekend: `[${weekend.join(',')}]`,
            }, {
              where: { id: infoId },
            }, conn);
          }
            break;
          case AuditType.ROOM_TYPE: {
            const { workPrice, weekendPrice, specialTime, tags, pictures, ...info } = modified;
            await Promise.all(workPrice.map(work => mysqlUtil.connUpdate(ctx, 'Price', { price: work.price }, {
              where: {
                RoomType_id: audit.tableId,
                month: work.month,
                isWeekend: 0,
              },
            }, conn)));
            await Promise.all(weekendPrice.map(weekend => mysqlUtil.connUpdate(ctx, 'Price', { price: weekend.price }, {
              where: {
                RoomType_id: audit.tableId,
                month: weekend.month,
                isWeekend: 1,
              },
            }, conn)));
            await mysqlUtil.connUpdate(ctx, 'SpecialPrice', { deleteTag: 1 }, {
              where: { RoomType_id: audit.tableId },
            }, conn, true);
            await Promise.all(specialTime.map(special => mysqlUtil.connInsert(ctx, 'SpecialPrice', {
              RoomType_id: audit.tableId,
              ...special,
            }, conn)));
            await mysqlUtil.connUpdate(ctx, 'RoomTypeLabel', { deleteTag: 1 }, {
              where: { RoomType_id: audit.tableId },
            }, conn, true);
            await Promise.all(tags.map(tag => mysqlUtil.connInsert(ctx, 'RoomTypeLabel', {
              RoomType_id: audit.tableId,
              description: tag,
            }, conn)));
            await mysqlUtil.connUpdate(ctx, 'HotelImage', { deleteTag: 1 }, {
              where: {
                _ImageType_id: ImageType.ROOM_TYPE,
                tableId: audit.tableId,
              },
            }, conn, true);
            await Promise.all(pictures.map(picture => mysqlUtil.connInsert(ctx, 'HotelImage', {
              _ImageType_id: ImageType.ROOM_TYPE,
              tableId: audit.tableId,
              url: picture,
            }, conn)));
            await mysqlUtil.connUpdate(ctx, 'RoomType', {
              ...info,
              auditStatus: status,
            }, {
              where: { id: audit.tableId },
            }, conn);
          }
            break;
          case AuditType.COMMENT:
            await mysqlUtil.connUpdate(ctx, 'Comment', { status }, {
              where: { id: audit.tableId },
            }, conn);
            break;
          case AuditType.MERCHANDISE:
            await mysqlUtil.connUpdate(ctx, 'Merchandise', {
              ...modified,
              status,
            }, {
              where: { id: audit.tableId },
            }, conn);
            break;
          default:
            break;
        }
        return true;
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }
}

module.exports = AuditService;
