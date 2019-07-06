'use strict';

const { app } = require('egg-mock/bootstrap');

xdescribe('test/app/middleware/robot.test.js', () => {
  it('should pass', () => {
    return app.httpRequest()
      .get('/')
      .set('user-agent', 'Baidu')
      .expect('hi egg and webhook!')
      .expect(200);
  });

  it('should refuse', () => {
    return app.httpRequest()
      .get('/')
      .set('user-agent', 'Baiduspider')
      .expect('Go away, robot.')
      .expect(403);
  });
});
