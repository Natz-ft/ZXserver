'use strict';

class FileConnector {
  constructor(ctx) {
    this.ctx = ctx;
  }

  uploadFile(file) {
    const { ctx } = this;
    return ctx.service.file.saveFile(file);
  }
}

module.exports = FileConnector;
