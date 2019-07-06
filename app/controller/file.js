'use strict';

const Controller = require('egg').Controller;
const path = require('path');
const fs = require('fs');
const fstream = require('fstream');
const md5 = require('md5');
const exiftool = require('node-exiftool');
const exiftoolBin = require('dist-exiftool');
const unzip = require('unzip');
const mysqlUtil = require('../util/mysql');
const { Role, UploadType, StoragePath, ImageType } = require('../util/constant');

const _auth = {
  0: [ Role.SYSTEM, Role.MEMBER, Role.SYSTEM_STAFF, Role.HOTEL_STAFF ],
  1: [ Role.MEMBER, Role.SYSTEM_STAFF, Role.HOTEL_STAFF ],
  // todo 删除测试权限
  2: [ Role.MEMBER ],
  3: [ Role.HOTEL_STAFF ],
  4: [ Role.HOTEL_STAFF ],
  5: [ Role.SYSTEM_STAFF, Role.HOTEL_STAFF ],
  6: [ Role.SYSTEM_STAFF ],
};

class FileController extends Controller {
  async upload() {
    const { ctx, app } = this;
    const file = ctx.request.files[0];
    const fields = ctx.request.body;
    let type = fields.type;
    if (!type) {
      ctx.logger.error('错误的换头像角色', { fields });
      ctx.status = 400;
      ctx.body = {
        error: '文件未指定类型',
      };
      return;
    }
    type = parseInt(type);
    const filename = md5(file.filename + ctx.helper.createNonceStr()) +
      path.extname(file.filename)
        .toLocaleLowerCase();
    const role = ctx.helper.getRole(ctx).role;
    if (_auth[type].includes(role)) {
      try {
        if (type === UploadType.UPLOAD) {
          const url = await ctx.service.oss.uploadFile(StoragePath.UPLOAD + filename, file.filepath);
          ctx.body = {
            url,
          };
        } else if (type === UploadType.AVATAR) {
          this._dealImage(file.filepath);
          const url = await ctx.service.oss.uploadFile(StoragePath.UPLOAD_AVATAR + filename, file.filepath);
          const id = fields.id;
          const role = parseInt(fields.role);
          if (role === Role.MEMBER) {
            await ctx.service.member.updateAvatar(id, url);
          } else if (role === Role.HOTEL_STAFF || role === Role.SYSTEM_STAFF) {
            await ctx.service.staff.updateAvatar(id, url);
          } else {
            ctx.logger.error('错误的换头像角色', { id, role });
            ctx.status = 400;
            ctx.body = {
              error: '错误的换头像角色',
            };
            return;
          }
          ctx.body = {
            url,
          };
        } else {
          const data = fs.readFileSync(path.resolve(file.filepath));
          const base64 = data.toString('base64');
          if (type === UploadType.ID_CARD) {
            this._dealImage(file.filepath);
            const id = fields.id;
            const isSelf = fields.isSelf;
            const card = await ctx.service.baidu.readIdCard(base64);
            if (id) {
              if ((await ctx.service.member.countMemberCheckInMan(id, mysqlUtil.aesEncrypt(ctx, card.idCard))) > 0) {
                ctx.logger.error('入住人已添加', { id, card });
                ctx.status = 400;
                ctx.body = {
                  error: '入住人已添加',
                };
                return;
              }
              const checkInManId = await ctx.service.member.insertCheckInMan(id, isSelf, card);
              const checkInMan = await ctx.service.member.queryCheckInManById(checkInManId);
              checkInMan.name = mysqlUtil.aesDecrypt(ctx, checkInMan.name);
              checkInMan.idCard = mysqlUtil.aesDecrypt(ctx, checkInMan.idCard);
              ctx.body = checkInMan;
              return;
            }
            ctx.body = card;
          } else if (type === UploadType.LICENSE) {
            this._dealImage(file.filepath);
            const license = await ctx.service.baidu.readLicense(base64);
            // 上传执照
            const url = await ctx.service.oss.uploadFile(StoragePath.HOTEL_LICENSE + filename, file.filepath);
            ctx.body = {
              ...license,
              image: url,
            };
          } else if (type === UploadType.HOTEL_IMAGE) {
            this._dealImage(file.filepath);
            const image = parseInt(fields.image);
            let storagePath = '';
            switch (image) {
              case ImageType.HOTEL:
                storagePath = StoragePath.HOTEL_IMAGE_HOTEL;
                break;
              case ImageType.ROOM_TYPE:
                storagePath = StoragePath.HOTEL_IMAGE_ROOM_TYPE;
                break;
              case ImageType.ROOM:
                storagePath = StoragePath.HOTEL_IMAGE_ROOM;
                break;
              case ImageType.MERCHANDISE:
                storagePath = StoragePath.HOTEL_IMAGE_MERCHANDISE;
                break;
              default:
                return;
            }
            const url = await ctx.service.oss.uploadFile(storagePath + filename, file.filepath);
            ctx.body = {
              url,
            };
          } else if (type === UploadType.VR) {
            if (path.extname(file.filename) === '.zip') {
              const urlConfig = app.config.url;
              const id = fields.id;
              const prefix = `hotel_${id}/`;
              const dist = 'unzip/' + prefix;
              if (!fs.existsSync(dist)) {
                fs.mkdirSync(dist, e => {
                  ctx.logger.error(e);
                  throw e;
                });
              }
              await new Promise((resolve, reject) => {
                fs.createReadStream(file.filepath)
                  .pipe(unzip.Parse())
                  .pipe(fstream.Writer(dist))
                  .on('error', error => {
                    console.error(error);
                    reject(error);
                  })
                  .on('close', () => {
                    console.log('finish');
                    resolve();
                  });
              });
              console.log('start');
              await this._upload(ctx, prefix, dist, -1);
              console.log('end');
              this._delDir(dist);
              ctx.body = {
                url: urlConfig.PATH + '/' + StoragePath.VR + prefix + 'tour.html',
              };
            } else {
              ctx.logger.error('错误的文件格式');
              ctx.status = 400;
              ctx.body = {
                error: '错误的文件格式',
              };
            }
          } else if (type === UploadType.HELP) {
            const url = await ctx.service.oss.uploadFile(StoragePath.HELP + filename, file.filepath);
            ctx.body = {
              url,
            };
          } else {
            ctx.logger.error('未定义的上传类型');
            ctx.status = 400;
            ctx.body = {
              error: '未定义的上传类型',
            };
          }
        }
      } catch (e) {
        ctx.logger.error(e);
        ctx.status = 400;
        ctx.body = {
          error: e.message ? e.message : '上传失败',
        };
      } finally {
        await ctx.cleanupRequestFiles();
      }
    } else {
      ctx.logger.error('无权限', { fields, role });
      ctx.status = 400;
      ctx.body = {
        error: '无权限',
      };
    }
  }

