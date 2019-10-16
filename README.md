# Project description
**App to index and store bitcoin `OP_RETURN`** data.


The project will consist of two parts. The first would be to scan ``OP_RETURN`` metadata from the connected bitcoin node, and store them in the local database. Then, the indexed `OP_RETURN` data will be served from the following http endpoint:

`/opreturn/${opReturnData}`

where the associated transaction hash and block hash will be returned.

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
    port: 8332
  },
  // Indexing settings
  index: {
    // The starting block height when monitoring.
    startingBlockHeight: 599068,
    // Idle time between transactions
    idleBetweenTxs: 2, // ms
    // Idle time between blocks
    idleBetweenBlocks: 1000 // ms
  },
  // Endpoint server settings
  server: {
    port: 3000 // https://localhost:3000/opreturn/${opReturnData}
  }
}
```

## Overview

### 1. Indexing
The indexing process is responsible for parsing all transactions and extracting the `OP_RETURN` metatag from the transaction output scripts.

The basic unit that the indexing process operates is the block. It can index and store all `OP_RETURN`  metadata for a single block, for a set of blocks or run in `monitoring` mode  where it looks for new blocks and index them automatically (See more on [Monitoring](https://github.com/goga-m/btc-opreturn#usage)).

#### Extract metadata & Store `OP_RETURN` entries 
The indexing process will iterate over each output of the transaction to filter out those that have `OP_RETURN` metadata. It will then parse the `scriptPubKey` and will extract the data only by decompiling and removing any sequence of all the available opcodes.

The indexing application can be used in different ways by using the available commands as described below (in [Usage](https://github.com/goga-m/btc-opreturn#usage))




### 2. Serving ``OP_RETURN`` metadata
#### Querying
When quering for indexed `OP_RETURN` entries, several requirements should be met in order to be able to correctly identify the `OP_RETURN` metadata from the query string and locate it in the database. 

The encoding of the querystring is `hex` and it can support the following formats:
 * It can be a full `scriptPubKey` format (83 bytes) with all the opcodes included. <br>
 For example as they are formatted in blockstream's `SCRIPTPUBKEY (HEX)` section [here](https://blockstream.info/tx/c89bebdcaf9ee70d0dbb5d8e5e94349ff4446a396097716cb1bdd4ccd29f7208?expand). <br>
 ```
   6a4c5000087bdd0002be6ca950708cd9640ff0d2c8c4a2344007dfd6706dc12870e354e6b49f735da62d7f1be1603ee8a21a2b9134f6585da6cd3607013fb655f381678525e667a5accf523515c4dac74a78cf
 ```
* It can also be only the metadata string (without the opcodes)<br>
  As it is formatted for example in blockchain.com [here.](https://www.blockchain.com/btc/tx/c89bebdcaf9ee70d0dbb5d8e5e94349ff4446a396097716cb1bdd4ccd29f7208?show_adv=true)

 ```
   00087bdd0002be6ca950708cd9640ff0d2c8c4a2344007dfd6706dc12870e354e6b49f735da62d7f1be1603ee8a21a2b9134f6585da6cd3607013fb655f381678525e667a5accf523515c4dac74a78cf
 ```
* 81 max byte `scriptPubKey` is supported as well, as they are formatted in coinsecrets.org ('raw' format) where the last bytes are excluded.
  See [here](http://coinsecrets.org/?to=599585).
 ```
   6a4c5000087bdd0002be6ca950708cd9640ff0d2c8c4a2344007dfd6706dc12870e354e6b49f735da62d7f1be1603ee8a21a2b9134f6585da6cd3607013fb655f381678525e667a5accf523515c4dac74a
 ```
The querystring will be processed and decompiled, and the server will return the indexed matches found in the database.

**Note**: The postgresql query uses the equality operator and not `LIKE` or `ILIKE`, so that the result of the query will be the same `scriptPybKey` metadata and not a similar one.

**Example**

The following url:

 ```
   http://localhost:3000/opreturn/6a4c5000087bdd0002be6ca950708cd9640ff0d2c8c4a2344007dfd6706dc12870e354e6b49f735da62d7f1be1603ee8a21a2b9134f6585da6cd3607013fb655f381678525e667a5accf523515c4dac74a
 ```
 Should return:

 ```json
