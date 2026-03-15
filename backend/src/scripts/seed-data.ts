import { Pool } from 'pg';
import ExcelJS from 'exceljs';
import path from 'path';
import * as db from '../database/db';

const sampleProducts = [
    { name: 'Wireless Headphones', price: 99.99, category: 'Electronics', stock: 50 },
    { name: 'Smart Watch', price: 149.99, category: 'Electronics', stock: 30 },
    { name: 'Ergonomic Chair', price: 299.99, category: 'Furniture', stock: 15 },
    { name: 'Mechanical Keyboard', price: 120.00, category: 'Accessories', stock: 40 },
    { name: 'Gaming Mouse', price: 59.99, category: 'Accessories', stock: 60 },
    { name: 'Desk Lamp', price: 35.50, category: 'Furniture', stock: 100 },
    { name: 'Water Bottle', price: 15.00, category: 'Accessories', stock: 200 },
    { name: 'Laptop Stand', price: 45.00, category: 'Accessories', stock: 80 },
    { name: 'Notebook', price: 5.99, category: 'Office Supplies', stock: 300 },
    { name: 'USB-C Cable', price: 12.99, category: 'Electronics', stock: 150 },
];

const firstNames = ['John', 'Jane', 'Michael', 'Emily', 'David', 'Sarah', 'James', 'Jessica', 'Robert', 'Ashley', 'William', 'Amanda', 'Joseph', 'Melissa', 'Richard', 'Stephanie', 'Thomas', 'Rebecca', 'Charles', 'Laura'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia', 'Rodriguez', 'Wilson', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Hernandez', 'Moore', 'Martin', 'Jackson', 'Thompson', 'White'];

function getRandomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomDateWithinDays(days: number): Date {
    const now = new Date();
    const past = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return new Date(past.getTime() + Math.random() * (now.getTime() - past.getTime()));
}