  _dealImage(filepath) {
    const ep = new exiftool.ExiftoolProcess(exiftoolBin);
    ep
      .open()
      .then(() => ep.writeMetadata(filepath, {}, [ 'GPSAltitude=0', 'GPSLatitude=0', 'GPSLongitude=0' ]))
      .then(console.log, console.error)
      .then(() => ep.close())
      .then(() => fs.unlink(filepath + '_original', () => {}))
      .catch(console.error);
  }

  async _upload(ctx, prefix, dist, length) {
    const files = fs.readdirSync(dist);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const src = dist + '/' + file;
      if (length === -1 && src.endsWith('css')) {
        length = src.replace(/(.*)css/, '$1').length;
        console.log(length);
      }
      const st = fs.statSync(src);
      if (st.isFile() && file !== '.DS_Store') {
        console.log(src.slice(length));
        await ctx.service.oss.uploadFile(StoragePath.VR + prefix + src.slice(length), src);
        fs.unlink(src, () => {});
      } else if (st.isDirectory()) {
        await this._upload(ctx, prefix, src, length);
      }
    }
  }

  _delDir(dist) {
    if (fs.existsSync(dist)) {
      const files = fs.readdirSync(dist);
      files.forEach(file => {
        const curPath = dist + '/' + file;
        if (fs.statSync(curPath).isDirectory()) {
          this._delDir(curPath);
        } else {
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(dist);
    }
  }
}

module.exports = FileController;
