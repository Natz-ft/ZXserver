'use strict';

const { Role } = require('../util/constant');

const _restfuls = {
  '/graphql': [ Role.SYSTEM, Role.MEMBER, Role.SYSTEM_STAFF, Role.HOTEL_STAFF, Role.VISITOR ],
  '/': [ Role.SYSTEM, Role.MEMBER, Role.SYSTEM_STAFF, Role.HOTEL_STAFF, Role.VISITOR ],
  // todo 删除测试权限
  '/file': [ Role.SYSTEM, Role.MEMBER, Role.SYSTEM_STAFF, Role.HOTEL_STAFF, Role.VISITOR ],
  '/wechat/payActionUnified': [ Role.VISITOR ],
  '/wechat/payActionRefund': [ Role.VISITOR ],
  '/admin': [ Role.SYSTEM, Role.VISITOR ],
  '/login': [ Role.SYSTEM, Role.VISITOR ],
};

const _getGQLFunction = query => {
  const matches = query.replace(/[\n\r]/g, '')
    .match(/((?:query)|(?:mutation)(?=\W?)).*?{(.*?)[{}]/);
  return {
    action: matches[1].trim(),
    func: matches[2].split('(')[0].trim(),
  };
};

module.exports = () => {
  return async function authMiddleware(ctx, next) {
    if (ctx.request.method === 'GET') {
      try {
        await next();
        return;
      } catch (e) {
        ctx.logger.error(e);
        ctx.status = 400;
        ctx.body = {
          error: '未知错误',
        };
      }
    }
    const url = ctx.request.url.replace('?', '');
    const role = ctx.helper.getRole(ctx).role;
    if (url === '/graphql') {
      if (ctx.request.body.query) {
        const { func } = _getGQLFunction(ctx.request.body.query);
        if (func !== '__schema' || role === Role.SYSTEM) {
          try {
            await next();
          } catch (e) {
            ctx.logger.error(e);
            ctx.status = 400;
            ctx.body = {
              errors: [
                {
                  message: '未知错误',
                },
              ],
              data: null,
            };
          }
        } else {
          ctx.logger.error('越权操作！', ctx.request);
          ctx.status = 403;
          ctx.body = {
            error: '权限不符，已记录ip',
          };
        }
      } else {
        ctx.status = 403;
        ctx.body = {
          error: '请求错误',
        };
      }
    } else {
      if (_restfuls[url].includes(role)) {
        await next();
      } else {
        ctx.status = 403;
        ctx.body = {
          error: '权限错误',
        };
      }
    }
  };
};
