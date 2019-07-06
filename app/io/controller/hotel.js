'use strict';

const Controller = require('egg').Controller;

class AdminBackController extends Controller {
  async index() {
    const { ctx } = this;
    const [ message ] = ctx.args || {};
    try {
      console.log('chat :', JSON.stringify(message) + ' : ' + process.pid);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }
}

module.exports = AdminBackController;
