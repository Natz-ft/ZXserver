'use strict';

const Controller = require('egg').Controller;

class LoginController extends Controller {

  async admin() {
    const { ctx } = this;
    try {
      await ctx.render('admin');
    } catch (e) {
      ctx.logger.error(e);
      ctx.status = 404;
      ctx.body = '页面走丢了，待我们找找';
    }
  }

  async login() {
    const { ctx } = this;
    const { username, password } = ctx.request.body;
    if (username === 'admin' && password === 'erqilingqi') {
      ctx.cookies.set('token', ctx.helper.createToken(0, 0, 0, 3, 30 * 24 * 60 * 60 * 1000), { encrypt: true });
      ctx.body = {
        success: true,
      };
    } else {
      ctx.status = 403;
      ctx.body = {
        error: '丑拒',
      };
    }
  }
}

module.exports = LoginController;
