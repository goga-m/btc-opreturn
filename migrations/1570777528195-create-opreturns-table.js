// 'use strict'
const { db } = require('../src/db')

module.exports.up = function (next) {
  db.query('CREATE TABLE IF NOT EXISTS op_returns (op_return bytea NOT NULL, txhash text NOT NULL, blockhash text NOT NULL, blockheight integer NOT NULL)')
  .then(() => next())
  .catch(console.log)
}

module.exports.down = function (next) {
  next()
}
