'use strict';

const Service = require('egg').Service;
const net = require('net');
const md5 = require('md5');
const { StoragePath } = require('../util/constant');

class TaiwinService extends Service {

  async socket() {
    const { ctx } = this;
    const server = net.createServer(c => {
      const buffer = [];
      c.on('data', chunk => {
        buffer.push(chunk);
      });
      c.on('end', async () => {
        const data = JSON.parse(Buffer.concat(buffer).toString());
        try {
          const checkInMen = await ctx.service.member.queryCheckInManByIdCard(data.idnumber1.trim());
          if (checkInMen.length > 0) {
            let picUrl;
            if (checkInMen.every(checkInMan => checkInMan.pic === null)) {
              const filename = md5('pic' + ctx.helper.createNonceStr()) +
                '.png'
                  .toLocaleLowerCase();
              picUrl = await ctx.service.oss.uploadFile(StoragePath.CHECK_IN_PIC + filename, Buffer.from(data.pic.trim(), 'base64'));
            } else {
              picUrl = checkInMen.find(checkInMan => checkInMan.pic !== null).pic;
            }
            const filename = md5('realTimePic' + ctx.helper.createNonceStr()) +
              '.png'
                .toLocaleLowerCase();
            const url = await ctx.service.oss.uploadFile(StoragePath.CHECK_IN_REAL_TIME_PIC + filename, Buffer.from(data.realtimePic.trim(), 'base64'));
            const roomCheckInMen = await ctx.service.order.queryRoomCheckInManByCheckInManIdsAndVerifyTime(checkInMen.map(checkInMan => checkInMan.id), data.time);
            if (roomCheckInMen.length > 0) {
              await ctx.service.order.verifyRoomCheckInMan(roomCheckInMen.map(roomCheckInMan => roomCheckInMan.id), data.time);
            }
            const checkInManIds = checkInMen.filter(checkInMan => (checkInMan.isSelf || checkInMan.id === (roomCheckInMen.length > 0 ? roomCheckInMen[0].CheckInMan_id : -1)))
              .map(checkInMan => checkInMan.id);
            await ctx.service.member.updateCheckInMan(checkInManIds, data, picUrl, url);
          }
        } catch (e) {
          ctx.logger.error(e);
          throw e;
        }
      });
      c.on('error', e => {
        ctx.logger.error(e);
        throw e;
      });
    });
    server.on('error', e => {
      ctx.logger.error(e);
      throw e;
    });
    server.listen(2001, () => {
      console.log('server bound');
    });
  }
}

module.exports = TaiwinService;
