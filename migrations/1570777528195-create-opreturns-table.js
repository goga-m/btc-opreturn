// 'use strict'
const { db } = require('../src/db')
const log = require('../src/logger')

module.exports.up = function (next) {
  log.info('Creating op_returns table')
  db.query('CREATE TABLE IF NOT EXISTS op_returns (op_return text NOT NULL, txhash text NOT NULL, blockhash text NOT NULL, blockheight integer NOT NULL)')
  .then(() => next())
  .catch(err => {
    console.log('Error creating op_returns table')
    console.log(err)
  })
}

module.exports.down = function (next) {
  next()
}
