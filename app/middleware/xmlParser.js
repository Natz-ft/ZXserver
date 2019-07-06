'use strict';

const bodyParser = require('body-parser');

module.exports = () => {
  return async function robotMiddleware(ctx, next) {
    ctx.app.use(bodyParser.urlencoded({
      extended: true,
    }));
    try {
      await next();
    } catch (e) {
      ctx.logger.error(e);
      ctx.status = 400;
      ctx.body = {
        error: '未知错误',
      };
    }
  };
};
