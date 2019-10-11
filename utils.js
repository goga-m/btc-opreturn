const bitcoinjs = require('bitcoinjs-lib')
const { mapSeries, timesSeries } = require('async')
const _ = require('lodash/fp')

const btc = require('./rpc')()
const { saveOpReturn, getIndexedBlockHeight } = require('./db')

/**
 * Given a transaction, extract the required opcode.
 * This is used for the OP_RETURN extraction,
 * though the opcode is provided as a parameter that defaults to OP_RETURN.
 *
 * @name extractTxOpcode
 * @function
 * @param {String} txId Transaction Id
 * @param {String} opcode Required opcode (OP_RETURN)
 * @returns {Array<String>} Array of decoded opcode values (e.g OP_RETURN opcodes)
 */
const extractTxOpcodes = (txId, opcode = 'OP_RETURN') => {
  return btc('getrawtransaction', [txId])
  .then(txHex => {
    const tx = bitcoinjs.Transaction.fromHex(txHex)
    // Map tx outputs containing the extracted & decoded opcode (OP_RETURN)
    const filteredOpReturn = _.map(out => {
      const str = bitcoinjs.script.toASM(out.script)
      const hasOpReturn = _.includes(opcode, str)
      return hasOpReturn ? extractOpcodeValue(opcode, str) : null
    }, tx.outs)
    return _.compact(filteredOpReturn)
  })
}

/**
 * Extract the opcode value (e.g OP_RETURN) from tx.output string
 *
 * @name extractOpcodeValue
 * @function
 * @param {String} opcode opcode key (OP_RETURN)
 * @param {String} string String to extract value from
 * @returns {Array<String>}  Extracted and decoded opcode values
 */
const extractOpcodeValue = (opcode, string) => {
  const data = string.split(' ')
  // Get opcode's index in array
  const indexOfKey = _.indexOf(opcode, data)
  // opcode's value position (+1)
  const valueIndex = _.add(indexOfKey, 1)
  // Decode opcode value
  // const opcodeValue = Buffer.from(data[valueIndex], 'hex')
  return data[valueIndex]
}

/**
 * Extract and save OP_RETURN Record
 * given a transaction and blockhash
 *
 * @name extractAndSave
 * @function
 * @param {String} txhash Transaction hash
 * @param {String} blockHash Block hash
 * @returns {Promise}
 */
const saveTxOpcodes = (txhash, blockHash, blockHeight) => {
  return extractTxOpcodes(txhash)
  .then(([opreturn]) => {
    // Attemp to save only when tx has opreturn
    return opreturn
      ? saveOpReturn(opreturn, txhash, blockHash, blockHeight)
      : null
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
      console.log('Checking block', block.hash)
      mapSeries(block.tx, (txhash, callback) => {
        // Save OP_RETURNS of transaction (if found)
        saveTxOpcodes(txhash, block.hash, blockHeight)
        .then(res => {
          console.log('saved', res)
          callback()
        })
        .catch(err => {
          console.log('error saving', txhash, err)
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
  extractTxOpcodes,
  indexBlock
}
