'use strict';

const Subscription = require('egg').Subscription;
const mysqlUtil = require('../util/mysql');
const retryUtil = require('../util/retry');

class SummarySubscription extends Subscription {
  static get schedule() {
    return {
      // 每天零时
      cron: '0 0 0 * * ? ',
      type: 'worker',
      immediate: false,
      disable: true,
    };
  }

  async subscribe() {
    const { ctx } = this;
    const sql = 'insert into DailySummary(Hotel_id, date, money) select id as Hotel_id, ' +
      '(unix_timestamp(cast(sysdate() as date) - interval 1 day) * 1000) as date, (select sum(OrderTransaction.money) ' +
      'from RoomType, `Order`, OrderTransaction where RoomType.Hotel_id = Hotel.id and RoomType.id = `Order`.RoomType_id ' +
      'and OrderTransaction.Order_id = `Order`.id and OrderTransaction.deleteTag = 0 and OrderTransaction.`_TransactionAction_id` = 0 ' +
      'and OrderTransaction.status = 1 and transactionTime >= unix_timestamp(cast(sysdate() as date) - interval 1 day) * 1000 ' +
      'and transactionTime < unix_timestamp(cast(sysdate() as date)) * 1000) - (select sum(OrderTransaction.money) ' +
      'from RoomType, `Order`, OrderTransaction where RoomType.Hotel_id = Hotel.id and RoomType.id = `Order`.RoomType_id ' +
      'and OrderTransaction.Order_id = `Order`.id and OrderTransaction.deleteTag = 0 and OrderTransaction.`_TransactionAction_id` = 1 ' +
      'and OrderTransaction.status = 1 and transactionTime >= unix_timestamp(cast(sysdate() as date) - interval 1 day) * 1000 ' +
      'and transactionTime < unix_timestamp(cast(sysdate() as date)) * 1000) from Hotel where deleteTag = 0';
    retryUtil.retry(3, () =>
      new Promise(async (resolve, reject) => {
        try {
          await mysqlUtil.query(ctx, sql, {});
          ctx.logger.info('每日汇总完毕');
          resolve();
        } catch (e) {
          ctx.logger.error(e);
          reject(e);
        }
      })
    );
  }
}

module.exports = SummarySubscription;
