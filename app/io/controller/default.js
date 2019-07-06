'use strict';

const Controller = require('egg').Controller;

class DefaultController extends Controller {
  async sweep() {
    const { ctx } = this;
    const [ message ] = ctx.args || {};
    try {
      console.log('chat :', JSON.stringify(message) + ' : ' + process.pid);
      await ctx.socket.emit('sweep', { a: `Hi! I've got your message: ${message.a}` });
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }
}

module.exports = DefaultController;
