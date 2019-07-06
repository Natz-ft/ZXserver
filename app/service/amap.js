'use strict';

const Service = require('egg').Service;
const qs = require('querystring');

class AmapService extends Service {
  async geoAddress(address) {
    const { ctx, app } = this;
    const amapConfig = app.config.amap;
    const queryData = qs.stringify({
      address,
      key: amapConfig.key,
    });
    try {
      const result = await ctx.curl(`https://restapi.amap.com/v3/geocode/geo?${queryData}`, { dataType: 'json' });
      const [ data ] = result.data.geocodes;
      // const location = data.location.split(',');
      return {
        province: data ? data.province : '',
        city: data ? data.city : '',
        // longitude: parseFloat(location[0]),
        // latitude: parseFloat(location[1]),
      };
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }
}

module.exports = AmapService;
