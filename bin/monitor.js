#!/usr/bin/env node
const check = require('check-types')
const OPIndex = require('../src/opindex')
const log = require('../src/logger')

const startBlockHeight = process.argv[2]

const idx = OPIndex()
const start = parseInt(startBlockHeight)

if (check.assigned(startBlockHeight) && !check.integer(start)) {
  log.error('Starting block should be an integer')
  return
}

log.info('Start monitoring...')
idx.monitor(start)
.catch(e => {
  log.error(e)
})
