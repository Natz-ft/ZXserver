'use strict';

class UserConnector {
  constructor(ctx) {
    this.ctx = ctx;
  }

  fetch(id) {
    const { ctx } = this;
    const userService = ctx.service.user;
    return new Promise((resolve, reject) => {
      const user = userService.findById(id);
      if (!user) {
        reject(new Error('error'));
      } else {
        resolve(user);
      }
    });
  }

  fetchAll() {
    const { ctx } = this;
    return ctx.service.user.findAll();
  }

  addOne(name, age) {
    const { ctx } = this;
    return ctx.service.user.createUser(name, age);
  }

  removeOne(id) {
    const { ctx } = this;
    return ctx.service.user.removeUser(id);
  }
}

module.exports = UserConnector;
