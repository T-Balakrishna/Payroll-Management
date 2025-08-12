const express = require('express');
const cors = require('cors');
const  seq  = require('./config/db');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded());

// importing routes
const empRoute = require('./routes/employeeRoute')

//direction the call from frontend to respective backend routes
app.use('/api/employee',empRoute);


// import all models to create table using sync
require('./models/Employee')


const startServer = async () =>{    
    try{
        await seq.authenticate();
        console.log("DB COnnected successfully");

        await seq.sync();
        console.log("Tables created");

        app.listen(5000, () =>{
            console.log("Listening at port http://localhost:5000");            
        })
        
        
    }
    catch(error){
        console.log(error.message)
    }
}

startServer();
