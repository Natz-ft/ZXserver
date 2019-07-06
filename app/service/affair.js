'use strict';

const Service = require('egg').Service;
const mysqlUtil = require('../util/mysql');

class AffairService extends Service {

  async insertAffair(memberId, orderRoomId, type, expectTime, content) {
    const { ctx } = this;
    try {
      return await mysqlUtil.insert(ctx, 'Affair', {
        OrderRoom_id: orderRoomId,
        Member_id: memberId,
        type,
        expectTime,
        content,
        createdTime: new Date().getTime(),
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }
}

module.exports = AffairService;
