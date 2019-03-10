const express = require('express')
const pino = require('pino')
const expressPino = require('express-pino-logger')
const boom = require('express-boom')
const routes = require('./middleware/routes')

const protocol = process.env.APP_PROTOCOL || 'http'
const host = process.env.APP_HOST || '127.0.0.1'
const port = process.env.APP_PORT || 3000

const app = express()
const logger = pino()
const appLogger = expressPino({ logger })

app.disable('x-powered-by')

app.use(boom())
app.use(appLogger)
app.use(routes)

app.listen(port, () => {
  logger.info(`Listening: ${protocol}//${host}:${port}`)
})
