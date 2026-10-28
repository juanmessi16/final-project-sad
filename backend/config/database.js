const { Sequelize } = require('sequelize');

const db = new Sequelize('silab_db', 'root', '', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false
});

module.exports = db;