'use strict';

const Service = require('egg').Service;

class IoService extends Service {

  async emitSweeper(hotelId, message) {
    const { ctx, app } = this;
    try {
      await app.io.of('/sweeper').to(`sweeper:${hotelId}`).emit('sweep', message);
    } catch (e) {
      ctx.logger.error(e);
    }
  }

  async emitHotel(hotelId, event, message) {
    const { ctx, app } = this;
    try {
      await app.io.of('/hotel').to(`hotel:${hotelId}`).emit(event, message);
    } catch (e) {
      ctx.logger.error(e);
    }
  }
}

module.exports = IoService;
