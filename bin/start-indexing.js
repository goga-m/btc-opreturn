#!/usr/bin/env node
const OPIndex = require('../src/opindex')
const log = require('../src/logger')

const startBlockHeight = process.argv[2]
const endBlockHeight = process.argv[3]

const idx = OPIndex()
const start = parseInt(startBlockHeight)
const end = parseInt(endBlockHeight)

idx.indexBlocks(start, end)
.catch(e => {
  log.error(e)
})
