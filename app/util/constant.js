'use strict';

module.exports = {
  ErrorCode: {
    audit: {
      index: 1,
      AUDIT_NOT_EXIST: {
        code: '101',
        description: '审核不存在',
      },
      AUDIT_PROCESSED: {
        code: '102',
        description: '审核已处理',
      },
      AUDIT_INVALID: {
        code: '103',
        description: '审核已失效',
      },
    },
    coupon: {
      index: 2,
      COUPON_INVALID: {
        code: '201',
        description: '优惠券无效',
      },
      COUPON_HAS_BEEN_RECEIVE_ENDS: {
        code: '202',
        description: '优惠券已领完',
      },
      CAN_NOT_GIT_AGAIN: {
        code: '203',
        description: '您已无法再次领取',
      },
      COUPON_NOT_EXIST: {
        code: '204',
        description: '优惠券不存在',
      },
      COUPON_CAN_NOT_DELETE: {
        code: '205',
        description: '优惠券已发放，不可删除',
      },
    },
    order: {
      index: 3,
      NOT_ENOUGH_ROOM: {
        code: '301',
        description: '房型空闲房间不足',
      },
      PRICE_INVALID: {
        code: '302',
        description: '价格无效',
      },
      ORDER_ROOM_COUNT_NOT_CONFORMITY: {
        code: '303',
        description: '订单房间数不匹配',
      },
      ORDER_NOT_EXIST: {
        code: '304',
        description: '该订单不存在',
      },
      ORDER_STATUS_ABNORMAL: {
        code: '305',
        description: '订单状态异常',
      },
      ORDER_STATUS_IS_NOT_CHECK_IN_OR_NOT_CHECK_IN: {
        code: '306',
        description: '订单非入住状态',
      },
      ORDER_STATUS_IS_NOT_CHECK_IN: {
        code: '307',
        description: '订单非入住中状态',
      },
      ORDER_CAN_NOT_CANCEL: {
        code: '308',
        description: '当前订单不可取消',
      },
      CHECK_OUT_ROOM_LIST_CAN_NOT_BE_NULL: {
        code: '309',
        description: '退房房间不能为空',
      },
      ORDER_ROOM_NOT_EXIST: {
        code: '310',
        description: '订单房间不存在',
      },
      ORDER_ROOM_EXITED: {
        code: '311',
        description: '订单房间已退出',
      },
      ORDER_COMMENTED: {
        code: '312',
        description: '订单已评价',
      },
      ORDER_ROOM_CONSUMPTION_CONFIRMED: {
        code: '313',
        description: '订单房间消费已确认',
      },
      STAY_CONDITION_NOT_CONFORMITY: {
        code: '314',
        description: '不符合续房条件',
      },
      ORDER_INVALID: {
        code: '315',
        description: '订单已失效',
      },
      ORDER_ROOM_INVALID: {
        code: '316',
        description: '订单房间已失效',
      },
    },
    member: {
      index: 4,
      PLEASE_AUTH_AND_LOGIN_FIRST: {
        code: '401',
        description: '请先授权登录',
      },
      PLEASE_REAL_NAME_FIRST: {
        code: '402',
        description: '请先实名',
      },
      CHECK_IN_MAN_EXISTED: {
        code: '403',
        description: '该入住人已存在',
      },
      CHECK_IN_MAN_OWNER_NOT_CONFORMITY: {
        code: '404',
        description: '入住人归属人不符',
      },
      ORDER_OWNER_NOT_CONFORMITY: {
        code: '405',
        description: '订单归属人不符',
      },
      ORDER_ROOM_HAS_NO_AUTH_MAN: {
        code: '406',
        description: '当前订单房间没有权限人',
      },
      AUTH_MAN_NOT_REAL_NAME: {
        code: '407',
        description: '权限人未实名',
      },
      AUTH_MAN_NOT_CHECK_IN_MAN: {
        code: '408',
        description: '权限人非入住人',
      },
      HAVE_NO_RIGHT_OF_THIS_ORDER_ROOM: {
        code: '409',
        description: '无此订单房间的权限',
      },
      PART_ROOM_HAVE_NO_RIGHT_CHECK_OUT: {
        code: '410',
        description: '部分房间无权退房',
      },
      CHECK_IN_MAN_NOT_IN_ORDER_ROOM: {
        code: '411',
        description: '该订单房间此入住人信息不存在',
      },
    },
    room: {
      index: 5,
      ROOM_TYPE_NOT_EXIST: {
        code: '501',
        description: '房型不存在',
      },
      ROOM_TYPE_NAME_EXISTED: {
        code: '502',
        description: '房型名称已存在',
      },
      ROOM_NOT_EXIST: {
        code: '503',
        description: '房间不存在',
      },
      ROOM_CAN_NOT_ONE_KEY_OPEN_LOCK: {
        code: '504',
        description: '房间不支持远程开锁',
      },
      NEW_ROOM_CAN_NOT_CHANGE: {
        code: '505',
        description: '新房间不可更换，请另选空房',
      },
      ROOM_TYPE_INVALID: {
        code: '506',
        description: '房型已失效',
      },
      ROOM_INVALID: {
        code: '507',
        description: '房间已失效',
      },
    },
    share: {
      index: 6,
      ORIGIN_MEMBER_NOT_EXIST: {
        code: '601',
        description: '授权人信息不存在',
      },
      ORIGIN_MEMBER_NOT_REAL_NAME: {
        code: '602',
        description: '授权发起人未实名',
      },
      ORIGIN_MEMBER_HAS_NO_RIGHT: {
        code: '603',
        description: '授权人无授权权限',
      },
      SHARE_MEMBER_NOT_IN_ORDER: {
        code: '604',
        description: '该分享会员不存在订单内',
      },
      TARGET_MEMBER_ALREADY_HAS_AUTHORITY: {
        code: '605',
        description: '被授权人已拥有权限',
      },
    },
    sms: {
      index: 7,
      SEND_MESSAGE_NO_INTERVAL: {
        code: '701',
        description: '短信发送无间隔',
      },
      SEND_MESSAGE_FAILED: {
        code: '702',
        description: '短信发送失败',
      },
      VERIFICATION_CODE_ERROR: {
        code: '703',
        description: '验证码错误，请重新获取',
      },
    },
    staff: {
      index: 8,
      ACCOUNT_OR_PASSWORD_ERROR: {
        code: '801',
        description: '账户或密码错误',
      },
      STAFF_NOT_EXIST: {
        code: '802',
        description: '员工不存在',
      },
      STAFF_HOTEL_NOT_CONFORMITY: {
        code: '803',
        description: '员工酒店不符',
      },
    },
    wechat: {
      index: 9,
      WECHAT_HAS_BEEN_BIND: {
        code: '901',
        description: '该微信已被绑定',
      },
      CALL_PAY_FAILED: {
        code: '902',
        description: '调用支付失败',
      },
    },
  },
  /**
   * 角色
   *
   * SYSTEM：系统
   * MEMBER：会员
   * SYSTEM_STAFF：系统员工
   * HOTEL_STAFF：酒店员工
   * VISITOR：游客
   */
  Role: {
    SYSTEM: 0,
    MEMBER: 1,
    SYSTEM_STAFF: 2,
    HOTEL_STAFF: 3,
    VISITOR: 4,
  },
  /**
   * 酒店员工类型
   *
   * ADMIN：负责人
   * BACK：后台
   * SWEEPER：客房
   */
  StaffType: {
    ADMIN: 0,
    BACK: 1,
    SWEEPER: 2,
  },
  /**
   * 订单状态
   *
   * ALL：全部
   * NOT_PAY：未支付
   * NOT_CONFIRM：待确认
   * NOT_CHECK_IN：待入住
   * CHECK_IN：入住中
   * TOTAL_REFUND：全额退款
   * PARTIAL_REFUND：部分退款
   * REFUND_COMPLETE：退款完成
   * CANCEL：会员取消
   * EXPIRED：过期
   * REJECT：拒绝
   */
  OrderStatus: {
    ALL: -1,
    NOT_PAY: 0,
    NOT_CONFIRM: 1,
    NOT_CHECK_IN: 2,
    CHECK_IN: 3,
    TOTAL_REFUND: 4,
    PARTIAL_REFUND: 5,
    REFUND_COMPLETE: 6,
    CANCEL: 7,
    EXPIRED: 8,
    REJECT: 9,
  },
  /**
   * 房间状态
   *
   * ALL：全部
   * FREE：空闲
   * USING：入住
   * OCCUPY：自用
   * SWEEP：脏房
   * MAINTAIN：维修
   */
  RoomStatus: {
    ALL: -1,
    FREE: 0,
    USING: 1,
    OCCUPY: 2,
    SWEEP: 3,
    MAINTAIN: 4,
  },
  /**
   * 后台角色
   *
   * PLATFORM：平台
   * FRANCHISED：加盟店
   * PROTOCOL：协议店
   * DIRECT：直营店
   */
  WebRole: {
    PLATFORM: 0,
    FRANCHISED: 1,
    PROTOCOL: 2,
    DIRECT: 3,
  },
  /**
   * 角色来源
   *
   * WEAPP：微信小程序
   * ANDROID：安卓
   * IOS：苹果
   * WEB：网站
   */
  Source: {
    WEAPP: 0,
    ANDROID: 1,
    IOS: 2,
    WEB: 3,
  },
  /**
   * 默认头像数组
   */
  Avatar: [
    'https://res2.webinn.online/assets/avatar/animal1.png',
    'https://res2.webinn.online/assets/avatar/animal1.png',
    'https://res2.webinn.online/assets/avatar/animal3.png',
    'https://res2.webinn.online/assets/avatar/animal4.png',
    'https://res2.webinn.online/assets/avatar/animal5.png',
    'https://res2.webinn.online/assets/avatar/animal6.png',
    'https://res2.webinn.online/assets/avatar/animal7.png',
    'https://res2.webinn.online/assets/avatar/animal8.png',
    'https://res2.webinn.online/assets/avatar/animal9.png',
  ],
  /**
   * 上传类型
   *
   * UPLOAD：文件上传
   * AVATAR：头像上传
   * ID_CARD：身份证上传
   * LICENSE：营业执照上传
   * HOTEL_IMAGE: 酒店图片
   * VR：vr资源
   */
  UploadType: {
    UPLOAD: 0,
    AVATAR: 1,
    ID_CARD: 2,
    LICENSE: 3,
    HOTEL_IMAGE: 4,
    VR: 5,
    HELP: 6,
  },
  /**
   * 存储位置
   *
   * CHECK_IN_PIC：入住身份证图片
   * CHECK_IN_REAL_TIME_PIC：入住实时图片
   * HOTEL_IMAGE_HOTEL: 酒店图片
   * HOTEL_IMAGE_ROOM_TYPE：房型图片
   * HOTEL_IMAGE_ROOM：房间图片
   * HOTEL_IMAGE_MERCHANDISE：消费品图片
   * HOTEL_LICENSE：酒店营业执照
   * VR：vr资源
   * UPLOAD：上传文件
   * UPLOAD_AVATAR：上传头像
   */
  StoragePath: {
    CHECK_IN_PIC: 'check_in/pic/',
    CHECK_IN_REAL_TIME_PIC: 'check_in/real_time_pic/',
    HOTEL_IMAGE_HOTEL: 'hotel/hotel/',
    HOTEL_IMAGE_ROOM_TYPE: 'hotel/room_type/',
    HOTEL_IMAGE_ROOM: 'hotel/room/',
    HOTEL_IMAGE_MERCHANDISE: 'hotel/merchandise/',
    HOTEL_LICENSE: 'hotel/license/',
    VR: 'vr/',
    UPLOAD: 'upload/',
    UPLOAD_AVATAR: 'upload/avatar/',
    HELP: 'help/',
  },
  /**
   * 审核类型
   * LICENSE：执照
   * BASE_HOTEL_INFO：酒店基础
   * HIGHER_HOTEL_INFO： 酒店高级
   * ROOM_TYPE：房型
   * COMMENT：评论
   * MERCHANDISE：消费品
   */
  AuditType: {
    LICENSE: 0,
    BASE_HOTEL_INFO: 1,
    HIGHER_HOTEL_INFO: 2,
    ROOM_TYPE: 3,
    COMMENT: 4,
    MERCHANDISE: 5,
  },
  /**
   * 图片类型
   * HOTEL：酒店
   * ROOM_TYPE：房型
   * ROOM：房间
   * MERCHANDISE：
   */
  ImageType: {
    HOTEL: 0,
    ROOM_TYPE: 1,
    ROOM: 2,
    MERCHANDISE: 3,
  },
  /**
   * 权限人物类型
   * ORDER_PERSON：订单人
   * HAVE_NO_RIGHT_ORDER_PERSON：无权订单人
   * AUTHORIZED_PERSON：权限人
   * CHECK_IN_MAN：入住人
   */
  AuthorityType: {
    ORDER_PERSON: 0,
    HAVE_NO_RIGHT_ORDER_PERSON: 1,
    AUTHORIZED_PERSON: 2,
    CHECK_IN_MAN: 3,
  },
};
