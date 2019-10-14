const _ = require('lodash/fp')
const Pool = require('pg').Pool

const { postgresql, index } = require('../config')
const db = new Pool(postgresql)

const isBase64 = str =>  /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/.test(str)
const isHex = str =>  (str.match(/([0-9]|[a-f])/gim ) || []).length === str.length

/**
 * Given an opReturnData String,
 * query the op_returns table and fetch the matched record.
 *
 * @name queryByOpReturn
 * @function
 * @param {String} opReturnData opReturnData querystring (String in hex format)
 * @returns {Promise<Object>} First occurence result
 */
const queryByOpReturn = opReturnData => {
  const encoded = Buffer.from(opReturnData).toString()
  const queryString = 'SELECT * FROM op_returns WHERE op_return = $1'
  return db.query(queryString, [encoded])
  // Format
  .then(({ rows }) => {
    return _.map(row => {
      // Format Output as hex string
      const opReturnHex = Buffer.from(row.op_return, 'hex').toString('utf8')
      return _.assign(row, {
        op_return: opReturnHex
      })
    }, rows)
  })
}

/**
 * Save OP_RETURN data
 *
 * Performs upsert operation.
 * A unique op_return record is the combination of 
 * op_return and txhash
 *
 * 
 *
 * @name saveOpMeta
 * @function
 * @param {Array} meta OP_RETURN (Hex Buffer)
 * @param {String} txhash Transaction hash the OP_RETURN is associated with
 * @param {String} blockhash Block hash that OP_RETURN was found in
 * @returns {Promise<Object>} Saved record
 */
const saveOpMeta = (meta, txhash, blockhash, blockHeight) => {
  const encoded = meta.toString('hex')
  const upsertQuery = 'INSERT INTO op_returns(op_return, txhash, blockhash, blockheight) VALUES($1, $2, $3, $4) ON CONFLICT (op_return, txhash) DO UPDATE SET op_return = $1 RETURNING op_return, txhash, blockhash, blockheight '
  return db.query(upsertQuery, [encoded, txhash, blockhash, blockHeight])
  .then(({ rows }) => rows[0])
  .then(row => {
    // Format op_return output to hex string
    const opReturn = Buffer.from(row.op_return, 'hex').toString('utf8')
    return _.assign(row, { op_return: opReturn })
  })
}

/**
 * Get last OP_RETURNS's Block height that is saved in db.
 * If op_returns table is empty, return default starting block height from config
 *
 * @name getIndexedBlockHeight
 * @function
 * @returns {Promise<Number>} Last used block height number
 */
const getIndexedBlockHeight = () => {
  // Subtract default by 1 so that the indexing
  // would start on the startingBlockHeight (e.g 500000), and thus not be skipped
  const lastUnusedBlockHeight = _.subtract(index.startingBlockHeight, 1)

  const queryString = 'SELECT * FROM op_returns ORDER BY blockheight DESC LIMIT 1'
  return db.query(queryString)
  .then(_.getOr(lastUnusedBlockHeight, 'rows[0].blockheight'))
}

module.exports = {
  db,
  queryByOpReturn,
  saveOpMeta,
  getIndexedBlockHeight
}
