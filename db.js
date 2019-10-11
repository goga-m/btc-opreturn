const Pool = require('pg').Pool
const { postgresql } = require('./config')
const pool = new Pool(postgresql)
module.exports = pool
