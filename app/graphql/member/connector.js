'use strict';

const DataLoader = require('dataloader');
const mysqlUtil = require('../../util/mysql');
const { ErrorCode, Role, Source, Avatar, AuthorityType } = require('../../util/constant');

class MemberConnector {
  constructor(ctx) {
    this.ctx = ctx;
    this.leverLoader = new DataLoader(this.getMemberLevels.bind(this));
    this.checkInManLoader = new DataLoader(this.getCheckInMenByIds.bind(this));
  }

  getMemberOrder(id, statuses, page, size) {
    const { ctx } = this;
    return ctx.service.member.queryMemberOrder(id, statuses, page, size);
  }

  getMemberHotel(id, longitude, latitude, page, size, type) {
    const { ctx } = this;
    return ctx.service.member.queryMemberHotel(id, longitude, latitude, page, size, type);
  }

  getMemberNotCommentOrder(id, page, size) {
    const { ctx } = this;
    return ctx.service.member.queryMemberNotCommentOrder(id, page, size);
  }

  getMemberById(id) {
    const { ctx } = this;
    return ctx.service.member.queryMemberById(id);
  }

  async getAuthMember(orderRoomId) {
    const { ctx } = this;
    let roomCheckInMan;
    try {
      roomCheckInMan = await ctx.service.member.queryAuthRoomCheckInMan(orderRoomId);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (!roomCheckInMan) {
      ctx.helper.errorLog(ctx, ErrorCode.member.ORDER_ROOM_HAS_NO_AUTH_MAN, { orderRoomId });
    }
    if (roomCheckInMan.role === AuthorityType.ORDER_PERSON) {
      try {
        return await ctx.service.order.queryOrderMemberIdByOrderRoomId(orderRoomId);
      } catch (e) {
        ctx.logger.error(e);
        throw e;
      }
    }
    let checkInMan;
    try {
      checkInMan = await ctx.service.member.queryMemberIdByOtherCheckInMan(roomCheckInMan.CheckInMan_id);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (!checkInMan) {
      ctx.helper.errorLog(ctx, ErrorCode.member.AUTH_MAN_NOT_REAL_NAME, { roomCheckInMan, checkInMan });
    }
    return checkInMan.Member_id;
  }

  async memberPhoneLogin(phone, code, memberId, source, authCode) {
    const { ctx } = this;
    const smsConfig = ctx.app.config.sms;
    try {
      const data = await ctx.service.sms.getPhoneRedis(phone);
      if (data && JSON.parse(data)
        .some(sms => sms.code === code && sms.time + smsConfig.invalidTime > new Date().getTime())) {
        let member = await ctx.service.member.queryMemberByPhone(phone);
        if (!member) {
          if (!memberId) {
            const id = await ctx.service.member.registerMember({
              nickName: ctx.helper.createNonceStr(),
              avatarUrl: Avatar[ctx.helper.randomBetween(0, 8)],
              gender: 0,
            }, phone);
            if (source === Source.WEAPP) {
              const oauth = await ctx.service.wechat.getWechatOauth(authCode);
              await ctx.service.wechat.bindWechat(id, null, oauth.openid);
            }
            member = await ctx.service.member.queryMemberById(id);
          } else {
            await ctx.service.member.updatePhone(memberId, phone);
            member = await ctx.service.member.queryMemberById(memberId);
          }
        } else {
          if (memberId && member.id !== memberId) {
            const memberById = await ctx.service.member.queryMemberById(memberId);
            if (!memberById.phone) {
              if (member.createdTime > memberById.createdTime) {
                await ctx.service.member.updatePhone(memberId, phone);
                await ctx.service.member.unregisterMember(member.id);
                member = {
                  memberById,
                  phone: mysqlUtil.aesEncrypt(ctx, phone),
                };
              } else {
                await ctx.service.member.updateOauth(member.id, memberId);
                await ctx.service.member.unregisterMember(memberId);
              }
            }
          } else if (!memberId && source === Source.WEAPP) {
            const wechatOauth = await ctx.service.member.queryWechatOauthByMemberId(member.id);
            if (!wechatOauth) {
              const oauth = await ctx.service.wechat.getWechatOauth(authCode);
              await ctx.service.wechat.bindWechat(member.id, null, oauth.openid);
            }
          }
        }
        const token = ctx.helper.createToken(Role.MEMBER, 0, member.id, source);
        if (source === Source.WEAPP) {
          ctx.set('token', token);
        } else {
          ctx.cookies.set('token', token, { encrypt: true });
        }
        return member;
      }
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    ctx.helper.errorLog(ctx, ErrorCode.sms.VERIFICATION_CODE_ERROR, { phone, code });
  }

  async bindMemberPhone(id, phone, code) {
    const { ctx } = this;
    const smsConfig = ctx.app.config.sms;
    try {
      const data = await ctx.service.sms.getPhoneRedis(phone);
      if (data && JSON.parse(data)
        .some(sms => sms.code === code && sms.time + smsConfig.invalidTime > new Date().getTime())) {
        await ctx.service.member.updatePhone(id, phone);
        await ctx.service.sms.delPhoneRedis(phone);
        return true;
      }
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    ctx.helper.errorLog(ctx, ErrorCode.sms.VERIFICATION_CODE_ERROR, { phone, code });
  }

  async changeNickname(id, nickname) {
    const { ctx } = this;
    try {
      return await ctx.service.member.updateNickname(id, nickname);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async addCheckInMenWithNameAndIdCard(id, name, idCard) {
    const { ctx } = this;
    let checkInMan;
    try {
      checkInMan = await ctx.service.member.queryCheckInManByMemberIdAndIdCard(id, idCard);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (checkInMan) {
      ctx.helper.errorLog(ctx, ErrorCode.member.CHECK_IN_MAN_EXISTED, { id, name, idCard, checkInMan });
    }
    try {
      const checkInManId = await ctx.service.member.insertCheckInMenWithNameAndIdCard(id, name, idCard);
      return await ctx.service.member.queryCheckInManById(checkInManId);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  async deleteMemberCheckInMan(id, checkInManId) {
    const { ctx } = this;
    let checkInMan;
    try {
      checkInMan = await ctx.service.member.queryCheckInManById(checkInManId);
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
    if (id !== checkInMan.Member_id) {
      ctx.helper.errorLog(ctx, ErrorCode.member.CHECK_IN_MAN_OWNER_NOT_CONFORMITY, { id, checkInManId });
    }
    return ctx.service.member.delMemberCheckInMan(checkInManId);
  }

  async getMemberOpenId(id) {
    const { ctx } = this;
    try {
      const { openId } = await ctx.service.member.queryWechatOauthByMemberId(id);
      return openId;
    } catch (e) {
      ctx.logger.error(e);
      throw e;
    }
  }

  getMemberLevels(levelIds) {
    const { ctx } = this;
    return ctx.service.member.queryMemberLevels(levelIds);
  }

  getMemberLevel(levelId) {
    return this.leverLoader.load(levelId);
  }

  getCheckInMenByIds(checkInManIds) {
    const { ctx } = this;
    return ctx.service.member.queryCheckInMenByIds(checkInManIds);
  }

  getCheckInManById(checkInManId) {
    return this.checkInManLoader.load(checkInManId);
  }

  getMemberCheckInMan(id) {
    const { ctx } = this;
    return ctx.service.member.queryMemberCheckInMan(id);
  }

  getMemberCoupon(id) {
    const { ctx } = this;
    return ctx.service.member.queryMemberCoupon(id);
  }

  getOnProcessingOrder(id) {
    const { ctx } = this;
    return ctx.service.member.queryOnProcessingOrder(id);
  }

  getMemberCollectionView(id, type) {
    const { ctx } = this;
    return ctx.service.member.queryMemberCollectionView(id, type);
  }

  memberCollectHotel(id, hotelId) {
    const { ctx } = this;
    return ctx.service.member.addMemberCollectHotel(id, hotelId);
  }

  memberCancelCollectHotel(id, memberCollectionIds) {
    const { ctx } = this;
    return ctx.service.member.deleteMemberCollectHotel(id, memberCollectionIds);
  }

  clearMemberViews(id) {
    const { ctx } = this;
    return ctx.service.member.deleteMemberViews(id);
  }

  memberLikeComment(role, commentId) {
    const { ctx } = this;
    return ctx.service.member.memberLikeAComment(role, commentId);
  }
}

module.exports = MemberConnector;
