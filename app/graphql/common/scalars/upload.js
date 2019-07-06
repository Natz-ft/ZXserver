'use strict';

const graphql = require('graphql');

module.exports = new graphql.GraphQLScalarType({
  name: 'Upload',
  description: 'The `Upload` scalar type represents a file upload.',
  parseValue: value => value,

  parseLiteral() {
    throw new Error('‘Upload’ scalar literal unsupported.');
  },

  serialize() {
    throw new Error('‘Upload’ scalar serialization unsupported.');
  },
});
