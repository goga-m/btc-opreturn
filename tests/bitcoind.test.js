const btcd = require('../src/rpc')
const { rpc } = require('../config')

describe('Connection to bitcoind', () => {
  // The assertion for a promise must be returned.
  test(`Should connect to local node: ${rpc.protocol}://${rpc.host}:${rpc.port}`, () => {
    expect.assertions(2)
    return btcd('getblockchaininfo')
    .then(data => {
      expect(data).toBeDefined()
      expect(data).toHaveProperty('headers')
      return true
    })
  })

  test('bitcoind has finished IBD', () => {
    expect.assertions(1)
    return btcd('getblockchaininfo')
    .then(data => {
      expect(data.blocks).toEqual(data.headers)
      return true
    })
  })
})
