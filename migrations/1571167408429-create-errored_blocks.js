'use strict'
const { db } = require('../src/db')
const log = require('../src/logger')

module.exports.up = function (next) {
  log.info('Creating errored_blocks table')
  db.query('CREATE TABLE IF NOT EXISTS errored_blocks (blockheight integer NOT NULL, timestamp timestamp NOT NULL, PRIMARY KEY (blockheight))')
  .then(() => next())
  .catch(err => {
    log.error('Error creating errored_blocks table', err)
  })
}

module.exports.down = function (next) {
  next()
}
