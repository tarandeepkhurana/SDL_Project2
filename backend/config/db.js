import { createConnection } from 'mysql2';

const db = createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Boshitu@123',
    database: 'ResiCare',
});

db.connect((err) => {
    if (err) throw err;
    console.log('MySQL connected...');
});

export default db;
