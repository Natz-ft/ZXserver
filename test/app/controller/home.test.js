'use strict';

const { app, assert } = require('egg-mock/bootstrap');

xdescribe('test/app/controller/home.test.js', () => {

  it('should assert', async () => {
    const pkg = require('../../../package.json');
    assert(app.config.keys.startsWith(pkg.name));

    // const ctx = app.mockContext({});
    // yield ctx.service.xx();
  });

  it('should GET /', () => {
    return app.httpRequest()
      .get('/')
      .expect('hi egg and webhook!')
      .expect(200);
  });
});
