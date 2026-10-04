require('dotenv').config();
const mysql = require('mysql2/promise');

// Configuration to connect MySQL Pool Port
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'store_transaction_db',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10
});

async function processOrderTransaction(customerId, productId, quantity) {
    const conn = await pool.getConnection();
    console.log(`Processing Order: Customer ID [${customerId}] | Product ID [${productId}] | Quantity [${quantity}]`);
    
    try {
        await conn.beginTransaction();

        const [customerRows] = await conn.execute('SELECT * FROM customers WHERE id = ? FOR UPDATE', [customerId]);
        if (customerRows.length === 0) {
            throw new Error(`Customer with ID ${customerId} not found.`);
        }
        const customer = customerRows[0];

        const [productRows] = await conn.execute('SELECT * FROM products WHERE id = ? FOR UPDATE', [productId]);
        if (productRows.length === 0) {
            throw new Error(`Product with ID ${productId} not found.`);
        }
        const product = productRows[0];

        const totalAmount = Number(product.price) * quantity;
        console.log(`-> Unit Price: ${product.price} | Total: ${totalAmount}`);
        console.log(`-> Customer Balance: ${customer.balance} | Product Stock: ${product.stock}`);

        if (product.stock < quantity) {
            throw new Error(`Transaction Aborted: Insufficient stock (Available: ${product.stock}, Requested: ${quantity}).`);
        }

        if (Number(customer.balance) < totalAmount) {
            throw new Error(`Transaction Aborted: Insufficient balance (Available: ${customer.balance}, Required: ${totalAmount}).`);
        }

        await conn.execute(
            'UPDATE customers SET balance = balance - ? WHERE id = ?',
            [totalAmount, customerId]
        );
        console.log(`[Step 2] Deducted ${totalAmount} from customer balance.`);

        await conn.execute(
            'UPDATE products SET stock = stock - ? WHERE id = ?',
            [quantity, productId]
        );
        console.log(`[Step 3] Deducted ${quantity} item(s) from product stock.`);

        const [orderResult] = await conn.execute(
            'INSERT INTO orders (customer_id, total_amount, created_at) VALUES (?, ?, NOW())',
            [customerId, totalAmount]
        );
        const orderId = orderResult.insertId;
        console.log(`[Step 4] Created Order ID: ${orderId}`);

        await conn.execute(
            'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
            [orderId, productId, quantity, product.price]
        );
        console.log(`[Step 5] Inserted order item linked to Order ID: ${orderId}`);

        await conn.commit();
        console.log(`>>> SUCCESS: Transaction successfully committed! Data persisted.`);

    } catch (error) {
        await conn.rollback();
        console.error(`>>> FAILED: ${error.message}`);
        console.error(`>>> ROLLBACK executed: Database state restored to original.`);
    } finally {
        conn.release();
    }
}

async function runTests() {
    await processOrderTransaction(1, 1, 1);

    await processOrderTransaction(2, 1, 1);

    await processOrderTransaction(1, 2, 10);

    await pool.end();
}

runTests();