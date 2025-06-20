import express from 'express';
import { fileUpload } from '../../controllers/uploads/uploads.controller';

const uploadRouter = express.Router();

uploadRouter.post('/upload', fileUpload);

export default uploadRouter;
