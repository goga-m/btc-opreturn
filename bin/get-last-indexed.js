#!/usr/bin/env node
const OPIndex = require('../src/opindex')
const log = require('../src/logger')

const idx = OPIndex()

idx.findLastIndexedBlockHeight()
.then(last => {
  log.info('Last indexed block height is', last)
  process.exit()
})
.catch(e => {
  log.error(e)
})
