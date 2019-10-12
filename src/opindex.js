const { mapSeries, timesSeries } = require('async')
const _ = require('lodash/fp')

const { saveOpReturn, getIndexedBlockHeight } = require('./db')
const { indexBlock } = require('./utils')
const btc = require('./rpc')()
const log = require('./logger')

const OPIndex = options => {
  let status = 'idle'
  let idleDuration = 10000

  /**
   * Monitor Unindexed blocks and start indexing if new blocks are found
   * or stay idle until the next block production
   *
   * @name monitor
   * @function
   */
  const monitor = async () => {
    log.info('Start monitoring')
    const lastBtcBlockHeight = await getBtcBlockHeight()
    const lastIndexedBlockHeight = await getIndexedBlockHeight()

    const missingBlockHeights = _.subtract(lastBtcBlockHeight, lastIndexedBlockHeight)

    if (_.gt(missingBlockHeights, 0)) {
      log.info(`Found ${missingBlockHeights} unindexed blocks`)
      return start(lastIndexedBlockHeight, missingBlockHeights)
    } else {
      log.info('All block OP_RETURNS are indexed')
      return idle()
    }
  }

  /**
   * Get the last block height from blockchain
   *
   * @name async
   * @function
   * @returns {Promise<Number>} Last block height
   */
  const getBtcBlockHeight = async () => {
    return btc('getblockchaininfo')
    .then(_.get('blocks'))
  }

  /**
   * start indexing
   *
   * @name start
   * @function
   * @param {Number} blockHeight Current block height
   * @param {Number} times Unindexed block's
   */
  start = (blockHeight, times) => {
    status = 'indexing'
    log.info('Start indexing', times, 'blocks')
    timesSeries(times, (n, cb) => {
      const next = _.add(n, 1) // n starts from 0
      const nextBlock = _.add(blockHeight, next)
      console.log('')
      log.info(`Starting ${nextBlock} block `)
      indexBlock(nextBlock)
      .then(() => {
        log.info(`Finished ${nextBlock} block `)
        cb()
      })
      .catch(err => {
        console.log('error', err)
      })
    }, (err, all) => {
      log.info(`Finished indexing for ${_.add(blockHeight, times)} blocks`)
    })
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

  return {
    monitor,
    getBtcBlockHeight,
    getIndexedBlockHeight,
    getStatus
  }
}

module.exports = OPIndex
