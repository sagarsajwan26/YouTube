const jwt = require('jsonwebtoken')



module.exports= async (req,res, next)=>{
try {
 const token=   req.headers.authorization.split(" ")[1];
    
 jwt.verify(token, "sagar")


 
    next()
    
} catch (error) {
        console.log('error in jwt middleware',error);
        return res.status(500).json({error:"invalid token"})
        
}


}
