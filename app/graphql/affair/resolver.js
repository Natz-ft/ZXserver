'use strict';

const { Role } = require('../../util/constant');

module.exports = {
  Mutation: {
    startAffair(_, { orderRoomId, type, expectTime, content }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.MEMBER ],
          func: role => {
            return ctx.connector.affair.startAAffair(role, orderRoomId, type, expectTime, content);
          },
        },
      ]);
    },
  },
};
