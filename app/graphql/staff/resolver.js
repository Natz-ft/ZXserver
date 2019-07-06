'use strict';

const { Role } = require('../../util/constant');

module.exports = {
  Staff: {
    hotelId({ Hotel_id }) {
      return Hotel_id;
    },
    hotel({ Hotel_id }, _, ctx) {
      if (Hotel_id === 0) {
        return null;
      }
      return ctx.connector.hotel.getHotelById(Hotel_id);
    },
  },
  Mutation: {
    webLogin(_, { username, password, source }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.HOTEL_STAFF, Role.VISITOR ],
          func: () => {
            return ctx.connector.staff.loginWithPassword(username, password, source);
          },
        },
      ]);
    },
  },
};
