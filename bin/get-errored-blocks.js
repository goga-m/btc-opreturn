#!/usr/bin/env node
const OPIndex = require('../src/opindex')
const log = require('../src/logger')

const idx = OPIndex()

idx.getErroredBlocks()
.then(errored => {
  if(errored.length === 0) {
    log.info('There are no errored blocks.')
    return
  }
  log.info('Errored blocks')
  errored.forEach((b, index) => {
    log.info(`${index+1}.`, 'Block height:', b.blockheight, ' timestamp:', new Date(b.timestamp))
  })
  process.exit()
})
.catch(e => {
  log.error(e)
})
