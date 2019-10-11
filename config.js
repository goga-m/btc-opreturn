// Use rpc config as a Node module in case env variables are needed  (dotenv)
module.exports = {
  postgresql: {
    user: 'postgres',
    host: 'localhost',
    database: 'op_return',
    password: 'psql',
    port: 5432,
  },
  rpc: {
    protocol: 'http', // Optional. Will be http by default
    host: '127.0.0.1', // Will be 127.0.0.1 by default
    user: 'rpcuser', // Optional, only if auth needed
    password: 'rpcpassword', // Optional. Can be named 'pass'. Mandatory if user is passed.
    port: 8339
  }
}