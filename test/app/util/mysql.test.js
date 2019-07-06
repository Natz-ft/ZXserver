'use strict';

const { app, assert } = require('egg-mock/bootstrap');
const mysqlUtil = require('../../../app/util/mysql');

xdescribe('test/app/util/mysql.test.js', () => {

  it('should find one', async () => {
    const ctx = app.mockContext();
    const user = await mysqlUtil.get(ctx, 'User', { id: 1 });
    assert(user.id === 1);
  });

  it('should find null', async () => {
    const ctx = app.mockContext();
    const user = await mysqlUtil.get(ctx, 'User', { id: -1 });
    assert(!user);
  });

  it('should find null', async () => {
    const ctx = app.mockContext();
    const user = await mysqlUtil.get(ctx, 'User', { id: -1 });
    assert(!user);
  });

  it('should find desc', async () => {
    const ctx = app.mockContext();
    const user = await mysqlUtil.select(ctx, 'User', {
      orders: [[ 'id', 'desc' ]],
    });
    assert(user[0].id > user[1].id);
  });

  it('should insert and add log', async () => {
    const ctx = app.mockContext();
    const id = await mysqlUtil.insert(ctx, 'User', {
      name: 'lalala',
      age: 10,
      createdTime: new Date().getTime(),
    });
    assert(typeof id === 'number');
    const log = await mysqlUtil.get(ctx, '_Log', { after: JSON.stringify(await mysqlUtil.get(ctx, 'User', { id })) });
    assert(log);
    await ctx.app.mysql.delete('User', { id });
    await ctx.app.mysql.delete('_Log', { id: log.id });
  });

  it('should update one and add log', async () => {
    const ctx = app.mockContext();
    const name = 'lalala';
    const id = 0;
    const before = JSON.stringify((await mysqlUtil.select(ctx, 'User', {
      where: { id },
      columns: [ 'id', 'name' ],
    }))[0]);
    await mysqlUtil.update(ctx, 'User', { name }, { where: { id } });
    const user = await mysqlUtil.get(ctx, 'User', { id: 0 });
    assert(user.name === name);
    const log = await mysqlUtil.get(ctx, '_Log', {
      before,
      after: JSON.stringify((await mysqlUtil.select(ctx, 'User', {
        where: { id },
        columns: [ 'id', 'name' ],
      }))[0]),
    });
    assert(log);
    await ctx.app.mysql.update('User', { name: '火糊' }, { where: { id } });
    await ctx.app.mysql.delete('_Log', { id: log.id });
  });

  it('should update some and add log', async () => {
    const ctx = app.mockContext();
    const name = 'lalala';
    const createdTime = 1545362065;
    const before = JSON.stringify(await mysqlUtil.select(ctx, 'User', {
      where: { createdTime },
      columns: [ 'id', 'name' ],
    }));
    await mysqlUtil.update(ctx, 'User', { name }, { where: { createdTime } });
    const users = await mysqlUtil.select(ctx, 'User', { where: { createdTime }, columns: [ 'id', 'name' ] });
    assert(users.every(user => user.name === name));
    const log = await mysqlUtil.select(ctx, '_Log', {
      before,
      after: JSON.stringify(users),
    });
    assert(log.length > 0);
    await ctx.app.mysql.update('User', { name: '火糊' }, { where: { createdTime } });
    log.map(async log =>
      await ctx.app.mysql.delete('_Log', { id: log.id })
    );
  });

  it('should find count', async () => {
    const ctx = app.mockContext();
    const count = await mysqlUtil.count(ctx, 'User', {});
    assert(count > 0);
  });

  it('should reject insert', async () => {
    const ctx = app.mockContext();
    try {
      await mysqlUtil.query(ctx, 'insert into _Log (id) values (:id)', {
        id: 0,
      });
    } catch (e) {
      assert(e.message = '禁止改动此表');
    }
  });

  it('should reject insert', async () => {
    const ctx = app.mockContext();
    try {
      await mysqlUtil.query(ctx, 'insert into _Log (id) values (:id)', {
        id: 0,
      });
    } catch (e) {
      assert(e.message = '禁止改动此表');
    }
  });

  it('should reject update one table', async () => {
    const ctx = app.mockContext();
    try {
      await mysqlUtil.query(ctx, 'update _Log set id=:id', {
        id: 0,
      });
    } catch (e) {
      assert(e.message = '禁止改动此表');
    }
  });

  it('should reject update some table', async () => {
    const ctx = app.mockContext();
    try {
      await mysqlUtil.query(ctx, 'update User, _Log set _Log.id=:id', {
        id: 0,
      });
    } catch (e) {
      assert(e.message = '禁止改动此表');
    }
  });

  it('should pass transaction', async () => {
    const ctx = app.mockContext();
    const id = 9999;
    const name = 'lalala';
    const name2 = 'hahaha';
    const age = 99;
    const success = await mysqlUtil.beginTransactionScope(ctx, async conn => {
      await mysqlUtil.connInsert(ctx, 'User', {
        id,
        name,
        age,
        createdTime: new Date().getTime(),
      }, conn);
      await mysqlUtil.connUpdate(ctx, 'User', { name: name2 }, { where: { id } }, conn);
      return true;
    });
    assert(success);
    const user = await mysqlUtil.get(ctx, 'User', { id });
    assert(user.name === name2);
    assert(user.age === age);
    await ctx.app.mysql.delete('User', { id });
  });
});
