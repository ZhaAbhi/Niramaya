import app from './src/app';

const server = app;
const PORT = 3000;

server.listen(PORT, ()=>{
    console.log(`Server listening on PORT: ${PORT}`)
})