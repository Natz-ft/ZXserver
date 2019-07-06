'use strict';

const crypto = require('crypto');
const md5 = require('md5');

module.exports = {
  /**
   * 对象query排序拼接
   *
   * @param {Object}data 对象数据
   * @return {string} 排序结果
   */
  sortQueryString: data => {
    const { key, sign, ...newData } = data;
    const array = Object.keys(newData).filter(d => newData[d])
      .map(d => `${d}=${newData[d]}`);
    array.sort();
    if (key) {
      array.push(`key=${data.key}`);
    }
    return array.join('&');
  },
  /**
   * 微信unionId解密
   *
   * @param {string}appId appId
   * @param {string}sessionKey sessionKey
   * @param {string}encryptedData 加密数据
   * @param {string}iv 位移向量
   * @return {*} 解密对象
   */
  decryptData: (appId, sessionKey, encryptedData, iv) => {
    // base64 decode
    const session = Buffer.from(sessionKey, 'base64');
    const encryptedDataBuffer = Buffer.from(encryptedData, 'base64');
    const ivBuffer = Buffer.from(iv, 'base64');

    let decoded;
    try {
      // 解密
      const decipher = crypto.createDecipheriv('aes-128-cbc', session, ivBuffer);
      // 设置自动 padding 为 true，删除填充补位
      decipher.setAutoPadding(true);
      decoded = decipher.update(encryptedDataBuffer, 'binary', 'utf8');
      decoded += decipher.final('utf8');

      decoded = JSON.parse(decoded);

    } catch (err) {
      throw new Error('Illegal Buffer');
    }

    if (decoded.watermark.appid !== appId) {
      throw new Error('Illegal Buffer');
    }

    return decoded;
  },
  /**
   * 解密退款通知加密数据
   *
   * @param {string}key 密钥
   * @param {string}data 加密数据
   * @return {*} 解密对象
   */
  refundDecrypt: (key, data) => {
    const clearEncoding = 'utf8';
    const cipherEncoding = 'base64';
    const cipherChunks = [];
    const decipher = crypto.createDecipheriv('aes-256-ecb', md5(key), '');
    decipher.setAutoPadding(true);
    cipherChunks.push(decipher.update(data, cipherEncoding, clearEncoding));
    cipherChunks.push(decipher.final(clearEncoding));
    return cipherChunks.join('');
  },
};
