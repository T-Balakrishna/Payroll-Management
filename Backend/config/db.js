const {Sequelize} = require('sequelize')

const seq = new Sequelize('payroll_db','root','Pass#123',{
    host:'localhost',
    dialect:'mysql'
})

module.exports = seq