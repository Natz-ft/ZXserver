'use strict';

const apolloServerKoa = require('apollo-server-koa');
const { Role } = require('../../util/constant');

module.exports = {
  Upload: apolloServerKoa.GraphQLUpload,
  Mutation: {
    singleUpload(_, { file }, ctx) {
      return ctx.helper.resolveQuery(ctx, [
        {
          roles: [ Role.MEMBER ],
          func: () => {
            console.log(ctx);
            console.log(file);
            return ctx.connector.file.uploadFile(file);
          },
        },
      ]);
    },
  },
};
