const Pool = require('pg').Pool
const { postgresql } = require('./config')
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
  const queryString = `SELECT * FROM op_returns WHERE op_return = '${opReturnData}'`
  return db.query(queryString)
  .then(({rows}) => rows[0])
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
const saveOpReturn = (str, txhash, blockhash) => {
  const insertNewQuery = 'INSERT INTO op_returns(op_return, txhash, blockhash) VALUES($1, $2, $3) RETURNING op_return, txhash, blockhash'
  return db.query(insertNewQuery, [str, txhash, blockhash])
  .then(({rows}) => rows[0])
}

module.exports = {
  db,
  queryByOpReturn,
  saveOpReturn
}
