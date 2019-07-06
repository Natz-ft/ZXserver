'use strict';

const Subscription = require('egg').Subscription;

class OrderSubscription extends Subscription {
  static get schedule() {
    return {
      // 半小时
      cron: '0 0,30 * * * ? ',
      type: 'worker',
      immediate: true,
      disable: true,
    };
  }

  async subscribe() {
    const { ctx, app } = this;
    try {
      await Promise.all([
        OrderSubscription.redisExpire(ctx, app, 'transaction:order'),
        OrderSubscription.redisExpire(ctx, app, 'transaction:stay'),
        OrderSubscription.redisExpire(ctx, app, 'start:order'),
        OrderSubscription.redisExpire(ctx, app, 'expire:order'),
      ]);
    } catch (e) {
      ctx.logger.error(e);
    }
  }

  static async redisExpire(ctx, app, name) {
    return new Promise(async (resolve, reject) => {
      try {
        const data = await app.redis.get('db14').zrangebyscore(name, 0, new Date().getTime());
        for (const d of data) {
          await Promise.all([
            app.redis.get('db15').set(`${name}:${parseInt(d)}:1`, 'expire', 'EX', 10),
            app.redis.get('db14').zincrby(name, 10 * 1000, parseInt(d)),
          ]);
        }
        resolve();
      } catch (e) {
        ctx.logger.error(e);
        reject();
      }
    });
  }
}

module.exports = OrderSubscription;
