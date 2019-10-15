const bitcoinjs = require('bitcoinjs-lib')

// All opcodes ('bitcoin-ops')
const OPS =  bitcoinjs.script.OPS

/**
 * Quick chech if the script has the OP_RETURN
 * prefix.
 *
 * @name hasOpPrefix
 * @function
 * @param {Buffer} script Script Buffer
 * @returns {Boolean}
 */
const hasOpPrefix = script => {
  return script.length > 2 && script[0] == 0x6a && script[1] > 0 
}
/**
 * See https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/src/script.js#L28
 *
 * @name asMinimalOP
 * @function
 * @param {Buffer} buffer
 * @returns {Boolean}
 */
const asMinimalOP = buffer => {
  if (buffer.length === 0) return OPS.OP_0
  if (buffer.length !== 1) return
  if (buffer[0] >= 1 && buffer[0] <= 16) return OPS.OP_RESERVED + buffer[0]
  if (buffer[0] === 0x81) return OPS.OP_1NEGATE
}

/**
 * Check the script is an OP_RETURN, 
 * and extract the data buffer only (without the opcodes).
 *
 * This is a modification of bitcoinjs.script.toASM that
 * removes the opcodes from the script and returns only the data
 * as a Buffer.
 *
 * See: https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/src/script.js#L118
 *
 * @name extractOpData
 * @function
 * @param {Buffer} script Output script
 * @returns {Buffer} Extracted OP_RETURN data buffer
 */
const extractOpData = scriptPubKey => {
  // First quick check if the script starts with OP_RETURN (0x6a) before decompiling (performance)
  if(!hasOpPrefix(scriptPubKey)) return null
  // Ensure 83 bytes length when size is > 80
  const script = ensureLength(scriptPubKey)
  // Chunks 
  const chunks = bitcoinjs.script.decompile(script)
  // Check if push data read failed
  if(!chunks) return null
  // Decompiled successfully, is OP_RETURN script. 
  // Remove opcodes and get only the data buffer.
  const data =  chunks.find(chunk => Buffer.isBuffer(chunk) && !asMinimalOP(chunk))

  // Remove extra bytes after decompile
  if(scriptPubKey.length > 80 && scriptPubKey.length < 83) {
    const pad = 83 - scriptPubKey.length 
    return data.slice(0, data.length - pad)
  }

  return data
}

// TODO: review this
const ensureLength = script => {
  if(script.length === 81) {
    return Buffer.concat([script, Buffer.from('0000', 'hex')])
  }
  if(script.length === 82) {
    return Buffer.concat([script, Buffer.from('00', 'hex')])
  }
  return script
}

module.exports = {
  extractOpData
}

