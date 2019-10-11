const _ = require('lodash/fp')
const Pool = require('pg').Pool

const { postgresql, index } = require('../config')
const db = new Pool(postgresql)

/**
 * Given an opReturnData String,
 * query the op_returns table and fetch the matched record.
 *
 * @name queryByOpReturn
 * @function
 * @param {String} opReturnData opReturnData querystring
 * @returns {Promise<Object>} First occurence result
 */
const queryByOpReturn = opReturnData => {
  const queryString = `SELECT * FROM op_returns WHERE encode(op_return, 'hex')=encode('${opReturnData}', 'hex')`
  return db.query(queryString)
  .then(({ rows }) => rows[0])
}

/**
 * Save OP_RETURN data
 *
 * @name saveOpReturn
 * @function
 * @param {String} str OP_RETURN string data (UTF-8)
 * @param {String} txhash Transaction hash the OP_RETURN is associated with
 * @param {String} blockhash Block hash that OP_RETURN was found in
 * @returns {Promise<Object>} Saved record
 */
const saveOpReturn = (str, txhash, blockhash, blockHeight) => {
  const insertNewQuery = 'INSERT INTO op_returns(op_return, txhash, blockhash, blockheight) VALUES($1, $2, $3, $4) RETURNING op_return, txhash, blockhash, blockheight'
  return db.query(insertNewQuery, [str, txhash, blockhash, blockHeight])
  .then(({ rows }) => rows[0])
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
  saveOpReturn,
  getIndexedBlockHeight
}
