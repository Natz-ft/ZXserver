'use strict';

const { Role } = require('../../util/constant');

module.exports = {
  Mutation: {
    sendSms(_, { phone }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.MEMBER, Role.SYSTEM_STAFF, Role.HOTEL_STAFF, Role.VISITOR ],
          func: () => {
            return ctx.connector.sms.sendMessageAndSave(phone);
          },
        },
      ]);
    },
  },
};
