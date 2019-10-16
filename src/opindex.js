const { mapSeries, timesSeries } = require('async')
const _ = require('lodash/fp')

const config = require('../config')
const db = require('./db')
const { indexBlock } = require('./utils')
const btc = require('./rpc')
const log = require('./logger')

const IDLE_BETWEEN_BLOCKS = _.get('index.idleBetweenBlocks', config) || 1

const OPIndex = options => {
  let status = 'idle'
  let idleDuration = 10000

  /**
   * Get the last block height from blockchain
   *
   * @name getBtcBlockHeight
   * @function
   * @returns {Promise<Number>} Last block height
   */
  const getBtcBlockHeight = async () => {
    return btc('getblockchaininfo')
    .then(_.get('blocks'))
  }
  
  /**
   * Given a range of blocks heights, 
   * start indexing sequentially all their OP_RETURN metadata.
   *
   * @name indexBlocks
   * @function
   * @param {Number/String} startBlockHeight Block to start indexing
   * @param {Number/String} endBlockHeight  Block to stop indexing (including)
   */
  const indexBlocks = async (startBlockHeight, endBlockHeight) => {
    let start = _.parseInt(10, startBlockHeight)
    let end = endBlockHeight ? _.parseInt(10, endBlockHeight) : start

    const times = _.add(_.subtract(end, start), 1)
    // Start indexing
    return new Promise((resolve, reject) => {
      timesSeries(times, (idx, next) => {
        // idx starts from 0, will include startingBlock
        const nextBlock = _.add(start, idx) 
        indexSingleBlock(nextBlock)
        .then(() => {
          setTimeout(() => next(), IDLE_BETWEEN_BLOCKS)
        })
        .catch(err => {
          // Attempt to index once more. If it 
          // failed, continue the list, and it will 
          // be handled later.
          log.info('Attempt to re-index.', nextBlock)
          indexSingleBlock(nextBlock)
          .then(() => {
            setTimeout(() => next(), IDLE_BETWEEN_BLOCKS)
          })
          .catch(err => {
            log.info(`Failed again to index: ${ nextBlock}. Continuing`)
            next()
          })
        })
      }, res => {
        resolve()
      })
    })
  }

  /**
   * Index a given list of blocks 
   * (Array of block heights)
   *
   * @name async
   * @function
   * @param {Array<Number>} blocks Blocks to index
   * @returns {Promise<>}
   */
  const indeBlockList = async (blocks) => {
    // Start indexing
    return new Promise((resolve, reject) => {
      mapSeries(blocks, (blockHeight, next) => {
        // idx starts from 0, will include startingBlock
        indexSingleBlock(blockHeight)
        .then(() => {
          setTimeout(() => next(), IDLE_BETWEEN_BLOCKS)
        })
        .catch(err => {
          // Attempt to index once more. If it 
          // failed, continue the list, and it will 
          // be handled later.
          log.info('Attempt to re-index.', nextBlock)
          indexSingleBlock(nextBlock)
          .then(() => {
            setTimeout(() => next(), IDLE_BETWEEN_BLOCKS)
          })
          .catch(err => {
            log.info(`Failed again to index: ${ nextBlock}. Continuing`)
            next()
          })
        })
      }, res => {
        resolve()
      })
    })
  }

  /**
   * Scan, index and store OP_RETURN metadata 
   * for all the transactions of a requested block.
   *
   * Returns an report object that holds the total indexed records.
   *
   * On succesfull indexing block height will be removed
   * from errored blocks (if it existed there).
   *
   * On error, the block height along with the timestamp
   * will be saved in the errored_blocks table to be handled at other time.
   *
   * @name indexSingleBlock
   * @function
   * @param {Number} blockHeignt Block number to scan and store
   * @returns {Promise<Object>} { totalIndexed: Number, errored: Array }
   */
  const indexSingleBlock = async blockHeight => {
    if(!blockHeight) {
      log.error('Missing block height parameter')
      return Promise.reject()
    }

    log.info('Start indexing block', blockHeight, '...')
    db.saveErroredBlock(blockHeight)
    .then(() => indexBlock(blockHeight))
    .then(() => db.removeFromErrored(blockHeight))
    .catch(err => {
      return db.saveErroredBlock(blockHeight)
      .then(() => {
        throw new Error('Block failed to index all transactions')
      })
    })
  }

  const getErroredBlocks = async () => {
    return db.getErroredBlocks()
  }


  /**
   * idle
   *
   * @name idle
   * @function
   */
  const idle = () => {
    status = 'idle'
    log.info('Going idle')
    setTimeout(() => {
      monitor()
    }, idleDuration)
  }

  // API
  return {
    getBtcBlockHeight,
    getIndexedBlockHeight: db.getIndexedBlockHeight,
    indexBlock: indexSingleBlock,
    indexBlocks,
    // Expose rpc commands
    rpc: btc,
    getErroredBlocks
  }
}

module.exports = OPIndex
