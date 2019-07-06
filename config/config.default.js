'use strict';

module.exports = appInfo => {
  const KEY = '1545093755416_4595';

  const config = exports = {};

  // use for cookie sign key, should change to your own and keep security
  config.keys = `${appInfo.name}_${KEY}`;

  // add your config here
  config.middleware = [
    'robot',
    'auth',
    'graphql',
  ];

  config.url = {
    URL: 'https://api2.zzzz1997.com',
    PATH: 'https://res2.webinn.online',
  };

  config.aes = {
    key: 'e5250e89ad1bb0ca',
    iv: '1fc8ce95d10f409b',
  };

  config.robot = {
    ua: [
      /Baiduspider/i,
    ],
  };

  config.auth = {
    secret: KEY,
    timeout: 8 * 60 * 60 * 1000,
    ignore: [],
  };

  config.bodyParser = {
    jsonLimit: '10mb',
  };

  config.graphql = {
    router: '/graphql',
    graphiql: true,
    onPreGraphiQL: async ctx => {
      const token = ctx.cookies.get('token', { encrypt: true });
      if (token) {
        const { role } = ctx.helper.verifyToken(ctx, token);
        if (role !== 0) {
          ctx.redirect('/');
        }
      } else {
        ctx.redirect('/');
      }
    },
  };

  config.security = {
    csrf: {
      enable: false,
      ignoreJson: true,
      ignore: () => true,
    },
    domainWhiteList: [ '*' ],
  };

  config.cors = {
    origin: '*',
    allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH',
    exposeHeaders: 'Token,token',
  };

  config.redis = {
    // todo 正式localhost
    clients: {
      db0: {
        port: 6379,
        host: '47.106.111.245',
        password: '113911',
        db: 0,
      },
      db1: {
        port: 6379,
        host: '47.106.111.245',
        password: '113911',
        db: 1,
      },
      db14: {
        port: 6379,
        host: '47.106.111.245',
        password: '113911',
        db: 14,
      },
      db15: {
        port: 6379,
        host: '47.106.111.245',
        password: '113911',
        db: 15,
      },
      subscribe: {
        port: 6379,
        host: '47.106.111.245',
        password: '113911',
        db: 15,
      },
    },
  };

  config.io = {
    init: {},
    namespace: {
      '/sweeper': {
        connectionMiddleware: [ 'auth', 'connection' ],
        packetMiddleware: [ ],
      },
      '/hotel': {
        connectionMiddleware: [ 'auth', 'connection' ],
        packetMiddleware: [ ],
      },
    },
    redis: {
      host: '47.106.111.245',
      port: '6379',
      auth_pass: '113911',
      db: 14,
    },
  };

  config.wechat = {
    appid: 'wxafef299c20b947a6',
    secret: 'e600deafd244f560d1cc6ffea0924509',
    mch_id: '1503420871',
    key: 'webinnpay3r3ejrlfjkjvdsxhfidsh22',
    trade_type: 'JSAPI',
    unified_notify_url: `${config.url.URL}/wechat/payActionUnified`,
    refund_notify_url: `${config.url.URL}/wechat/payActionRefund`,
    signType: 'MD5',
    template: {
      orderSuccess: '8IspxFE9ruf0RrYdaq3tYZ49wYrPwthP1zxsiDBzDQQ',
      orderFail: 'biq6y6hB8V_GdPRLoPQszpJpxyCHXpiI0uJjRtjWmdE',
      cancelOrder: 'GLOWbbH4UORh5EiMoD4SHTCnBGdIqW8bqPqf5yQmvRM',
      refundNotify: '5FJg093--8JbWHd06Uz3ezWCspogE9V_3BAvNaD9HPI',
    },
    fee: 1,
  };

  config.sms = {
    resendTime: 60 * 1000,
    invalidTime: 10 * 60 * 1000,
    tplId: '124802',
    appKey: 'cd0a75707517afbe797ed597265e1dce',
  };

  config.alinode = {
    enable: true,
    appid: '77565',
    secret: '659d3652126a2eb2d79cb91570cb7f55e4f58641',
  };

  config.baidu = {
    apiKey: 'pYHbqkcFrMvjCpVAYCFkmTGb',
    secret: 'UDmTLpnwbG09WB76ENNO7ulv1xvPani6',
  };

  config.amap = {
    key: '19f55acd8aa5d4e958606492691bdd16',
  };

  config.view = {
    defaultExtension: '.html',
    mapping: { '.html': 'ejs' },
  };

  config.guojia = {
    version: '1.0',
    s_id: '333333',
    account: '17760010551',
    password: '2656a5f9d37ef42e6ec28e1d42bee8bd',
    s_id2: 'c909fb8a-2866-4e66-a95b-a2326ba2b5c',
    pwd_user_mobile: '13980835783',
    pwd_user_name: 'wei4553535',
  };

  config.oss = {
    useAgent: true,
    client: {
      accessKeyId: 'LTAIsRFowPGfMLvv',
      accessKeySecret: 'cFSFpnzRAv0kwyHJQmtw2WgLRdxFFv',
      bucket: 'webinn',
      endpoint: 'oss-cn-beijing.aliyuncs.com',
      timeout: '60s',
      maxSockets: 50,
    },
  };

  config.multipart = {
    mode: 'file',
    fileSize: '100mb',
  };

  config.timing = {
    delayNumber: 60,
  };

  return config;
};
