import express from 'express'
import http    from 'http'
import events  from 'web-events-server'

let
  app    = express(),
  server = http.createServer(app);

events(server, {
  connection(ws, req) {
    console.dir(req, { depth: 1 })
  },

  close() {
    console.log('>>>>>>>>>>>>> Close connection')
  }
})

server.listen(process.env.PORT || 80)