[
  {
    "txhash": "c89bebdcaf9ee70d0dbb5d8e5e94349ff4446a396097716cb1bdd4ccd29f7208",
    "blockhash": "00000000000000000005a1ee0ad4d9a9a7c234805f8b135009155b2ca7c53187",
    "op_return": "00087bdd0002be6ca950708cd9640ff0d2c8c4a2344007dfd6706dc12870e354e6b49f735da62d7f1be1603ee8a21a2b9134f6585da6cd3607013fb655f381678525e667a5accf523515c4dac74a78cf"
  }
]
 ```
Where the `op_return` field contains only the data of the `scriptPuKey` without the opcodes.

If no `OP_RETURN` records are found,an empty array will be returned.

## Database schema
The database consists of two basic tables that store all the `op_return` meta information.

#### ``public.op_returns``
This table holds the records of all succesfully indexed `OP_RETURN` records.
The ``op_return`` along with ``txhash`` form a unique set mostly to be identified in re-indexing process to 
prevent duplication.

|  Column |  Type | Collation  | Nullable  | Default  |
|---|---|---|---|---|
 op_return   | bytea   |           | not null | <br>
 op_return_long   | bytea   |           | not null | <br>
 txhash      | text    |           | not null | <br>
 blockhash   | text    |           | not null | <br>
 blockheight | integer |           | not null | <br>

#### ``public.errored_blocks``
This table contains the block heights of the blocks that errored in the indexing process.  It is being handled by the monitoring process to restore the indexing of those blocks and remove the block reference upon successfull indexing of a block.

|  Column |  Type | Collation  | Nullable  | Default  |
|---|---|---|---|---|
 blockheight   | bytea   |           | not null | <br>
 timestamp   | timestamp   |           | not null | <br>

## Usage
### Indexing commands
Index and store in the database all `OP_RETURN` metatags for a particular block.
```bash
npm run index <blockHeight>
```

Index and store all OP_RETURN data for set of blocks.
```bash
npm run index <startingBlockHeight> <endingBlockHeight>
```
When running indexing for multiple blocks, in each iteration, the process will check (only once) if there are any errored blocks to re-index them again before continuing to the next block. 

**Monitoring**

Index all blocks starting from `<startingBlockHeight>` or else `config.index.startingBlockHeight` (see configuration above) and automatically index new blocks generated in the blockchain. Can be deamonized to run forever.
```bash
npm run monitor <startingBlockHeight> # Will use config.index.startingBlockHeight if not provided.
```
The monitoring flow will operate based on the following logic:
* Checks the starting block (either provided, or from config) and the last generated block height from bitcoin node.<br>
  It starts to index all the blocks until it reaches the last block height.
* When the indexing finishes, it checks for any failed blocks (blocks that had at least one `OP_RETURN` record failed to store) in `errored_blocks` table. It will try once to re-index them again and empty the `errored_blocks` table.
* Then it goes into idle mode, waiting for the generation of a new block to automatically index it.

If the monitoring process is interrupted (e.g process killed), it keeps the state of the application in the database and will continue from it's previous state, once the `npm run monitor`  command is executed next time.<br>

**Additional explicit commands**<br>

Get last indexed block.
```bash
npm run get:last
```
Get errored blocks (blocks that have failed to store all `OP_RETURN` metadata). Will show a list with the block height and the date when the indexing failed.
```bash
npm run get:errored
```
Re-index all errored blocks.
```bash
npm run index:errored
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
where `opReturnData` is expected to be in `hex` format. See above [**Querying**](https://github.com/goga-m/btc-opreturn#querying)

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
Test that the configuration for indexing process is correct. Checks the connection with PostgreSQL database, and with the bitcoind, to ensure that indexing app is ready to run.<br>
   See `config.postgresql` and `config.rpc`.

```bash
npm test
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
