const jsonRpc = require('node-json-rpc2')

const { rpc } = require('../config')
const log = require('../src/logger')

const client = new jsonRpc.Client(rpc)

/**
 * Rpc client wrapper, to promisify the rpc calls
 *
 * @name call
 * @function
 * @param {String} method Rpc method name
 * @param {Array} params Rpc parameters array
 * @returns {Promise}
 */
const call = (method, params = []) => {
  return new Promise((resolve, reject) => {
    client.call({ method, params }, (err, res) => {
      if (err) {
        log.error(err)
        return reject(err)
      }
      resolve(res.result)
    })
  })
}

module.exports = call
