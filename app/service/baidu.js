'use strict';

const Service = require('egg').Service;
const qs = require('querystring');

const IMAGE_STATUS = {
  normal: '识别正常',
  reversed_side: '身份证正反面颠倒',
  non_idcard: '上传的图片中不包含身份证',
  blurred: '身份证模糊',
  other_type_card: '其他类型证照',
  over_exposure: '身份证关键字段反光或过曝',
  over_dark: '身份证欠曝（亮度过低）',
  unknown: '未知状态',
};

const _getAccessToken = async ctx => {
  const { app } = ctx;
  const baiduConfig = app.config.baidu;
  try {
    let accessToken = await app.redis.get('db0').get('accessToken:baidu');
    if (!accessToken) {
      const queryData = qs.stringify({
        grant_type: 'client_credentials',
        client_id: baiduConfig.apiKey,
        client_secret: baiduConfig.secret,
      });
      const result = await ctx.curl(`https://aip.baidubce.com/oauth/2.0/token?${queryData}`, { dataType: 'json' });
      accessToken = result.data.access_token;
      app.redis.get('db0').set('accessToken:baidu', accessToken, 'EX', result.data.expires_in);
    }
    return accessToken;
  } catch (e) {
    ctx.logger.error(e);
    throw e;
  }
};

const _inspectionData = async fn => {
  let data;
  try {
    data = (await fn()).data;
  } catch (e) {
    throw e;
  }
  if (data.error_code) {
    if ([ 1, 2, 18, 111 ].includes(data.error_code)) {
      try {
        data = (await fn()).data;
      } catch (e) {
        throw e;
      }
    } else {
      throw new Error(data.error_msg);
    }
  }
  return data;
};

class BaiduService extends Service {
  async readIdCard(base64) {
    const { ctx } = this;
    let data;
    try {
      data = await _inspectionData(async () => await ctx.curl(`https://aip.baidubce.com/rest/2.0/ocr/v1/idcard?access_token=${await _getAccessToken(ctx)}`, {
        method: 'POST',
        data: {
          detect_direction: 'true',
          id_card_side: 'front',
          image: base64,
        },
        dataType: 'json',
      }));
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (data.image_status !== 'normal') {
      ctx.logger.error(data);
      throw new Error(IMAGE_STATUS[data.image_status]);
    }
    let card;
    try {
      const result = data.words_result;
      card = {
        name: result['姓名'].words,
        idCard: result['公民身份号码'].words,
        gender: result['性别'].words === '男' ? 1 : 2,
        birth: result['出生'].words,
        nation: result['民族'].words,
        address: result['住址'].words,
      };
    } catch (e) {
      ctx.logger.error(data);
      throw new Error('图片识别失败');
    }
    ctx.logger.info(data);
    return card;
  }

  async readLicense(base64) {
    const { ctx } = this;
    let data;
    try {
      data = await _inspectionData(async () => await ctx.curl(`https://aip.baidubce.com/rest/2.0/ocr/v1/business_license?access_token=${await _getAccessToken(ctx)}`, {
        method: 'POST',
        data: {
          image: base64,
          accuracy: 'normal',
        },
        dataType: 'json',
      }));
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (data.words_result_num === 0) {
      ctx.logger.error(data);
      throw new Error('图片未检测到营业执照信息');
    }
    const result = data.words_result;
    return {
      capital: result['注册资本'].words,
      code: result['社会信用代码'].words,
      name: result['单位名称'].words,
      person: result['法人'].words,
      number: result['证件编号'].words,
      form: result['组成形式'].words,
      establishment: result['成立日期'].words,
      address: result['地址'].words,
      type: result['类型'].words,
      validity: result['有效期'].words,
    };
  }

  async imageAudit(base64) {
    const { ctx } = this;
    try {
      const data = await _inspectionData(async () => await ctx.curl(`https://aip.baidubce.com/rest/2.0/solution/v1/face_audit?access_token=${await _getAccessToken(ctx)}`, {
        method: 'POST',
        data: {
          images: base64,
        },
        dataType: 'json',
      }));
      // todo 筛选规则
      return data.result.res_code === 0;
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async commentAudit(content) {
    const { ctx } = this;
    let data;
    try {
      data = await _inspectionData(async () => await ctx.curl(`https://aip.baidubce.com/rest/2.0/antispam/v2/spam?access_token=${await _getAccessToken(ctx)}`, {
        method: 'POST',
        data: {
          content,
        },
        dataType: 'json',
      }));
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (data.result.spam === 1) {
      const hits = data.result.reject.map(r => r.hit.join());
      ctx.logger.error(`输入内容不可包含“${hits.join()}”`, { ip: ctx.request.ip, content, result: data.result });
      throw new Error(`输入内容不可包含“${hits.join()}”`);
    }
    return true;
  }

  async commentTag(content) {
    const { ctx } = this;
    try {
      const queryData = qs.stringify({
        charset: 'UTF-8',
        access_token: await _getAccessToken(ctx),
      });
      const data = await _inspectionData(async () => await ctx.curl(`https://aip.baidubce.com/rpc/2.0/nlp/v2/comment_tag?${queryData}`, {
        method: 'POST',
        contentType: 'json',
        data: {
          text: content,
          type: 1,
        },
        dataType: 'json',
      }));
      // todo 处理tag数据
      return data;
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }
}

module.exports = BaiduService;
