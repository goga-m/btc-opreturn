# Project description
**App to index and store bitcoin OP_RETURN data.**


The project will consist of two parts. The first would be to scan ``OP_RETURN`` metadata from the connected bitcoin node, and store them in the local database. Then, the indexed `OP_RETURN` data will be served from the following http endpoint:

`/opreturn/${opReturnData}`

where the associated transaction hash and block hash will be returned.

###### * *DRAFT1* - *This documentation is a work in progress and not in it's final state. More description will be added soon regarding the project structure. Application's described functionality is also being tested and final modifications are being added so to be ready for review and test.*

## Prerequisites
* **NodeJS** (v10 or v12).
* **bitcoind**. A running bitcoin node  with JSON-RPC.
* A running **PostgreSQL** server with `op_return` database created.<br> ****Note:**** Only the database is required ```CREATE DATABASE op_return```. The migration (see below) will create the required tables for the app.

## Installation
Download and install npm dependencies.

```
$ git clone https://github.com/goga-m/btc-opreturn.git
$ cd btc-opreturn
$ npm install
```

Run migration. This will create the required database tables (e.g. ``op_returns``)

```
$ npm run migration
```

## Configuration
You can find the configuration file in the project's root directory ``/config.js`` to adjust the parameters for the database connection, JSON-RPC client, endpoint server and indexing.



```javascript
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
    // The starting block height when monitoring.
    startingBlockHeight: 599068,
  },
  // Endpoint server settings
  server: {
    port: 3000 // https://localhost:3000/opreturn/${opReturnData}
  },
  // Testing parameters (optional)
  test: {
    // Match with coinsecrets results.
    // See Test section below for more details.
    coinsecretsMatch: [{
      // Local block 599069
      block: 599069, 
      // Should have minimum of 398 total OP_RETURNs. (398 is the total number retrieved from coinsecrets)
      shouldHave: 398 
    }] 
  }
}
```

## Project structure

### 1. Indexing
The indexing process is responsible for parsing all transactions and extracting the `OP_RETURN` metatag from the transaction output scripts.
#### Project flow
WIP
#### Extract metadata
WIP
#### Store OP_RETURN entries 
### 2. Serving OP_RETURN metadata
#### Querying
WIP

## Database schema
The database consists of two basic tables that store all the `op_return` meta information.

#### ``public.op_returns``
This table holds the records of all succesfully indexed `OP_RETURN` records.
The ``op_return`` along with ``txhash`` form a unique set mostly to be identified in re-indexing process to 
prevent duplication.
|  Column |  Type | Collation  | Nullable  | Default  |
|---|---|---|---|---|
 op_return   | bytea   |           | not null | <br>
 txhash      | text    |           | not null | <br>
 blockhash   | text    |           | not null | <br>
 blockheight | integer |           | not null | <br>

#### ``public.errored_blocks``
This table contains the block heights of the blocks that errored in the indexing process.  It is being handled by the monitoring process to restore the indexing of those blocks and remove the block reference upon successfull indexing of a block.

|  Column |  Type | Collation  | Nullable  | Default  |
|---|---|---|---|---|
 blockheight   | bytea   |           | not null | <br>

## Usage
### Indexing commands
1. Index and store in the database all OP_RETURN metatags for a particular block.
```bash
npm run index <blockHeight>
```

2. Index and store all OP_RETURN data for set of blocks.
```bash
npm run index <startingBlockHeight> <endingBlockHeight>
```

3. Index and store all OP_RETURN data for a particular transaction.
```bash
npm run tx:index <transactionHash> 
```
4. Index all blocks starting from `config.index.startingBlockHeight` (see configuration above) and automatically index new blocks generated in the blockchain. Can be deamonized to run forever.
```bash
npm run monitor
```
### Server
Run the endpoind server process to serve the `OP_RETURN` records.
```bash
npm run server
```
It will start the server at the specified port in `config.server.port`: <br>
```
http://localhost:3000/opreturn/${opReturnData} 
```
where `opReturnData` is expected to be in hex format.

## Design considerations
* **No missing OP_RETURN metadata.** <br> 
    That is to say that the extraction logic should include all possible sets & formats of `OP_RETURN` metadata. Validate that the indexing process finds all the existing `OP_RETURN` metadata entries per transaction per block. 
    Comparison could be done using http://coinsecrets.org lists. Currently no known APIs are provided from these services to be able to automate the testing process on a large set of blocks.
* **Reduce error handling complexity on indexing & storing.** <br> 
    When parsing a single block, there are many I/O operations (e.g JSON-RPC calls, database writes) that occur. Handle these errors on a higher level (block level) without blocking the indexing process.
* **Easily recover from storing errors.** <br> 
    Should be able to flag the erroring block - the block that failed to save some or all the metadata records - and reset the indexing for the particular block at a defined time.
* **Recover indexing state from external interrupts.** <br> 
    The indexing application should be able to recover indexing from where it was in case of a process block or crash from external factors. 
* **Efficiently manage resources.** <br>
    Indexing should be done as light as possible and should prioritize efficient resource consumption over speed. 
    Memory usage should be reduced as much as possible.

## Tests
1. Test that the configuration for indexing process is correct. Checks the connection with PostgreSQL database, and with the bitcoind, to ensure that indexing app is ready to run.<br>
   See `config.postgresql` and `config.rpc`.

```bash
npm test index:config
```
2. Test that server configuration is correct and that the server app operates serves on `/opreturn/${opReturnData}` endpoint.

```bash
npm test server:config
```
3. Index a predefined range of blocks from bitcoind and make sure the results (the total number of `OP_RETURN` records per block) match the ones form http://coinsecrets.org. 
   The total records from coinsecrets are checked in the website and added by hand. In case you want to add more total `OP_RETURNs` per block, you can do that in the `config.test.coinsecretsMatch` section.<br>

Example config:
```javascript
test: {
  // Match with coinsecrets results.
  coinsecretsMatch: [{
    // Local block 599069
    block: 599069, 
    // Should have minimum of 398 total OP_RETURNs. (398 is the total number retrieved from coinsecrets)
    shouldHave: 398 
  }] 
}
```
Run the command to test the results
```bash
npm test match:coinsecrets
```

## Resources
* https://en.bitcoin.it/wiki/Script
* https://bitcoin.org/en/transactions-guide#null-data
* http://coinsecrets.org
* http://coinspark.org/developers/
* http://coinspark.org/developers/metadata-format/
* https://github.com/coinspark/libraries/blob/master/javascript/coinspark.js
* https://bitcoin.org/en/release/v0.12.0#relay-any-sequence-of-pushdatas-in-opreturn-outputs-now-allowed
* https://github.com/bitcoin/bitcoin/blob/bccb4d29a8080bf1ecda1fc235415a11d903a680/src/script/script.cpp#L232
* https://github.com/bitcoin/bitcoin/issues/3313
I https://bitcointalk.org/index.php?topic=418437.0
* https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/src/script.js#L28

## Packages used
 * [express](https://www.npmjs.com/package/express) 
 * [node-postgres](https://www.npmjs.com/package/pg) 
 * [migrate](https://www.npmjs.com/package/migrate) 
 * [node-json-rpc2](https://www.npmjs.com/package/node-json-rpc2) 
 * [bitcoinjs-lib](https://www.npmjs.com/package/bitcoinjs-lib) 
 * [async.js](https://www.npmjs.com/package/async) 
 * [bunyan logger](https://www.npmjs.com/package/bunyan) 
 * [lodash fp](https://www.npmjs.com/package/lodash) 

<br><br>
