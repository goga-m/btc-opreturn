#!/usr/bin/env node
const OPIndex = require('../src/opindex')
const log = require('../src/logger')

const startBlockHeight = process.argv[2]

const idx = OPIndex()
log.info('Start indexing all errored blocks...')
idx.indexErroredBlocks()
.catch(e => {
  log.error(e)
})
