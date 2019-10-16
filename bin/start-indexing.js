#!/usr/bin/env node
const check = require('check-types')
const OPIndex = require('../src/opindex')
const log = require('../src/logger')

const startBlockHeight = process.argv[2]
const endBlockHeight = process.argv[3]

const idx = OPIndex()
const start = parseInt(startBlockHeight)
const end = parseInt(endBlockHeight)

if (!check.assigned(startBlockHeight)) {
  log.error('Starting block is required.')
  return
}

if (!check.integer(start)) {
  log.error('Starting block should be an integer.')
  return
}

if (check.assigned(endBlockHeight) && !check.integer(end)) {
  log.error('Ending block should be an integer.')
  return
}

if(check.assigned(endBlockHeight) && !check.greater(end, start)) {
  log.error('Ending block height should greater than starting.')
  return 
}

idx.indexBlocks(start, end)
.catch(e => {
  log.error(e)
})
