'use strict';

const { app, assert } = require('egg-mock/bootstrap');

xdescribe('test/app/extend/helper.test.js', () => {
  it('should get system role', () => {
    const ctx = app.mockContext();
    const role = ctx.helper.getRole(ctx);
    assert(role.role === 0);
    assert(role.id === 0);
  });

  it('should get correct token', () => {
    const ctx = app.mockContext();
    const token = ctx.helper.createToken(1, 0, 2, 0);
    const role = ctx.helper.verifyToken(ctx, token);
    assert(role.role === 1);
    assert(role.id === 2);
  });

  it('should verify success', function() {
    const ctx = app.mockContext();
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoxLCJpZCI6MiwiZXhwIjo0MTAxNjEwNjA4LCJpYXQiOjE1NDU0NjY2NTZ9.ED58xpt8LBK-RSVmg9Sr_b1rzTMZeRCXoWtoxsDwNMk';
    const errorToken = 'token';
    const timeOutToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoxLCJpZCI6MiwiZXhwIjoxNTQ1NDY2NjA4LCJpYXQiOjE1NDU0NjY5MDd9.bfoSG1frj2IZ8cBA-iRmZ9VhMD5HfHAx4HhxnhJObck';
    const role = ctx.helper.verifyToken(ctx, token);
    assert(role.role === 1);
    assert(role.id === 2);
    try {
      ctx.helper.verifyToken(ctx, errorToken);
    } catch (e) {
      assert(e.message === 'jwt malformed');
    }
    try {
      ctx.helper.verifyToken(ctx, timeOutToken);
    } catch (e) {
      assert(e.message === 'jwt expired');
    }
  });
});
