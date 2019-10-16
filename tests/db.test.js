const db = require('../src/db')
const { rpc } = require('../config')

describe('Connection to database', () => {
  // The assertion for a promise must be returned.
  test('Table op_return should exist', () => {
    expect.assertions(1)
    return db.queryByOpReturn('6a4c5000087bdd0002be6ca950708cd9640ff0d2c8c4a2344007dfd6706dc12870e354e6b49f735da62d7f1be1603ee8a21a2b9134f6585da6cd3607013fb655f381678525e667a5accf523515c4dac74a')
    .then(data => {
      expect(data).toBeDefined()
      return true
    })
  })

  test('Table errored_blocks should exist', () => {
    expect.assertions(1)
    return db.getErroredBlocks()
    .then(data => {
      expect(data).toBeDefined()
      return true
    })
  })
})
