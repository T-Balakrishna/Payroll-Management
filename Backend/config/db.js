const {Sequelize} = require('sequelize')

const seq = new Sequelize('payroll_db','root','Mydeen@2006',{
    host:'localhost',
    dialect:'mysql'
})

module.exports = seq