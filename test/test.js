"use strict";

const assert = require('chai').assert;
const BlockchainPayments = require('../index');
const express = require('express');
const request = require('supertest');

BlockchainPayments.request = function(options) {
  return Promise.resolve(options);
};

describe('BlockchainPayments:', function () {
  let xpub = 'xpub';
  let key = 'key';
  let secret = 'secret';
  let callbackUrl = 'http://example.com/';
  let blockchain = new BlockchainPayments(xpub, key, secret, callbackUrl);
  let resUrl = '';
  
  describe('#createAddress()', function () {
    it('check default request', function () {
      resUrl = blockchain.getAddressCreateUrl();
      resUrl += `xpub=xpub&key=key&callback=http%3A%2F%2Fexample.com%2F%3Fsecret%3Dsecret`;
      
      return blockchain.createAddress().then((options) => {
        assert.equal(options.url, resUrl)
      })
    });

    it('check xpub requiring', function (done) {
      try {
        blockchain.createAddress({xpub: ''});
        done(new Error('xpub may be missing'));
      }
      catch(err) {
        done();
      }
    });

    it('check key requiring', function (done) {
      try {
        blockchain.createAddress({key: ''});
        done(new Error('key may be missing'));
      }
      catch(err) {
        done();
      }
    });

    it('check request params', function () {
      resUrl = blockchain.getAddressCreateUrl();
      resUrl += 'xpub=newxpub&key=newkey&callback=http%3A%2F%2Fexample.com%2F%3Ftest%3Dtest%26secret%3Dsecret';

      return blockchain.createAddress({ xpub: 'newxpub', key: 'newkey'}, { test: 'test' }).then((options) => {
        assert.equal(options.url, resUrl)
      })
    });
  });

  describe('notification', function () {
    it('check confirmation error', function (done) {
      let app = express();
      let error;

      app.get('/notify', blockchain.notify(() => {}, (err, meta) => {
        (meta.reason != 'confirmations') && (error = new Error('confirmation error checking was failed'));
      }));

      request(app)
        .get('/notify')
        .query({'confirmations': 0})
        .expect(() => {
          if(error) {
            throw error;
          }
        })
        .end(done)
    });

    it('check secret key', function (done) {
      let app = express();
      let error;
      let query = {'confirmations': 3};

      app.get('/notify', blockchain.notify(() => {}, (err, meta) => {
        (meta.reason != 'secret') && (error = new Error('secret key error checking was failed'));
      }, query.confirmations));

      request(app)
        .get('/notify')
        .query(query)
        .expect(() => {
          if(error) {
            throw error;
          }
        })
        .end(done)
    });

    it('check success request with callback', function (done) {
      let app = express();
      let query = {'confirmations': "8", secret: secret };

      app.get('/notify', blockchain.notify((_query, callback) => {
        assert.equal(JSON.stringify(query), JSON.stringify(_query));
        callback();
      }, null, query.confirmations - 1));

      request(app)
        .get('/notify')
        .query(query)
        .expect(200)
        .end(done)
    });

    it('check success request with promise', function (done) {
      let app = express();
      let query = {'confirmations': "8", secret: secret };

      app.get('/notify', blockchain.notify(() => {
        return Promise.resolve();
      }, null, query.confirmations - 1));

      request(app)
        .get('/notify')
        .query(query)
        .expect(200)
        .end(done)
    });

    it('check success request with callback error', function (done) {
      let app = express();
      let query = {'confirmations': "8", secret: secret };

      app.get('/notify', blockchain.notify((_query, callback) => {
        callback(new Error('success'));
      }, null, query.confirmations - 1));

      request(app)
        .get('/notify')
        .query(query)
        .expect(500)
        .end(done)
    });

    it('check success request with promise error', function (done) {
      let app = express();
      let query = {'confirmations': "8", secret: secret };

      app.get('/notify', blockchain.notify(() => {
        return Promise.reject(new Error('success'));
      }, null, query.confirmations - 1));

      request(app)
        .get('/notify')
        .query(query)
        .expect(500)
        .end(done)
    });
  });
});

