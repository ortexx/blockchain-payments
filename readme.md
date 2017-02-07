# Install
`npm install blockchain-payments`

# About
Blockchain.info payment api (v2) module

# Example
```js
const BlockchainPayments = require("blockchain-payments");
const express = require("express");
const app = express();

let xpub = "xpubxpubxpub"; // xpub
let key = "keykeykey"; // blockchain key
let notifySecret = "secretsecret"; // secret key for notification

const blockchain = new BlockchainPayments(xpub, key, notifySecret);

// Create address for payment
app.post('/payments/bitcoin/address/', (req, res, next) => {    
    blockchain.createAddress({
        callback: 'http://example.com'
    }, {
      someCallbackField1: '1',
      someCallbackFieldw2: '2',
    }).then((data) => {
        console.log(data) // {address: ..., index: ..., callback: ...}
    })
});

BlockchainPayments.toBTC(500, 'USD').then((amountInBTC) => {
    // converting USD(or other) to BTC;
});

// notify handler
let successHandler = (data, callback) => {
    // data === req.query    
    // save payment info in db e.t.c    
    // callback() or return promise
};

let errorHandler = (err, meta) => {
    // you can save to a file, db e.t.c.
    // operation must be synchronous or in the background
};

let confirmationsCount = 8; // count of confirmations for accept, default 6

app.post('payments/notify/handler/', blockchain.notify(successHandler, errorHandler, confirmationsCount));

```

# Description  
You can write custom notify handler, but library version includes data/authentication validation and automatically send all headers in necessary format

# API
### .constructor(xpub, key, notifySecret, [notifyCallback])  
xpub and key you can find in your blockchain account, notifySecret you must come up yourself

### .createAddress(query, [callbackQuery])
returns promise, create bitcoin address for client payment  
you can set callback url query params with callbackQuery, it must be object

### .notify(fn, onError, [confirmationsCount])
notify handler, it is "connect" middleware

# Class methods
### .toBTC(amount, currency)
converting amount in the currency to BTC, returns promise
