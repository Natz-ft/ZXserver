'use strict';

/**
 * @param {object} app - egg application
 */
module.exports = app => {
  const { router, controller, middleware, io } = app;
  router.get('/', controller.home.index);
  router.get('/test', controller.home.test);
  router.post('/file', controller.file.upload);
  router.post('/wechat/payActionUnified', middleware.xmlParser(), controller.wechat.payActionUnified);
  router.post('/wechat/payActionRefund', middleware.xmlParser(), controller.wechat.payActionRefund);
  router.post('/taiwin', controller.taiwin.login);
  router.get('/admin', controller.login.admin);
  router.post('/login', controller.login.login);
  io.of('/').route('/', io.controller.default.sweep);
  io.of('/sweeper').route('sweep', io.controller.sweeper.sweep);
  io.of('/hotel').route('order', io.controller.hotel.index);
};