async function runSeed() {
    try {
        console.log('Starting sample data generation...');
        let userId = 1;
        
        // Ensure user exists
        const userRes = await db.execute(`INSERT INTO users (email, password_hash, full_name) VALUES ('admin2@test.com', 'test', 'Admin') ON CONFLICT (email) DO NOTHING RETURNING id`);
        if (userRes && userRes.lastInsertRowid) {
           userId = userRes.lastInsertRowid;
        } else {
           const existingUser = await db.queryOne('SELECT id FROM users LIMIT 1');
           if (existingUser) userId = existingUser.id;
        }

        // Insert products
        const productIds: number[] = [];
        for (const p of sampleProducts) {
            const res = await db.query(`
                INSERT INTO products (name, category, selling_price, current_stock, user_id) 
                VALUES ($1, $2, $3, $4, $5) 
                RETURNING id`, [p.name, p.category, p.price, p.stock, userId]);
            if (res.length > 0) {
                productIds.push(res[0].id);
            }
        }
        console.log(`Inserted ${productIds.length} products.`);

        // Insert customers
        const customerIds: number[] = [];
        for (let i = 0; i < 20; i++) {
            const name = `${getRandomItem(firstNames)} ${getRandomItem(lastNames)}`;
            const email = `${name.replace(' ', '.').toLowerCase()}${Math.floor(Math.random() * 1000)}@example.com`;
            const phone = `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`;

            const res = await db.query(`
                INSERT INTO customers (name, phone, email, status, user_id) 
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id`, [name, phone, email, 'Active', userId]);
            if (res.length > 0) {
                customerIds.push(res[0].id);
            }
        }
        console.log(`Inserted ${customerIds.length} customers.`);

        const allProducts = await db.query('SELECT * FROM products WHERE id = ANY($1)', [productIds]);

        // Insert 100 purchases
        const transactions: any[] = [];
        for (let i = 0; i < 100; i++) {
            const customerId = getRandomItem(customerIds);
            const numItems = Math.floor(Math.random() * 3) + 1;
            const items = [];
            let totalAmount = 0;
            
            for (let j = 0; j < numItems; j++) {
                const prod = getRandomItem(allProducts);
                const qty = Math.floor(Math.random() * 3) + 1;
                items.push({
                    product_id: prod.id,
                    name: prod.name,
                    quantity: qty,
                    price: prod.selling_price
                });
                totalAmount += qty * Number(prod.selling_price);
            }
            
            const pDate = getRandomDateWithinDays(90);
            
            const pRes = await db.query(`
                INSERT INTO purchases (customer_id, items, total_amount, purchase_date, created_at, user_id)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id`, [customerId, JSON.stringify(items), totalAmount, pDate, pDate, userId]);
                
            if (pRes.length > 0) {
                transactions.push({
                    id: pRes[0].id,
                    customer_id: customerId,
                    date: pDate,
                    amount: totalAmount,
                    items_count: items.reduce((sum, it) => sum + it.quantity, 0)
                });
            }
        }
        console.log(`Inserted ${transactions.length} transactions.`);
        
        // Update customer revenues and dates
        for (const cId of customerIds) {
            const pxs = transactions.filter(t => t.customer_id === cId);
            if (pxs.length > 0) {
                pxs.sort((a,b) => a.date.getTime() - b.date.getTime());
                const firstP = pxs[0].date;
                const lastP = pxs[pxs.length - 1].date;
                const totalS = pxs.reduce((sum, t) => sum + t.amount, 0);
                const totalP = pxs.length;
                
                await db.execute(`
                    UPDATE customers 
                    SET total_spent = $1, total_purchases = $2, first_purchase_date = $3, last_purchase_date = $4
                    WHERE id = $5`, [totalS, totalP, firstP, lastP, cId]);
            }
        }
        console.log('Customer revenue fields updated.');

        // Excel Export
        const workbook = new ExcelJS.Workbook();
        
        // 1. Transactions Sheet
        const txSheet = workbook.addWorksheet('Transactions');
        txSheet.columns = [
            { header: 'Transaction ID', key: 'id', width: 15 },
            { header: 'Customer ID', key: 'customer', width: 15 },
            { header: 'Date', key: 'date', width: 20 },
            { header: 'Amount ($)', key: 'amount', width: 15 },
            { header: 'Items Count', key: 'items', width: 15 }
        ];
        
        for (const t of transactions) {
            txSheet.addRow({
                id: t.id,
                customer: t.customer_id,
                date: t.date.toISOString().split('T')[0],
                amount: t.amount,
                items: t.items_count
            });
        }
        
        // 2. Customers Sheet
        const finalCustomers = await db.query('SELECT * FROM customers WHERE id = ANY($1)', [customerIds]);
        const custSheet = workbook.addWorksheet('Customers Summary');
        custSheet.columns = [
            { header: 'Customer ID', key: 'id', width: 15 },
            { header: 'Name', key: 'name', width: 25 },
            { header: 'Email', key: 'email', width: 25 },
            { header: 'Total Spent ($)', key: 'spent', width: 20 },
            { header: 'Total Purchases', key: 'purchases', width: 15 },
            { header: 'First Purchase', key: 'first', width: 20 },
            { header: 'Last Purchase', key: 'last', width: 20 }
        ];

        for (const c of finalCustomers) {
            custSheet.addRow({
                id: c.id,
                name: c.name,
                email: c.email,
                spent: c.total_spent,
                purchases: c.total_purchases,
                first: c.first_purchase_date ? new Date(c.first_purchase_date).toISOString().split('T')[0] : 'N/A',
                last: c.last_purchase_date ? new Date(c.last_purchase_date).toISOString().split('T')[0] : 'N/A'
            });
        }

        // Save
        const outDir = path.join(__dirname, '../../../sample-data');
        const filename = 'antigravity-sample-data.xlsx';
        const fp = path.join(outDir, filename);

        // Ensure outDir exists
        await require('fs/promises').mkdir(outDir, { recursive: true });

        await workbook.xlsx.writeFile(fp);
        console.log(`Excel file saved to ${fp}`);

    } catch (err) {
        console.error('Error seeding data:', err);
    } finally {
        await db.closeDatabase();
        process.exit();
    }
}

runSeed();
