const Book = require('../models/Book');

exports.addBooks = async (req,res) =>{
    try{
        const {name,author,price}  = req.body;
        const newBook = await Book.create({name,author,price});
        res.status(200).json(newBook);
    }
    catch(error){
        res.status(500).send("Error in Response of Adding Books" + error.message);
    }
}

exports.getBooks = async (req,res) =>{
    try{
        const books = await Book.findAll();
        res.json(books);
    }
    catch(e){
        res.status(501).send("Error in Response of Getting Books" + e.message)
    }
}