const {Sequelize} = require('sequelize')

const seq = new Sequelize('payroll_db','root','praveen@2006',{
    host:'localhost',
    dialect:'mysql'
})

module.exports = seq