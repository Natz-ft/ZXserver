'use strict';

const Service = require('egg').Service;
const mysqlUtil = require('../util/mysql');
const sha1 = require('sha1');

class StaffService extends Service {

  async queryStaffById(id) {
    const { ctx } = this;
    try {
      return await mysqlUtil.get(ctx, 'Staff', { id });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryStaffByPassword(username, password) {
    const { ctx } = this;
    try {
      return await mysqlUtil.get(ctx, 'Staff', { username, password: sha1(password) });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async queryStaffByIds(ids) {
    const { ctx } = this;
    try {
      return await mysqlUtil.unionSelect(ctx, 'Staff', ids);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async updateAvatar(id, avatar) {
    const { ctx } = this;
    try {
      return await mysqlUtil.update(ctx, 'Staff', { avatar }, { where: { id } });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }
}

module.exports = StaffService;
