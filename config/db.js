const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '', 
    database: 'computer_store_db'
});

module.exports = pool.promise();