'use strict';

const Service = require('egg').Service;
const mysqlUtil = require('../util/mysql');

class HelpService extends Service {
  async queryHelp(page, size) {
    const { ctx } = this;
    try {
      return {
        total: await mysqlUtil.count(ctx, 'Help', {}),
        helps: await mysqlUtil.select(ctx, 'Help', {
          columns: [ 'id', 'index', 'question', 'updatedTime' ],
          orders: [[ 'index', 'asc' ]],
          limit: size,
          offset: (page - 1) * size,
        }),
      };
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryHelpDetailById(id) {
    const { ctx } = this;
    try {
      return await mysqlUtil.get(ctx, 'Help', { id });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async insertHelp(index, question, answer) {
    const { ctx } = this;
    const time = new Date().getTime();
    try {
      return await mysqlUtil.insert(ctx, 'Help', {
        index,
        question,
        answer,
        updatedTime: time,
        createdTime: time,
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async updateAHelp(id, index, question, answer) {
    const { ctx } = this;
    try {
      return await mysqlUtil.update(ctx, 'Help', {
        index,
        question,
        answer,
        updatedTime: new Date().getTime(),
      }, { where: { id } });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }
}

module.exports = HelpService;
