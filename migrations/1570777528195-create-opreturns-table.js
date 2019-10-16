'use strict'
const { db } = require('../src/db')
const log = require('../src/logger')

module.exports.up = function (next) {
  log.info('Creating op_returns table')
  db.query('CREATE TABLE IF NOT EXISTS op_returns (op_return bytea NOT NULL, op_return_long bytea NOT NULL, txhash text NOT NULL, blockhash text NOT NULL, blockheight integer NOT NULL, unique(op_return_long, txhash))')
  .then(() => next())
  .catch(err => {
    log.error('Error creating op_returns table', err)
  })
}

module.exports.down = function (next) {
  next()
}
