const { mapSeries, timesSeries } = require('async')
const _ = require('lodash/fp')

const { saveOpReturn, getIndexedBlockHeight } = require('./db')
const { indexBlock } = require('./utils')
const btc = require('./rpc')()

const OPIndex = options => {
  let status = 'idle'
  let idleDuration = 2000

  /**
   * Monitor Unindexed blocks and start indexing if new blocks are found
   * or stay idle until the next block production
   *
   * @name monitor
   * @function
   */
  const monitor = async () => {
    const lastBtcBlockHeight = await getBtcBlockHeight()
    const lastIndexedBlockHeight = await getIndexedBlockHeight()

    const missingBlockHeights = _.subtract(lastBtcBlockHeight, lastIndexedBlockHeight)

    if (_.gt(missingBlockHeights, 0)) {
      return start(lastIndexedBlockHeight, missingBlockHeights)
    } else {
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
    timesSeries(times, (n, cb) => {
      const next = _.add(n, 1) // n starts from 0
      const nextBlock = _.add(blockHeight, next)
      console.log('Indexing block', nextBlock)
      indexBlock(nextBlock)
      .then(() => {
        console.log('finished')
        cb()
      })
      .catch(err => {
        console.log('error', err)
      })
    }, (err, all) => {
      console.log('finished', _.add(blockHeight, times))
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
