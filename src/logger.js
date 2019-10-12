const bunyan = require('bunyan')

const bformat = require('bunyan-format')
const formatOut = bformat({ outputMode: 'short' })

const level = process.env.OPR_ENV === 'debug'
  ? 'debug'
  : 'info'

const logger = bunyan.createLogger({ name: 'OP_RETURN', stream: formatOut, level })

module.exports = logger
