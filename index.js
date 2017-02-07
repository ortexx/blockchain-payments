"use strict";

const request = require('request-promise');
const _ = require('lodash');
const qs = require('querystring');
const url = require('url');

class BlockchainPayments {
  static request(options) {
    return request(options);
  }

  static toBTC(value, currency) {
    currency = currency || 'USD';
    currency = currency.toUpperCase();

    let options = {};

    options.method = 'GET';
    options.url = `https://blockchain.info/tobtc?currency=${currency}&value=${value}`;

    return this.request(options).then((_value) => {
      return parseFloat(_value);
    });
  }

  constructor(xpub, key, notifySecret, notifyUrl) {
    this.defaults = {
      xpub: xpub,
      key: key
    };

    if(notifyUrl) {
      this.defaults.callback = notifyUrl;
    }

    this.notifyConfirmationsCount = 6;
    this.notifySecret = notifySecret;
    this.apiUrl = 'https://api.blockchain.info/v2/';

    this.queryDefaultOptions = {
      method: "GET"
    }
  }

  getAddressCreateUrl() {
    return this.apiUrl + 'receive?';
  }

  queryFilter(query) {
    return query;
  }

  queryCheck(query) {
    if(!query.xpub) {
      throw new Error('xpub is required');
    }
    else if(!query.key) {
      throw new Error('key is required');
    }
    else if(!query.callback) {
      throw new Error('callback is required');
    }
  }

  request(options) {
    options = _.extend({}, this.queryDefaultOptions, options);

    return this.constructor.request(options).then((data) => {
      if(typeof data != 'object') {
        data = JSON.parse(data);
      }

      return data
    });
  }

  createRequestOptions(url, params) {
    return {
      url: `${url}${qs.stringify(params)}`
    }
  }

  createAddress(query, callbackQuery) {
    query = _.merge({}, this.defaults, query);
    query = this.queryFilter(query);

    if(query.callback) {
      let info = url.parse(query.callback, true);

      callbackQuery = callbackQuery || {};

      if(this.notifySecret) {
        callbackQuery.secret = this.notifySecret;
      }

      info.query = _.merge({}, info.query, callbackQuery);
      query.callback = url.format({
        host: info.host,
        pathname: info.pathname,
        protocol: info.protocol,
        query: info.query
      })
    }

    this.queryCheck(query);

    return this.request(this.createRequestOptions(this.getAddressCreateUrl(), query));
  }

  notify(fn, onError, confirmationsCount) {
    confirmationsCount = confirmationsCount || this.notifyConfirmationsCount;

    return (req, res) => {
      let ok = () => {
        res.set('Content-Type', 'text/plain');
        return res.send('*ok*');
      };

      let fail = (err, meta) => {
        res.set('Content-Type', 'text/plain');
        res.status(500);

        if(onError) {
          onError(err, meta);
        }

        return res.send('*bad*');
      };

      if(~~req.query.confirmations < confirmationsCount) {
        return fail(new Error('Confirmations count less than ' + confirmationsCount), {
          reason: 'confirmations',
          confirmations: req.query.confirmations
        });
      }

      if(this.notifySecret && req.query.secret != this.notifySecret) {
        return fail(new Error('Wrong secret key'), {
          reason: 'secret'
        });
      }

      function callback(err) {
        if(err) {
          return fail(err);
        }

        return ok();
      }

      if(!fn) {
        return ok();
      }

      let result = fn.call(this, req.query, callback);

      if(result && typeof result == 'object') {
        result.then(() => {
          ok();
        }).catch((err) => {
          fail(err);
        })
      }
    }
  }
}

module.exports = BlockchainPayments;
