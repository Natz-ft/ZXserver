'use strict';

const crypto = require('crypto');

const CLEAR_ENCODING = 'utf8';
const CIPHER_ENCODING = 'hex';
const AES_ENCODING = 'aes-128-cbc';

/**
 * 预处理参数
 *
 * @param {object}fields 参数
 * @return {object} 处理结果
 * @private
 */
const _pretreatFields = fields => {
  const options = { ...fields };
  if (!options.deleteTag) {
    options.deleteTag = 0;
  }
  return options;
};

/**
 * select预处理参数
 *
 * @param {object}fields 参数
 * @return {object} 处理结果
 * @private
 */
const _pretreatWhereFields = fields => {
  const options = { ...fields };
  if (!options.where) {
    options.where = {
      deleteTag: 0,
    };
  } else if (!options.where.deleteTag) {
    options.where.deleteTag = 0;
  }
  return options;
};

/**
 * 判断是否可以query
 *
 * @param {string}sql sql语句
 * @return {Promise<boolean>} 允许与否
 * @private
 */
const _couldQuery = sql => {
  const action = sql.split(' ')[0].toUpperCase();
  const sqlStr = sql.replace(/,\s/g, ',')
    .replace(/\s*=\s*/g, '=');
  const sqlStrs = sqlStr.split(' ');
  const canInsert = action === 'INSERT' && !sqlStrs[2].startsWith('_');
  const canUpdate = action === 'UPDATE' &&
    ((sqlStrs[1].split(',').length === 1 && !sqlStrs[1].startsWith('_')) ||
      (sqlStrs[1].split(',').length > 1 && sqlStrs[3].split(',')
        .every(str => !str.startsWith('_'))));
  return canInsert || canUpdate;
};

