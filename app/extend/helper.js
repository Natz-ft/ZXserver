'use strict';

const jwt = require('jsonwebtoken');

module.exports = {
  /**
   * 获取当前请求的操作人员
   *
   * @param {Object}ctx 上下文
   * @param {number}defaultRole 默认人员
   * @return {Object} 操作人员对象，系统为：{role: 0, id: 0}
   */
  getRole(ctx, defaultRole = 4) {
    let role = {};
    let token = ctx.cookies.get('token', { encrypt: true });
    if (!token) {
      token = ctx.get('token');
    }
    if (token) {
      role = module.exports.verifyToken(ctx, token);
    } else {
      role.role = defaultRole;
      role.id = 0;
      role.type = 0;
    }
    return role;
  },
  /**
   * 生成token
   *
   * @param {number}role 角色
   * @param {number}type 类型
   * @param {number}id 用户id
   * @param {number}source 来源设备
   * @param {number}timeout 有效时间
   * @return {string} token
   */
  createToken(role, type, id, source, timeout = 0) {
    const exp = new Date().getTime() + (timeout === 0 ? this.ctx.app.config.auth.timeout : timeout);
    return jwt.sign({ role, type, id, source, exp }, this.ctx.app.config.auth.secret);
  },
  /**
   * 验证token有效性
   *
   * @param {Object}ctx 上下文
   * @param {string}token token字符串
   * @return {Object} 角色对象
   */
  verifyToken(ctx, token) {
    if (token) {
      return jwt.verify(token, ctx.app.config.auth.secret, (error, decoded) => {
        if (error) {
          ctx.logger.error(error);
          throw error;
        }
        return {
          role: decoded.role,
          type: decoded.type,
          id: decoded.id,
        };
      });
    }
    throw new Error('TOKEN IS UNDEFINED');
  },
  /**
   * 生成11位随机字符串
   *
   * @return {string} 随机字符串
   */
  createNonceStr() {
    return Number(Math.random()
      .toString()
      .substr(3) + Date.now())
      .toString(36)
      .substr(0, 11);
  },
  /**
   * 经纬度计算距离
   *
   * @param {number}lng1 经度1
   * @param {number}lat1 纬度1
   * @param {number}lng2 经度2
   * @param {number}lat2 纬度2
   * @return {number} 距离
   */
  getCoordinateDistance(lng1, lat1, lng2, lat2) {
    const a = lng1 * Math.PI / 180.0 - lng2 * Math.PI / 180.0;
    const radLat1 = lat1 * Math.PI / 180.0;
    const radLat2 = lat2 * Math.PI / 180.0;
    const b = radLat1 - radLat2;
    let s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(b / 2), 2) +
      Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(a / 2), 2)));
    s = s * 6378.137;// EARTH_RADIUS;
    s = Math.round(s * 1000);
    return s;
  },
  /**
   * 字符串加密
   *
   * @param {string}str 加密字符串
   * @param {number}start 开始位置
   * @param {number}end 取字符数
   * @param {string}replacer 替换字符
   * @return {string} 加密后字符串
   */
  omit(str, start, { end = 0, replacer = '*' }) {
    return str.length > start + end ? str.slice(0, start) + replacer + str.slice(str.length - end, str.length) : str;
  },
  /**
   * graphql query模板
   *
   * @param {object}ctx 上下文
   * @param {array}options 操作数组
   * @param {number|null}roleId 鉴定id
   * @return {*} 方法结果
   */
  resolveQuery(ctx, options, roleId = null) {
    const role = module.exports.getRole(ctx);
    if (roleId && role.id !== 0 && role.id !== roleId) {
      ctx.logger.error('无权限', { ip: ctx.request.ip, options: JSON.stringify(options), roleId });
      throw new Error('无权限');
    }
    const option = options.find(option => option.roles.includes(role.role));
    if (option) {
      return option.func(role);
    }
    ctx.logger.error('无权限', { ip: ctx.request.ip, options: JSON.stringify(options), role });
    throw new Error('无权限');
  },
  /**
   * graphql __resolveType方法模板
   *
   * @param {object}ctx 上下文
   * @param {array}options 操作数组
   * @param {boolean}isType 是否由type决定
   * @return {*} 返回类型名
   */
  resolveType(ctx, options, isType = true) {
    const role = module.exports.getRole(ctx);
    const option = options.find(option => option.roles.includes(isType ? role.type : role.role));
    if (option) {
      return option.type;
    }
    ctx.logger.error('系统错误', { options });
    throw new Error('系统错误');
  },
  /**
   * 范围随机整数
   *
   * @param {number}min 最小值
   * @param {number}max 最大值
   * @return {number} 随机值
   */
  randomBetween(min = 0, max = 1) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  /**
   * 抛出错误并log
   *
   * @param {object}ctx 上下文
   * @param {object}error 错误信息
   * @param {object}log 日志数据
   */
  errorLog(ctx, error, log) {
    ctx.logger.error(JSON.stringify(error), log);
    throw new Error(JSON.stringify(error));
  },
};
