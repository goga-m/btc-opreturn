// 'use strict'
const db = require('../db')

module.exports.up = function (next) {
  db.query('CREATE TABLE IF NOT EXISTS op_returns (op_return text NOT NULL, txhash text NOT NULL, blockhash text NOT NULL)')
  .then(() => next())
  .catch(console.log)
}

module.exports.down = function (next) {
  next()
}
