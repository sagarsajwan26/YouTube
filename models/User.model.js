const mongoose = require('mongoose')

const userSchema=  new mongoose.Schema({
    _id:mongoose.Schema.Types.ObjectId,
    channelName:{
        type:String,
        reqired:true
    },
    email:{
        type:String,
        required:true
    },
    phone:{
        type:Number,
        required:true
    },
     password:{
        type:String,
        required:true
    },
     logoUrl:{
        type:String,
        required:true
    },
     logoId:{
        type:String,
        required:true
    },
     subscribers:{
        type:Number,
        default:0
    },
    subscribedBy:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"User"
        }
    ],

    subscribedChannels:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"User"
        }
    ]
},{timestamps:true})


module.exports = mongoose.model("User",userSchema)