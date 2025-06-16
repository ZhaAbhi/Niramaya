const express = require('express');

const server = express();
const router = express.Router()
const PORT = 3000;

router.get('/', (req, res)=>{
    res.send("Welcome")
})

server.use('/', router)

server.listen(PORT, ()=>{
    console.log(`Server listening on PORT: ${PORT}`)
})