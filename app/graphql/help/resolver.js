'use strict';

const { Role } = require('../../util/constant');

module.exports = {
  Query: {
    helps(_, { page, size }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.MEMBER, Role.SYSTEM_STAFF, Role.VISITOR ],
          func: () => {
            return ctx.connector.help.getHelp(page, size);
          },
        },
      ]);
    },
    helpDetail(_, { id }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM, Role.MEMBER, Role.SYSTEM_STAFF, Role.VISITOR ],
          func: () => {
            return ctx.connector.help.getHelpDetailById(id);
          },
        },
      ]);
    },
  },
  Mutation: {
    addHelp(_, { index, question, answer }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM_STAFF ],
          func: () => {
            return ctx.connector.help.addAHelp(index, question, answer);
          },
        },
      ]);
    },
    updateHelp(_, { id, index, question, answer }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.SYSTEM_STAFF ],
          func: () => {
            return ctx.connector.help.renewHelp(id, index, question, answer);
          },
        },
      ]);
    },
  },
};
