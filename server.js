const http= require('http')
const app = require('./app')


const  server= http.createServer(app)

server.listen(3000, ()=>{
    console.log('app is running on http://localhost:3000');
    
})