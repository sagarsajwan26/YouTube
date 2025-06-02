const express= require("express")
const app= express()
require('dotenv').config()
const UserRoute= require('./routes/user')
const commentRoute= require('./routes/comment')
const VideoRoute= require('./routes/video')
const bodyParser= require('body-parser')
const fileUpload = require("express-fileupload")


const mongoose= require("mongoose")

// mongoose.connect(process.env.MONGO_URI)
// .then(res=> console.log('connected with database'))
// .catch(err=>{
//     console.log('failed to connect with database');
    
// })

const connectWithDatabase= async()=>{
    try {
      const res= await mongoose.connect(process.env.MONGO_URI)
        console.log("connected with database");
        
    } catch (error) {
        console.log('database connection failed');
        
    }
}
connectWithDatabase()
app.use(bodyParser.json())
app.use(fileUpload({
    useTempFiles:true,
    tempFileDir:"/tmp"
}))
app.use('/user',UserRoute)
app.use('/video',VideoRoute)
app.use('/comment',commentRoute)
module.exports = app