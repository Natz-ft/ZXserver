'use strict';

const { Role, StaffType } = require('../../util/constant');

const _sockets = {
  '/sweeper': [{ role: Role.HOTEL_STAFF, type: [ StaffType.SWEEPER ] }],
  '/hotel': [{ role: Role.HOTEL_STAFF, type: [ StaffType.ADMIN, StaffType.BACK ] }],
};

module.exports = () => {
  return async (ctx, next) => {
    const io = ctx.app.io;
    const token = ctx.socket.handshake.query.token;
    const id = ctx.socket.id;
    const nsp = ctx.socket.nsp.name;
    const _reject = message => {
      io.of(nsp).emit('reject', message);
      io.of(nsp).adapter.remoteDisconnect(id, true, error => {
        ctx.logger.error(error);
      });
    };
    if (token) {
      let role;
      try {
        role = ctx.helper.verifyToken(ctx, token);
      } catch (e) {
        _reject('token错误');
      }
      if (_sockets[nsp]) {
        if (_sockets[nsp].some(s => s.role === role.role && (s.type.includes(-1) || s.type.includes(role.type)))) {
          ctx.socket.handshake.query.role = role;
          await next();
        } else {
          _reject('无权进入房间');
        }
      } else {
        _reject('未知socket房间');
      }
    } else {
      _reject('匿名账户拦截');
    }
  };
};
