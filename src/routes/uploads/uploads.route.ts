import express,{Request, Response} from 'express';

const uploadRouter  = express.Router();

uploadRouter.get('/upload', (req:Request, res: Response)=>{
    res.send("Upload route")
})

export default uploadRouter