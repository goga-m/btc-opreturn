const migrate = require('migrate')
const log = require('./logger.js')

migrate.load({
  stateStore: '.migrations'
}, function (err, set) {
  log.info('Starting migration')
  if (err) {
    log.error('Migration failed', err)
    throw err
  }
  set.up(function (err) {
    if (err) {
      log.error('Migration failed', err)
      throw err
    }
    log.info('Migration succesfully finished')
    process.exit()
  })
  return true
})
