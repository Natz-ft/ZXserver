'use strict';

class ClientHelpConnector {
  constructor(ctx) {
    this.ctx = ctx;
  }

  getHelp(page, size) {
    const { ctx } = this;
    return ctx.service.help.queryHelp(page, size);
  }

  getHelpDetailById(id) {
    const { ctx } = this;
    return ctx.service.help.queryHelpDetailById(id);
  }

  async addAHelp(index, question, answer) {
    const { ctx } = this;
    try {
      const id = await ctx.service.help.insertHelp(index, question, answer);
      return await ctx.service.help.queryHelpDetailById(id);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async renewHelp(id, index, question, answer) {
    const { ctx } = this;
    try {
      await ctx.service.help.updateAHelp(id, index, question, answer);
      return await ctx.service.help.queryHelpDetailById(id);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }
}

module.exports = ClientHelpConnector;
