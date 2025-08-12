const express = require('express')
const router = express.Router()

const {addBooks,getBooks} = require('../controllers/loginController')

router.post('/',addBooks)
router.get('/',getBooks)

module.exports=router