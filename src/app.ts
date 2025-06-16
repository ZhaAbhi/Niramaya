import express, { Request, Response } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import uploadRouter from './routes/uploads/uploads.route';

const app = express();
const router  = express.Router();

app.use(express.json());

app.use(cors())

app.use(morgan('combined'))

router.get('/', (req: Request, res: Response)=>{
    res.send('Welcome to Niramaya')
})

app.use(router)
app.use(uploadRouter)


export default app;



