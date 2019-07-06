'use strict';

const { Role, StaffType } = require('../../util/constant');

module.exports = () => {
  return async (ctx, next) => {
    ctx.socket.emit('sweep', 'connected!');
    try {
      const role = ctx.socket.handshake.query.role;
      if (role.role === Role.HOTEL_STAFF) {
        const staff = await ctx.service.staff.queryStaffById(role.id);
        ctx.socket.join(`${role.type === StaffType.SWEEPER ? 'sweeper' : 'hotel'}:${staff.Hotel_id}`);
        await next();
        ctx.socket.leave(`${role.type === StaffType.SWEEPER ? 'sweeper' : 'hotel'}:${staff.Hotel_id}`);
      }
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  };
};
