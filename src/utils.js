const bitcoinjs = require('bitcoinjs-lib')
const { mapSeries, timesSeries } = require('async')
const _ = require('lodash/fp')

const btc = require('./rpc')()
const { saveOpReturn, getIndexedBlockHeight } = require('./db')
const log = require('./logger')

/**
 * Check if outputs script is an OP_RETURN
 *
 * The output script for CoinSpark metadata begins with the OP_RETURN opcode (0x6A) 
 * followed by a length byte between 0 and 40 (0x00 … 0x28). 
 * This is the pattern followed by all OP_RETURN scripts
 *
 * See: http://coinspark.org/developers/metadata-format/
 *
 * @name isOpReturn
 * @function
 * @param {Array} script Script Buffer
 * @returns {Boolean}
 */
const isOpReturn = script => {
  return script.length > 2 && script[0] == 0x6a && script[1] > 0 
}

/**
 * Given a transaction, extract OP_RETURN metadata
 *
 * @name extractTxOpcode
 * @function
 * @param {String} txId Transaction Id
 * @returns {Array<String>} Array of decoded opcode values 
 */
const extractOpMeta = txId => {
  return btc('getrawtransaction', [txId])
  .then(txHex => {
    const tx = bitcoinjs.Transaction.fromHex(txHex)
    // Map tx outputs containing the extracted & decoded opcode (OP_RETURN)
    const scriptPubKeys = _.map('script', tx.outs)

    const meta = _.map(out => {
      return isOpReturn(out.script)
        ? out.script.slice(2).toString('utf8') 
        : null
    }, tx.outs)
    return _.compact(meta)
  })
}

/**
 * Extract and save OP_RETURN metadata for
 * a transaction.
 *
 * @name saveOpMeta
 * @function
 * @param {String} txhash Transaction hash
 * @param {String} blockHash Block hash
 * @param {Number} blockHeight Block Height
 * @returns {Promise}
 */
const saveOpMeta = (txhash, blockHash, blockHeight) => {
  return extractOpMeta(txhash)
  .then(opcodes => {
    return new Promise((resolve) => {
      mapSeries(opcodes, (opcode, next) => {
        saveOpMeta(opcode, txhash, blockHash, blockHeight)
        .then(saved => next(null, saved))
      }, (err, all) =>{
        resolve(all)
      })
    })
  })
}

/**
 * Save sequentially all OP_RETURNS given a blockHeight
 *
 * This will fetch the block of the blockHeight
 * And then iterate over block's transaction to
 * save sequentially found OP_RETURNS of the transactions.
 *
 * @name indexBlock
 * @function
 * @param {Number} blockHeight Block height to save for
 * @returns {Promise}
 */
const indexBlock = blockHeight => {
  return new Promise((resolve, reject) => {
    btc('getblockhash', [blockHeight])
    .then(hash => btc('getblock', [hash]))
    .then(block => {
      mapSeries(block.tx, (txhash, callback) => {
        // Save OP_RETURNS of transaction (if found)
        saveTxOpcodes(txhash, block.hash, blockHeight)
        .then(opreturn => {
          if (opreturn) {
            log.info('Indexing', blockHeight, txhash, opreturn.op_return_utf)
            // log.info(opreturn.op_return_utf)
          }
          callback()
        })
        .catch(err => {
          log.error('Failed saving of ', err)
          // TODO: handle
        })
      }, resolve)
    })
    .catch(err => {
      console.log('reject', err)
    })
  })
}

module.exports = {
  indexBlock
}
