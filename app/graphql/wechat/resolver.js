'use strict';

const { Role } = require('../../util/constant');

module.exports = {
  Query: {
    openId(_, { code }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.MEMBER, Role.VISITOR ],
          func: () => {
            return ctx.connector.wechat.getOpenId(code);
          },
        },
      ]);
    },
  },
  Mutation: {
    async login(_, { cryptoData, userInfo }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.MEMBER, Role.VISITOR ],
          func: async () => {
            return ctx.connector.wechat.loginIn(cryptoData, userInfo);
          },
        },
      ]);
    },
    bind(_, { cryptoData, memberId }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.MEMBER ],
          func: () => {
            return ctx.connector.wechat.bindOauth(cryptoData, memberId);
          },
        },
      ]);
    },
    unifiedOrder(_, { openId, orderId }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.MEMBER, Role.VISITOR ],
          func: () => {
            return ctx.connector.wechat.payUnifiedOrder(openId, orderId);
          },
        },
      ]);
    },
  },
};
