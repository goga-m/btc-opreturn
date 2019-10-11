const express = require('express')
const app = express()

const { server } = require('./config')
const { queryByOpReturn } = require('./db')

app.get('/opreturn/:opReturnData', (req, res, next) => {
  queryByOpReturn(req.params.opReturnData)
  .then(data => {
    if(!data) return res.status(404).send({ error: 'Not Found' })
    res.json(data)

  })
})

app.listen(server.port, () => {
  console.log(`Server running on ${server.port}`)
})
