const bitcoinjs = require('bitcoinjs-lib')
const { mapSeries } = require('async')
const _ = require('lodash/fp')

const config = require('../config')
const btc = require('./rpc')
const { saveOpMeta } = require('./db')
const { extractOpData } = require('./op_utils')
const log = require('./logger')

const IDLE_BETWEEN_TXS = _.get('index.idleBetweenTxs', config) || 1

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
  return new Promise((resolve, reject) => {
    const meta = extractOpMeta(tx)
    mapSeries(meta, (opcode, next) => {
      saveOpMeta(opcode, tx.txid, blockHash, blockHeight)
      .then(saved => next(null, saved))
    }, (err, all) =>{
      resolve(all)
    })
  })
}

/**
 * Iterate of a list of transactions, 
 * extract and save all OP_RETURN Metatags
 *
 * @name indexTxs
 * @function
 * @param {Array<Object>} txs Transactions array
 * @param {String} blockHash
 * @param {String} blockHeight
 * @returns {Promise<Object>} { totalIndexed }
 */
const indexTxs = (txs, blockHash, blockHeight) => {
  return new Promise((resolve, reject) => {
    // Parse txs array sequentially 
    mapSeries(txs, (tx, next) => {
      // Extract and save all metatags for 
      // this transaction (if found)
      saveTxOpMeta(tx, blockHash, blockHeight)
      .then(savedOps => {
        // Log all savedOps saved for a transaction
        _.forEach(op => {
          log.info('Indexing', 'BLOCK:', blockHeight, 'TXHASH:', op.txhash.substring(0, 8), 'OP_RETURN:', op.op_return)
        }, savedOps)

        // Success
        setTimeout(() => {
          next(null, savedOps.length)
        }, savedOps.length * IDLE_BETWEEN_TXS)
      })
      .catch(err => {
        log.error('Failed indexing tx:', tx.txid)
        next(err)
      })

    }, (err, all) => {
      if(err) return reject(err)
      // Resolve
      const totalIndexed = _.sum(_.compact(all))
      resolve({ success: !err, totalIndexed })
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
  return btc('getblockhash', [blockHeight])
  .then(hash => btc('getblock', [hash, 2]))
  .then(block => indexTxs(block.tx, block.hash, blockHeight))
  .then(({ totalIndexed }) => {
    log.info(`Finished ${blockHeight} Indexed ${totalIndexed} OP_RETURN records.`)
    return { totalIndexed }
  })
  .catch(err => {
    log.error(`Failed to index all OP_RETURN metadata for ${blockHeight}.`, err)
    throw err
  })
}

module.exports = {
  indexBlock
}
