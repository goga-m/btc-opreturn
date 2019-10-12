const express = require('express')
const app = express()

const { server } = require('../config')
const { queryByOpReturn } = require('./db')
const log = require('./logger')

app.get('/opreturn/:opReturnData', (req, res, next) => {
  const query = req.params.opReturnData
  log.info(`GET /opreturn/${query}`)
  queryByOpReturn(query)
  .then(data => {
    if (data.length === 0) {
      log.error(`GET /opreturn/${query}`, 'Not found')
      return res.status(404).send({ error: 'Not Found' })
    }
    res.json(data)
  })
})

app.listen(server.port, () => {
  console.log(`Server running on ${server.port}`)
})
