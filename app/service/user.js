'use strict';

const Service = require('egg').Service;
const mysqlUtil = require('../util/mysql');

class UserService extends Service {

  async findById(id) {
    const { ctx } = this;
    try {
      return await mysqlUtil.get(ctx, 'User', { id });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async findAll() {
    const { ctx } = this;
    try {
      return await mysqlUtil.select(ctx, 'User', {});
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async createUser(name, age) {
    const { ctx } = this;
    try {
      return await mysqlUtil.insert(ctx, 'User', {
        name,
        age,
        createdTime: new Date().getTime(),
      });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async removeUser(id) {
    const { ctx } = this;
    try {
      return await mysqlUtil.update(ctx, 'User', { deleteTag: 1 }, { id }, true);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }
}

module.exports = UserService;
