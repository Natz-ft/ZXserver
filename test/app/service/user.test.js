'use strict';

const { app, assert } = require('egg-mock/bootstrap');

xdescribe('test/app/service/user.test.js', () => {

  it('should find one', async () => {
    const ctx = app.mockContext();
    const user = await ctx.service.user.findById(1);
    assert(user.id === 1);
  });

  it('should find null', async () => {
    const ctx = app.mockContext();
    const user = await ctx.service.user.findById(-1);
    assert(!user);
  });

  it('should find all', async () => {
    const ctx = app.mockContext();
    const users = await ctx.service.user.findAll();
    assert(users.length > 1);
  });
});
