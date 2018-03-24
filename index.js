const
  server = require('http').createServer(require('express'));

require('web-events-server')(server, {
  connection(ws, req) {
    console.dir(req, { depth: 1 })
  },

  close() {
    console.log('>>>>>>>>>>>>> Close connection')
  }
})

server.listen(process.env.PORT || 80)