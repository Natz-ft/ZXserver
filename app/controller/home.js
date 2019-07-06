'use strict';

const Controller = require('egg').Controller;
// const dayjs = require('dayjs');
// const customParseFormat = require('dayjs/plugin/customParseFormat');
// const mysqlUtil = require('../util/mysql');

class HomeController extends Controller {
  async index() {
    const { ctx } = this;
    try {
      await ctx.render('index');
    } catch (e) {
      ctx.logger.error(e);
      ctx.status = 404;
      ctx.body = '页面走丢了，待我们找找';
    }
  }

  async test() {
    const { ctx } = this;
    try {
      // await ctx.service.io.emitSweeper(1, 'hhh');
      // await ctx.service.io.emitHotel(1, 'order.order', { order: await ctx.service.order.queryOrderDetailById(1) });
      // dayjs.extend(customParseFormat);
      // await mysqlUtil.beginTransactionScope(ctx, async conn => {
      //   for (const member of members) {
      //     const id = await mysqlUtil.connInsert(ctx, 'Member', {
      //       nickname: member.wechatName,
      //       avatar: member.avatar,
      //       gender: member.gender === '0' ? 1 : member.gender === '1' ? 2 : 0,
      //       createdTime: dayjs(member.createdTime, 'D/M/YYYY HH:mm:ss').valueOf(),
      //     }, conn);
      //     await mysqlUtil.connInsert(ctx, 'Oauth', {
      //       Member_id: id,
      //       platform: 0,
      //       openId: member.openId,
      //       createdTime: dayjs(member.createdTime, 'D/M/YYYY HH:mm:ss').valueOf(),
      //     }, conn);
      //     if (member.realName.length > 0) {
      //       const location = await ctx.service.amap.geoAddress(member.address);
      //       console.log(location);
      //       await mysqlUtil.connInsert(ctx, 'CheckInMan', {
      //         Member_id: id,
      //         isSelf: 1,
      //         name: mysqlUtil.aesEncrypt(ctx, member.realName),
      //         idCard: mysqlUtil.aesEncrypt(ctx, member.idCard),
      //         gender: member.gender === '0' ? 1 : member.gender === '1' ? 2 : 0,
      //         birth: member.idCard.substr(6, 8),
      //         nation: member.nation,
      //         address: member.address,
      //         province: location.province,
      //         city: typeof location.city === 'string' ? location.city : '',
      //         createdTime: dayjs(member.createdTime, 'D/M/YYYY HH:mm:ss').valueOf(),
      //       }, conn);
      //       const checkInMen = follwers.filter(follwer => follwer.Member$id === member.id && follwer.name !== member.realName);
      //       for (const checkInMan of checkInMen) {
      //         const location = await ctx.service.amap.geoAddress(checkInMan.address);
      //         console.log(location);
      //         await mysqlUtil.connInsert(ctx, 'CheckInMan', {
      //           Member_id: id,
      //           isSelf: 0,
      //           name: mysqlUtil.aesEncrypt(ctx, checkInMan.name),
      //           idCard: mysqlUtil.aesEncrypt(ctx, checkInMan.idCard),
      //           gender: checkInMan.gender === '0' ? 1 : checkInMan.gender === '1' ? 2 : 0,
      //           birth: checkInMan.idCard.substr(6, 8),
      //           nation: checkInMan.nation,
      //           address: checkInMan.address,
      //           province: location.province,
      //           city: typeof location.city === 'string' ? location.city : '',
      //           createdTime: dayjs(member.createdTime, 'D/M/YYYY HH:mm:ss').valueOf(),
      //         }, conn);
      //       }
      //     }
      //   }
      // });
      ctx.body = 'success';
    } catch (e) {
      ctx.logger.error(e);
      ctx.status = 404;
      ctx.body = '页面走丢了，待我们找找';
    }
  }
}

module.exports = HomeController;