module.exports = {
  /**
   * mysql get 方法
   * 取单条数据
   *
   * @param {object}ctx 上下文
   * @param {string}table 表名
   * @param {object}fields 参数
   * @return {Promise<*>} 查询内容对象
   */
  async get(ctx, table, fields) {
    const options = _pretreatFields(fields);
    try {
      return await ctx.app.mysql.get(table, options);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  },
  /**
   * mysql select方法
   * 取多条数据
   *
   * @param {object}ctx 上下文
   * @param {string}table 表名
   * @param {object}fields 参数
   * @return {Promise<*>} 查询内容数组
   */
  async select(ctx, table, fields) {
    const options = _pretreatWhereFields(fields);
    try {
      return await ctx.app.mysql.select(table, options);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  },
  /**
   * mysql insert方法
   * 插入单条数据
   *
   * @param {object}ctx 上下文
   * @param {string}table 表名
   * @param {object}fields 参数
   * @return {Promise<number>} 插入id
   */
  async insert(ctx, table, fields) {
    if (!table.startsWith('_')) {
      const role = ctx.helper.getRole(ctx);
      let result;
      try {
        result = await ctx.app.mysql.insert(table, fields);
      } catch (e) {
        ctx.logger.error(e);
        throw e;
      }
      if (result.affectedRows === (fields.length ? fields.length : 1)) {
        try {
          await ctx.app.mysql.insert('_Log', {
            _LogAction_id: 0,
            _RoleType_id: role.role,
            roleId: role.id,
            table,
            before: null,
            after: JSON.stringify(await ctx.app.mysql.get(table, { id: result.insertId })),
            createdTime: new Date().getTime(),
          });
        } catch (e) {
          ctx.logger.error(e);
          throw e;
        }
        return result.insertId;
      }
      ctx.logger.error('插入数据错误', { table, fields });
      throw new Error('插入数据错误');
    } else {
      ctx.logger.error('禁止改动此表', { table, fields });
      throw new Error('禁止改动此表');
    }
  },
  /**
   * mysql update方法
   * 数据更新
   *
   * @param {object}ctx 上下文
   * @param {string}table 表名
   * @param {object}rows 更新的字段对象，不包含条件，例：{name: "hh", age: 10}
   * @param {object}fields 更新的设置，不包含columns属性
   * @param {boolean}isDelete 是否删除
   * @return {Promise<boolean>} 更新成功与否
   */
  async update(ctx, table, rows, fields, isDelete = false) {
    if (!table.startsWith('_')) {
      let options = { ...fields };
      if (!isDelete) {
        options = _pretreatWhereFields(fields);
      }
      const role = ctx.helper.getRole(ctx);
      const columns = Object.keys(rows);
      columns.unshift('id');
      try {
        const before = await ctx.app.mysql.select(table, {
          ...options,
          columns,
        });
        const log = await ctx.app.mysql.insert('_Log', {
          _LogAction_id: 1,
          _RoleType_id: role.role,
          roleId: role.id,
          table,
          before: JSON.stringify(before.length === 1 ? before[0] : before),
          after: null,
          createdTime: new Date().getTime(),
        });
        const result = await ctx.app.mysql.update(table, rows, options);
        if (result.affectedRows === before.length) {
          const after = await ctx.app.mysql.select(table, {
            ...options,
            columns,
          });
          await ctx.app.mysql.update('_Log', {
            id: log.insertId,
            after: JSON.stringify(after.length === 1 ? after[0] : after),
          });
          return true;
        }
      } catch (e) {
        ctx.logger.error(e);
        throw e;
      }
      ctx.logger.error('更新数据错误', { table, rows, fields });
      throw new Error('更新数据错误');
    } else {
      ctx.logger.error('禁止改动此表', { table, rows, fields });
      throw new Error('禁止改动此表');
    }
  },
  /**
   * mysql count方法
   * 检索数量
   *
   * @param {object}ctx 上下文
   * @param {string}table 表名
   * @param {object}fields 参数
   * @return {Promise<*|number>} 列的数量
   */
  async count(ctx, table, fields) {
    const options = _pretreatFields(fields);
    try {
      return await ctx.app.mysql.count(table, options);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  },
  /**
   * mysql query方法
   * 执行sql命令
   *
   * @param {object}ctx 上下文
   * @param {string}sql sql语句，所有变量以“:”标志，例：'SELECT * FROM your_table WHERE id=:id'
   * @param {object}fields 参数，应为对象，对应sql语句中的变量，例：'{ id: 123 }'
   * @return {Promise<*>} 返回值以期望为准
   */
  async query(ctx, sql, fields) {
    const action = sql.split(' ')[0].toUpperCase();
    if (action === 'SELECT') {
      try {
        return await ctx.app.mysql.query(sql, fields);
      } catch (e) {
        ctx.logger.error(e);
        throw e;
      }
    }
    if (_couldQuery(sql)) {
      try {
        const role = ctx.helper.getRole(ctx);
        await ctx.app.mysql.query(sql, fields);
        await ctx.app.mysql.insert('_Log', {
          _LogAction_id: action === 'INSERT' ? 0 : 1,
          _RoleType_id: role.role,
          roleId: role.id,
          table: null,
          before: sql,
          after: JSON.stringify(fields),
          createdTime: new Date().getTime(),
        });
        return true;
      } catch (e) {
        ctx.logger.error(e);
        throw e;
      }
    }
    ctx.logger.error('禁止改动此表', { sql, fields });
    throw new Error('禁止改动此表');
  },
  /**
   * mysql beginTransactionScope方法
   * 自动事务
   *
   * @param {object}ctx 上下文
   * @param {function}transaction 事务内方法，所有mysql语句必须用connXxxx执行
   * @return {Promise<boolean>} 事务成功与否
   */
  async beginTransactionScope(ctx, transaction) {
    try {
      return await ctx.app.mysql.beginTransactionScope(async conn => {
        return await transaction(conn);
      }, ctx);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  },
  /**
   * mysql insert方法
   * 插入数据
   *
   * @param {object}ctx 上下文
   * @param {string}table 表名
   * @param {object}fields 参数
   * @param {object}conn 事务对象
   * @return {Promise<number>} 插入id
   */
  async connInsert(ctx, table, fields, conn) {
    if (!table.startsWith('_')) {
      const role = ctx.helper.getRole(ctx);
      try {
        const result = await conn.insert(table, fields);
        await ctx.app.mysql.insert('_Log', {
          _LogAction_id: 0,
          _RoleType_id: role.role,
          roleId: role.id,
          table,
          before: null,
          after: JSON.stringify(fields.id ? fields : { ...fields, id: result.insertId }),
          createdTime: new Date().getTime(),
        });
        return result.insertId;
      } catch (e) {
        ctx.logger.error(e);
        throw e;
      }
    }
    ctx.logger.error('禁止改动此表', { table, fields });
    throw new Error('禁止改动此表');
  },
  /**
   * mysql update方法
   * 数据更新
   *
   * @param {object}ctx 上下文
   * @param {string}table 表名
   * @param {object}rows 更新的字段对象，不包含条件，例：{name: "hh", age: 10}
   * @param {object}fields 更新的设置，不包含columns属性
   * @param {object}conn 事务对象
   * @param {boolean}isDelete 是否删除
   * @return {Promise<boolean>} 更新成功与否
   */
  async connUpdate(ctx, table, rows, fields, conn, isDelete = false) {
    if (!table.startsWith('_')) {
      let options = { ...fields };
      if (!isDelete) {
        options = _pretreatWhereFields(fields);
      }
      const role = ctx.helper.getRole(ctx);
      const columns = Object.keys(rows);
      columns.unshift('id');
      try {
        const before = await ctx.app.mysql.select(table, {
          ...options,
          columns,
        });
        const log = await ctx.app.mysql.insert('_Log', {
          _LogAction_id: 1,
          _RoleType_id: role.role,
          roleId: role.id,
          table,
          before: JSON.stringify(before.length === 1 ? before[0] : before),
          after: null,
          createdTime: new Date().getTime(),
        });
        await conn.update(table, rows, options);
        await ctx.app.mysql.update('_Log', {
          id: log.insertId,
          after: JSON.stringify({ rows, options }),
        });
        return true;
      } catch (e) {
        ctx.logger.error(e);
        throw e;
      }
    }
    ctx.logger.error('禁止改动此表', { table, rows, fields });
    throw new Error('禁止改动此表');
  },
  /**
   * dataLoader合并查询
   *
   * @param {object}ctx 上下文
   * @param {string}table 表名
   * @param {array}ids id数组
   * @return {Promise<*>} 返回数据
   */
  async unionSelect(ctx, table, ids) {
    if (ids && Array.isArray(ids) && ids.length > 0) {
      let sql = '';
      ids.forEach((id, index) => {
        if (index === 0) {
          sql += `select * from ${table} where id = ${id}`;
        } else {
          sql += ` union all select * from ${table} where id = ${id}`;
        }
      });
      try {
        return await ctx.app.mysql.query(sql);
      } catch (e) {
        ctx.logger.error(e);
        throw e;
      }
    }
    ctx.logger.error('暂仅支持非空id数组的查询', { table, ids });
    throw '暂仅支持非空id数组的查询';
  },
  /**
   * 返回酒店距离sql语句
   *
   * @param {number}longitude 经度
   * @param {number}latitude 纬度
   * @return {string} 酒店距离sql语句
   */
  hotelDistanceSql(longitude, latitude) {
    return `ROUND(
        6378.137 * 2 * ASIN(
            SQRT(
                POW(
                    SIN(
                        (
                            ${longitude} * PI() / 180 - Hotel.latitude * PI() / 180
                        ) / 2
                    ),
                    2
                ) + COS(${longitude} * PI() / 180) * COS(latitude * PI() / 180) * POW(
                    SIN(
                        (
                            ${latitude} * PI() / 180 - longitude * PI() / 180
                        ) / 2
                    ),
                    2
                )
            )
        ) * 1000
    ) AS distance`;
  },
  /**
   * aes加密
   *
   * @param {object}ctx 上下文对象
   * @param {string}data 加密数据
   * @return {string} 加密后数据
   */
  aesEncrypt(ctx, data) {
    const { key, iv } = ctx.app.config.aes;
    const cipher = crypto.createCipheriv(AES_ENCODING, key, iv);
    let cipherChunks = cipher.update(data, CLEAR_ENCODING, CIPHER_ENCODING);
    cipherChunks += cipher.final(CIPHER_ENCODING);
    return cipherChunks;
  },
  /**
   * aes解密
   *
   * @param {object}ctx 上下文对象
   * @param {string}data 解密数据
   * @return {string} 解密后数据
   */
  aesDecrypt(ctx, data) {
    const { key, iv } = ctx.app.config.aes;
    const cipher = crypto.createDecipheriv(AES_ENCODING, key, iv);
    let cipherChunks = cipher.update(data, CIPHER_ENCODING, CLEAR_ENCODING);
    cipherChunks += cipher.final(CLEAR_ENCODING);
    return cipherChunks;
  },
};
