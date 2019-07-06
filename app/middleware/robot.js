'use strict';

module.exports = options => {
  return async function robotMiddleware(ctx, next) {
    const source = ctx.get('user-agent') || '';
    const match = options.ua.some(ua => ua.test(source));
    if (match) {
      ctx.status = 403;
      ctx.message = 'Go away, robot.';
    } else {
      try {
        await next();
      } catch (e) {
        ctx.logger.error(e);
        ctx.status = 400;
        ctx.body = {
          error: '未知错误',
        };
      }
    }
  };
};
