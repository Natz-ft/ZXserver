'use strict';

const DataLoader = require('dataloader');

class MerchandiseConnector {
  constructor(ctx) {
    this.ctx = ctx;
    this.loader = new DataLoader(this.getMerchandiseByIds.bind(this), { cache: false });
  }

  addMerchandise(hotelId, name, unit, price, cover) {
    const { ctx } = this;
    return ctx.service.merchandise.insertMerchandise(hotelId, name, unit, price, cover);
  }

  modifyMerchandise(id, name, unit, price, cover) {
    const { ctx } = this;
    return ctx.service.merchandise.updateMerchandiseById(id, name, unit, price, cover);
  }

  delMerchandise(id) {
    const { ctx } = this;
    return ctx.service.merchandise.deleteMerchandiseById(id);
  }

  getHotelMerchandise(hotelId) {
    const { ctx } = this;
    return ctx.service.merchandise.queryHotelMerchandise(hotelId);
  }

  getMerchandiseByIds(ids) {
    const { ctx } = this;
    return ctx.service.merchandise.queryMerchandiseByIds(ids);
  }

  getMerchandiseById(id) {
    return this.loader.load(id);
  }

  getConsumptionByOrderRoomId(orderRoomId) {
    const { ctx } = this;
    return ctx.service.merchandise.queryConsumptionByOrderRoomId(orderRoomId);
  }

  getHotelMerchandiseByOrderRoomId(orderRoomId) {
    const { ctx } = this;
    return ctx.service.merchandise.queryHotelMerchandiseByOrderRoomId(orderRoomId);
  }
}

module.exports = MerchandiseConnector;
