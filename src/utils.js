const bitcoinjs = require('bitcoinjs-lib')
const { mapSeries, timesSeries } = require('async')
const _ = require('lodash/fp')

const btc = require('./rpc')
const { saveOpMeta, getIndexedBlockHeight } = require('./db')
const { extractOpData } = require('./op_utils')
const log = require('./logger')

/**
 * Parses the output scripts, 
 * extracts the OP_RETURN metadata.
 *
 * Will return an array of Buffers where
 * each buffer contains only the OP_RETURN data, 
 * excluding all opcodes. Empty array if not found.
 *
 * @name extractOpMeta
 * @function
 * @param {Object} tx Transaction object
 * @returns {Array<String>} Array of decoded opcode values 
 */
const extractOpMeta = tx => {
  const scriptPubKeys = _.map('scriptPubKey', tx.vout)
  const meta = _.map(out => {
    const script = Buffer.from(out.hex, 'hex')
    return extractOpData(script)
  }, scriptPubKeys)
  return _.compact(meta)
}

/**
 * Extract and save OP_RETURN metadata for
 * a transaction.
 *
 * @name saveTxOpMeta
 * @function
 * @param {Object} tx Transaction object
 * @param {String} blockHash Block hash
 * @param {Number} blockHeight Block Height
 * @returns {Promise}
 */
const saveTxOpMeta = (tx, blockHash, blockHeight) => {
  return new Promise((resolve) => {
    const meta = extractOpMeta(tx)
    mapSeries(meta, (opcode, next) => {
      saveOpMeta(opcode, tx.hash, blockHash, blockHeight)
      .then(saved => next(null, saved))
    }, (err, all) =>{
      resolve(all)
    })
  })
}

/**
 * Save sequentially all OP_RETURNS given a blockHeight
 *
 * This will fetch the block of the blockHeight
 * And then iterate over block's transactions to
 * save sequentially all found OP_RETURNS of the transactions.
 * 
 * The errored OP_RETURN metadata are assumed that will
 * be handled by the caller.
 *
 * @name indexBlock
 * @function
 * @param {Number} blockHeight Block height to save for
 * @returns {Promise<Object>} Return the total meta indexed and the errored
 */
const indexBlock = blockHeight => {
  return new Promise((resolve, reject) => {
    // Errored metadata from operations
    const errored = []
    btc('getblockhash', [blockHeight])
    .then(hash => btc('getblock', [hash, 2]))
    .then(block => {
      // Index and Store each transaction's sequentially
      mapSeries(block.tx, (txhash, next) => {
        // Save all metatags of this transaction (if found)
        saveTxOpMeta(txhash, block.hash, blockHeight)
        .then(opreturns => {
          // Log all opreturns saved for a transaction
          _.forEach(op => {
            log.info('Indexing', 'BLOCK:', blockHeight, 'TXHASH:', op.txhash.substring(0, 8), 'OP_RETURN:', op.op_return)
          }, opreturns)
          // Success
          next(null, opreturns.length)
        })
        .catch(err => {
          log.error('Indexing ', err)
          // TODO: handle
        })

      }, (err, all) => {
        // all is an array tha contains the total metadata entries saved per transaction
        const totalIndexed = _.sum(_.compact(all))
        // Returned totalIndexed and errored ones
        log.info(`Finished ${blockHeight} Indexed ${totalIndexed} OP_RETURN records.`)
        resolve({ totalIndexed, errored })
      })
    })
    .catch(reject)
  })
}

module.exports = {
  indexBlock
}
