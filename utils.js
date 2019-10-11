const bitcoinjs = require('bitcoinjs-lib')
const btc = require('./rpc')()
const _ = require('lodash/fp')

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
const extractTxOpcodes= (txId, opcode = 'OP_RETURN') => {
  return btc('getrawtransaction', [txId])
  .then(txHex => {
    const tx = bitcoinjs.Transaction.fromHex(txHex)
    // Map tx outputs containing the extracted & decoded opcode (OP_RETURN)
    const filteredOpReturn =  _.map(out => {
      const str = bitcoinjs.script.toASM(out.script) 
      const hasOpReturn = _.includes(opcode, str)
      return hasOpReturn ?  extractOpcodeValue(opcode, str) : null
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
  const opcodeValue = Buffer.from(data[valueIndex], 'hex')
  return opcodeValue.toString()
}

module.exports = {
  extractTxOpcodes
}
