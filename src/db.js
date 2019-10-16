const _ = require('lodash/fp')
const Pool = require('pg').Pool

const { postgresql } = require('../config')
const { extractOpData } = require('../src/op_utils')

const db = new Pool(postgresql)

/**
 * Format OP_RETURN JSON output
 *
 * @name formatOpReturnOutput
 * @function
 * @returns {Object}
 */
const formatOpReturnOutput = opr => {
  return {
    txhash: opr.txhash,
    blockhash: opr.blockhash,
    op_return: Buffer.from(opr.op_return_long, 'hex').toString('utf8')
  }
}

/**
 * Given an opReturnData String,
 * query the op_returns table and fetch the matched record.
 *
 * @name queryByOpReturn
 * @function
 * @param {String} opReturnDataHex opReturnDataHex querystring (String in hex format)
 * @returns {Promise<Object>} First occurence result
 */
const queryByOpReturn = opReturnDataHex => {
  // Remove any opcodes if included
  const dataOnly = extractOpData(Buffer.from(opReturnDataHex, 'hex')) || Buffer.from(opReturnDataHex, 'hex')
  const encoded = dataOnly.toString('hex')
  const queryString = 'SELECT * FROM op_returns WHERE op_return = $1 OR op_return_long = $1'
  return db.query(queryString, [encoded])
  .then(({ rows }) => _.map(formatOpReturnOutput, rows))
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
  const sliced = meta.slice(0, 78).toString('hex')
  const full = meta.toString('hex')
  const upsertQuery = 'INSERT INTO op_returns(op_return, op_return_long ,txhash, blockhash, blockheight) VALUES($1, $2, $3, $4, $5) ON CONFLICT (op_return_long, txhash) DO UPDATE SET op_return = $1, op_return_long = $2 RETURNING op_return, op_return_long, txhash, blockhash, blockheight'
  return db.query(upsertQuery, [sliced, full, txhash, blockhash, blockHeight])
  .then(({ rows }) => rows[0])
  .then(formatOpReturnOutput)
}

/**
 * Select the last block height from op_returns
 * that is not in errored blocks.
 *
 * @name getIndexedBlockHeight
 * @function
 * @returns {Promise<Number>} Last used block height number
 */
const getIndexedBlockHeight = () => {
  const queryStringAny = 'SELECT blockheight FROM op_returns ops WHERE NOT EXISTS (SELECT FROM errored_blocks e WHERE e.blockheight = ops.blockheight) ORDER BY blockheight DESC LIMIT 1'
  return db.query(queryStringAny)
  .then(({ rows }) => _.get('[0].blockheight', rows))
  .then(height => height || 0)
}

/**
 * Save errored block's height in errored_blocks table.
 *
 * @name saveErroredBlock
 * @function
 * @param {Number} blockHeight Block height to save
 * @returns {Promise<Number>} Last used block height number
 */
const saveErroredBlock = blockHeight => {
  const queryString = 'INSERT INTO errored_blocks(blockheight, timestamp) VALUES($1, $2) ON CONFLICT (blockheight) DO UPDATE SET timestamp = $2'
  return db.query(queryString, [blockHeight, new Date()])
}

/**
 * Removed from errored table.
 *
 * @name removeFromErrored
 * @function
 * @param {Number} blockHeight Block height to delete
 * @returns {Promise<Number>}
 */
const removeFromErrored = blockHeight => {
  const removeString = 'DELETE FROM errored_blocks where blockheight = $1'
  return db.query(removeString, [blockHeight])
}

/**
 * Get all errored blocks.
 *
 * @name getErroredBlocks
 * @function
 * @returns {Promise<Array>} Array Of blockHeights that errored
 */
const getErroredBlocks = () => {
  const queryString = 'SELECT * FROM errored_blocks ORDER BY blockheight ASC'
  return db.query(queryString)
  .then(({ rows }) => rows)
}

/**
 * Get a specific errored block from db.
 *
 * @name getErroredBlock
 * @function
 * @returns {Promise<Array>} Array Of blockHeights that errored
 */
const getErroredBlock = (blockHeight) => {
  const queryString = 'SELECT * FROM errored_blocks WHERE blockheight = $1'
  return db.query(queryString, [blockHeight])
  .then(({ rows }) => rows)
}

module.exports = {
  db,
  queryByOpReturn,
  saveOpMeta,
  getIndexedBlockHeight,
  saveErroredBlock,
  getErroredBlocks,
  removeFromErrored,
  getErroredBlock
}
