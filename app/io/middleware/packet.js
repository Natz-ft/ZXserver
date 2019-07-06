'use strict';

module.exports = () => {
  return async (ctx, next) => {
    ctx.socket.emit('res', 'packet received!');
    console.log('packet:', this.packet);
    try {
      await next();
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  };
};
