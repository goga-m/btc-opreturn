module.exports = {
  // Database settings
  postgresql: {
    user: 'postgres',
    host: 'localhost',
    database: 'op_return',
    password: 'psql',
    port: 5432
  },
  // JSON-RPC settings (bitcoind)
  rpc: {
    protocol: 'http', // Optional. Will be http by default
    host: '127.0.0.1', // Will be 127.0.0.1 by default
    user: 'rpcuser', // Optional, only if auth needed
    password: 'rpcpassword', // Optional. Mandatory if user is passed.
    port: 8339
  },
  // Indexing settings
  index: {
    startingBlockHeight: 599068
  },
  // Endpoint server settings
  server: {
    port: 3000 // https://localhost:3000/opreturn/${opReturnData}
  }
}