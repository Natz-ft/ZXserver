'use strict';

// had enabled by egg
// exports.static = true;

exports.cors = {
  enable: true,
  package: 'egg-cors',
};

exports.mysql = {
  enable: true,
  package: 'egg-mysql',
};

exports.graphql = {
  enable: true,
  package: 'egg-graphql',
};

exports.redis = {
  enable: true,
  package: 'egg-redis',
};

exports.alinode = {
  enable: true,
  package: 'egg-alinode',
};

exports.ejs = {
  enable: true,
  package: 'egg-view-ejs',
};

exports.io = {
  enable: true,
  package: 'egg-socket.io',
};

exports.oss = {
  enable: true,
  package: 'egg-oss',
};
