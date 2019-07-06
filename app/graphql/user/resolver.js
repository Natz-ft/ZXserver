'use strict';

const { Role } = require('../../util/constant');

module.exports = {
  User: {
    __resolveType(_, ctx) {
      return ctx.helper.resolveType(ctx, [
        {
          roles: [ Role.SYSTEM ],
          type: 'UserAge',
        },
        {
          roles: [ Role.VISITOR ],
          type: 'Username',
        },
      ], false);
    },
  },
  Query: {
    user(_, { id }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.VISITOR ],
          func: () => {
            return ctx.connector.user.fetch(id);
          },
        },
      ]);
    },
    async users(_, __, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.VISITOR ],
          func: () => {
            return ctx.connector.user.fetchAll();
          },
        },
      ]);
    },
  },
  Mutation: {
    addUser(_, { name, age }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM ],
          func: () => {
            return ctx.connector.user.addOne(name, age);
          },
        },
      ]);
    },
    removeUser(_, { id }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM ],
          func: () => {
            return ctx.connector.user.removeOne(id);
          },
        },
      ]);
    },
  },
};
