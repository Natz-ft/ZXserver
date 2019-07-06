'use strict';

const DataLoader = require('dataloader');
const { ErrorCode, Role } = require('../../util/constant');

class AdminStaffConnector {
  constructor(ctx) {
    this.ctx = ctx;
    this.loader = new DataLoader(this.getStaffByIds.bind(this), { cache: false });
  }

  async loginWithPassword(username, password, source) {
    const { ctx } = this;
    let staff;
    try {
      staff = await ctx.service.staff.queryStaffByPassword(username, password);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (!staff) {
      ctx.helper.errorLog(ctx, ErrorCode.staff.ACCOUNT_OR_PASSWORD_ERROR, { username, password });
    }
    ctx.set('token', ctx.helper.createToken(staff.Hotel_id === 0 ? Role.SYSTEM_STAFF : Role.HOTEL_STAFF, staff.type, staff.id, source));
    return staff;
  }

  getStaffByIds(ids) {
    const { ctx } = this;
    return ctx.service.staff.queryStaffByIds(ids);
  }

  getStaffById(id) {
    return this.loader.load(id);
  }
}

module.exports = AdminStaffConnector;
