'use strict';

const Controller = require('egg').Controller;

class TaiwinController extends Controller {
  async login() {
    console.log(this.ctx);
  }
}

module.exports = TaiwinController;
