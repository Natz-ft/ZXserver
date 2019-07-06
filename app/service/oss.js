'use strict';

const Controller = require('egg').Controller;
const fs = require('fs');

class OssController extends Controller {
  async uploadFile(name, filepath) {
    const { ctx, app } = this;
    const urlConfig = app.config.url;
    let result;
    try {
      result = await ctx.oss.put(name, filepath);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    return urlConfig.PATH + result.url.split('oss-cn-beijing.aliyuncs.com')[1];
  }

  uploadDist(src, dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const _src = `${src}/${file}`;
      const _dir = `${dir}/${file}`;
      const st = fs.statSync(_src);
      if (st.isFile() && file !== '.DS_Store') {
        console.log(_src);
      } else if (st.isDirectory()) {
        this.uploadDist(_src, _dir);
      }
    });
  }

  async getOssToken(role) {
    const { ctx, app } = this;
    const ossConfig = app.config.oss;
    try {
      const token = await ctx.oss.get('sts').assumeRole(ossConfig.clients.sts.roleArn, null, ossConfig.clients.sts.timeout, role);
      console.log(token);
      return {
        accessKeyId: token.credentials.AccessKeyId,
        accessKeySecret: token.credentials.AccessKeySecret,
        bucket: ossConfig.clients.oss.bucket,
        region: ossConfig.clients.oss.endpoint,
        stsToken: token.credentials.SecurityToken,
        expiration: new Date().getTime() + ossConfig.clients.sts.timeout * 1000,
      };
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }
}

module.exports = OssController;
