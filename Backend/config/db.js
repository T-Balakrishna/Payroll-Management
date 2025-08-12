const {Sequelize} = require('sequelize')

const seq = new Sequelize('login_db_dummy','root','Pass#123',{
    host:'localhost',
    dialect:'mysql'
})

module.exports = seq