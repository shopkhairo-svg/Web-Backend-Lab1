require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'store_db',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function main() {
  try {
    console.log('Connecting to MySQL Database...');

    await pool.query('SET FOREIGN_KEY_CHECKS = 0;');
    await pool.query('DROP TABLE IF EXISTS items;');
    await pool.query('DROP TABLE IF EXISTS categories;');
    await pool.query('SET FOREIGN_KEY_CHECKS = 1;');

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("-> 'categories' table is ready.");

    const insertSql = 'INSERT INTO categories (name, description) VALUES (?, ?)';
    const [insertResult] = await pool.execute(insertSql, ['Food', 'Daily essentials']);
    console.log(`-> Inserted category ID: ${insertResult.insertId}`);

    const [rows] = await pool.execute(
      'SELECT * FROM categories WHERE name = ?',
      ['Food']
    );
    console.log('-> Query result:', rows);

    const [updateResult] = await pool.execute(
      'UPDATE categories SET description = ? WHERE id = ?',
      ['Food, beverages and fresh food', insertResult.insertId]
    );
    console.log(`-> Number of updated rows: ${updateResult.affectedRows}`);

  } catch (error) {
    console.error('MySQL error:', error.message);
  } finally {
    await pool.end();
    console.log('-> Connection closed.');
  }
}

async function setupDatabaseAndSeedData() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      category_id INT NOT NULL,
      item_name VARCHAR(150) NOT NULL,
      price DECIMAL(12,2) NOT NULL,
      quantity INT DEFAULT 0,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
    );
  `);

  await pool.query('SET FOREIGN_KEY_CHECKS = 0;');
  await pool.query('TRUNCATE TABLE items;');
  await pool.query('TRUNCATE TABLE categories;');
  await pool.query('SET FOREIGN_KEY_CHECKS = 1;');

  await pool.query(`
    INSERT INTO categories (name, description) VALUES
    ('Food', 'Daily essentials and groceries'),
    ('Electronics', 'Gadgets, phones and computers'),
    ('Clothing', 'Apparel and fashion items'),
    ('Books', 'Educational and entertainment books'),
    ('Home & Living', 'Furniture and home appliances'),
    ('Sports & Outdoors', 'Sporting goods and outdoor equipment');
  `);

  await pool.query(`
    INSERT INTO items (category_id, item_name, price, quantity) VALUES
    (1, 'Apple', 25000.00, 100),
    (1, 'Milk', 32000.00, 50),
    (1, 'Bread', 15000.00, 30),
    (2, 'Smartphone', 5500000.00, 15),
    (2, 'Wireless Mouse', 250000.00, 40),
    (3, 'T-Shirt', 120000.00, 60),
    (3, 'Jeans', 350000.00, 25),
    (4, 'Node.js Programming', 180000.00, 20),
    (5, 'Desk Lamp', 150000.00, 35),
    (5, 'Coffee Mug', 45000.00, 80);
  `);
}

async function main() {
  try {
    await setupDatabaseAndSeedData();

    const [rows] = await pool.execute(
      'SELECT * FROM items WHERE price >= ? AND quantity > ? ORDER BY price DESC',
      [500000, 0]
    );

    console.log('=== KẾT QUẢ QUESTION 1 ===');
    console.table(rows);

  } catch (error) {
    console.error('MySQL Error:', error.message);
  } finally {
    await pool.end();
  }
}

async function searchProductsByKeywords(keyword1, keyword2) {
  const query = `
    SELECT * FROM items 
    WHERE item_name LIKE ? OR item_name LIKE ?
  `;
  const [rows] = await pool.execute(query, [`%${keyword1}%`, `%${keyword2}%`]);
  return rows;
}

async function main() {
  try {
    await setupDatabaseAndSeedData();

    // Thực thi Question 2
    const searchResults = await searchProductsByKeywords('Gaming', 'Wireless');

    console.log('=== KẾT QUẢ QUESTION 2 (LIKE SEARCH) ===');
    console.table(searchResults);

  } catch (error) {
    console.error('MySQL Error:', error.message);
  } finally {
    await pool.end();
  }
}

async function main() {
  try {
    await setupDatabaseAndSeedData();

    const [rows] = await pool.execute(`
      SELECT 
        SUM(quantity) AS total_stock,
        AVG(price) AS avg_price,
        COUNT(*) AS total_items
      FROM items
    `);

    console.log('=== KẾT QUẢ QUESTION 3 (AGGREGATE FUNCTIONS) ===');
    console.table(rows);

  } catch (error) {
    console.error('MySQL Error:', error.message);
  } finally {
    await pool.end();
  }
}

async function main() {
  try {
    await setupDatabaseAndSeedData();

    const [rows] = await pool.execute(`
      SELECT 
        c.name AS category_name,
        COUNT(i.id) AS total_items,
        SUM(i.price * i.quantity) AS inventory_value
      FROM categories c
      INNER JOIN items i ON c.id = i.category_id
      GROUP BY c.id, c.name
      HAVING inventory_value > ?
    `, [10000000]);

    console.log('=== KẾT QUẢ QUESTION 4 (GROUP BY & HAVING) ===');
    console.table(rows);

  } catch (error) {
    console.error('MySQL Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();