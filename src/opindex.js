const { mapSeries, timesSeries } = require('async')
const _ = require('lodash/fp')

const { saveOpReturn, getIndexedBlockHeight } = require('./db')
const { indexBlock } = require('./utils')
const btc = require('./rpc')
const log = require('./logger')

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
  
  const isValidBlockHeight = blockHeight => {
    return btc('getblockhash', [blockHeight])
    .then(() => true)
    .catch(() => false)
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
  indexBlocks = async (startBlockHeight, endBlockHeight) => {
    let start = _.parseInt(10, startBlockHeight)
    let end = endBlockHeight ? _.parseInt(10, endBlockHeight) : start

    if(_.isNaN(start)) 
      return Promise.reject('Start block is not valid.')

    // Validate block heights
    const isValidStartHeight =  await isValidBlockHeight(start)
    const isValidEndHeight =  await isValidBlockHeight(end)
    // Start is always required
    if(!isValidStartHeight) 
      return Promise.reject('Start block heigth does not exist.')

    // Start is always required
    if(!_.isNaN(end) && !isValidEndHeight) 
      return Promise.reject('End block heigth does not exist.')

    // end =  ? _.parseInt(10, endBlockHeight) : start

    if(_.gt(start, end)) 
      return Promise.reject('Ending block should be greater than starting block.')

    const times = _.add(_.subtract(end, start), 1)
    // Start indexing
    return new Promise((resolve, reject) => {
      timesSeries(times, (idx, next) => {
        // idx starts from 0, will include startingBlock
        const nextBlock = _.add(start, idx) 
        indexSingleBlock(nextBlock)
        .then(() => {

          next()
          // TODO: Handle errored
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
   * Returns an report object that holds the total indexed records,
   * and a list of errored records
   *
   * @name indexSingleBlock
   * @function
   * @param {Number} blockHeignt Block number to scan and store
   * @returns {Promise<Object>} { totalIndexed: Number, errored: Array }
   */
  indexSingleBlock = async blockHeight => {
    if(!blockHeight) {
      log.error('Missing block height parameter')
      return Promise.reject()
    }

    log.info('Start indexing block', blockHeight, '...')
    return indexBlock(blockHeight)
  }


  /**
   * idle
   *
   * @name idle
   * @function
   */
  idle = () => {
    status = 'idle'
    log.info('Going idle')
    setTimeout(() => {
      monitor()
    }, idleDuration)
  }

  /**
   * Return current status (indexing, idle)
   *
   * @name getStatus
   * @function
   */
  getStatus = () => {
    return status
  }
 
  // API
  return {
    getBtcBlockHeight,
    getIndexedBlockHeight,
    getStatus,
    indexBlock: indexSingleBlock,
    indexBlocks,
    // Expose rpc commands
    rpc: btc
  }
}

module.exports = OPIndex
