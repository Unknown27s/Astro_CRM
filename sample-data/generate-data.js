#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Sample data generators
const firstNames = [
    'Rajesh', 'Priya', 'Amit', 'Sneha', 'Vijay', 'Anjali', 'Arjun', 'Divya',
    'Rohan', 'Neha', 'Sanjay', 'Pooja', 'Akshay', 'Kavya', 'Nitin', 'Shreya',
    'Rohit', 'Vishal', 'Anil', 'Ravi', 'Suresh', 'Ashok', 'Kiran', 'Manoj',
    'Rahul', 'Harsha', 'Varun', 'Sumit', 'Shantanu', 'Deepak', 'Sachin', 'Vivek'
];

const lastNames = [
    'Sharma', 'Patel', 'Kumar', 'Singh', 'Verma', 'Gupta', 'Reddy', 'Desai',
    'Rao', 'Nair', 'Iyer', 'Pillai', 'Khanna', 'Bhat', 'Hegde', 'Mishra',
    'Pandey', 'Yadav', 'Rana', 'Joshi', 'Trivedi', 'Kapoor', 'Malhotra', 'Bhatnagar'
];

const cities = [
    'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad',
    'Jaipur', 'Lucknow', 'Chandigarh', 'Indore', 'Surat', 'Nagpur', 'Bhopal', 'Vadodara',
    'Ghaziabad', 'Ludhiana', 'Kochi', 'Visakhapatnam', 'Pimpri-Chinchwad', 'Patna'
];

const productCategories = [
    'Electronics', 'Clothing', 'Groceries', 'Home & Kitchen', 'Beauty & Personal Care',
    'Books & Media', 'Sports & Outdoors', 'Toys & Games', 'Furniture', 'Stationery',
    'Automotive', 'Health & Wellness', 'Pet Supplies', 'Musical Instruments', 'Jewelry'
];

const productNames = [
    // Electronics
    'Smartphone', 'Laptop', 'Tablet', 'Headphones', 'USB Cable', 'Phone Charger', 'Power Bank',
    'Wireless Mouse', 'Keyboard', 'Monitor', 'Webcam', 'Speaker', 'Smartwatch',
    // Clothing
    'T-Shirt', 'Jeans', 'Shirt', 'Dress', 'Shoes', 'Jacket', 'Sweater', 'Socks', 'Underwear',
    // Groceries
    'Rice', 'Wheat', 'Dal', 'Oil', 'Salt', 'Sugar', 'Tea', 'Coffee', 'Milk', 'Bread',
    'Spices', 'Nuts', 'Fruits', 'Vegetables', 'Pasta',
    // Home & Kitchen
    'Pillow', 'Bedsheet', 'Towel', 'Plate', 'Bowl', 'Glass', 'Utensils', 'Knife', 'Cutting Board',
    'Spatula', 'Whisk', 'Measuring Cup', 'Cooking Pot', 'Frying Pan',
    // Beauty
    'Shampoo', 'Conditioner', 'Soap', 'Toothpaste', 'Deodorant', 'Lotion', 'Face Wash',
    // Books
    'Novel', 'Study Material', 'Comic Book', 'Magazine', 'Newspaper',
    // Sports
    'Basketball', 'Football', 'Badminton Racket', 'Cricket Bat', 'Yoga Mat', 'Dumbbell',
    // Toys
    'Action Figure', 'Building Blocks', 'Puzzle', 'Board Game', 'Doll', 'RC Car',
    // Furniture
    'Chair', 'Table', 'Desk', 'Wardrobe', 'Shelf', 'Bed',
    // Others
    'Notebook', 'Pen', 'Pencil', 'Eraser', 'Ruler', 'Scissors'
];

// Generate random data helpers
function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomPhone() {
    return '91' + getRandomNumber(8000000000, 9999999999).toString().slice(0, 10);
}

function getRandomEmail(name) {
    const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'rediffmail.com', 'hotmail.com'];
    return `${name.toLowerCase().replace(/\s/g, '.')}${getRandomNumber(100, 999)}@${getRandomItem(domains)}`;
}

// Generate customers sample data (500+ records)
function generateCustomersCSV() {
    const rows = ['name,phone,email,location,status,created_at'];
    const statuses = ['Active', 'Inactive', 'VIP', 'Churned'];

    for (let i = 1; i <= 550; i++) {
        const firstName = getRandomItem(firstNames);
        const lastName = getRandomItem(lastNames);
        const name = `${firstName} ${lastName}`;
        const phone = getRandomPhone();
        const email = getRandomEmail(name);
        const location = getRandomItem(cities);
        const status = getRandomItem(statuses);
        const createdAt = new Date(Date.now() - getRandomNumber(0, 365 * 24 * 60 * 60 * 1000))
            .toISOString().split('T')[0];

        rows.push(`"${name}","${phone}","${email}","${location}","${status}","${createdAt}"`);
    }

    return rows.join('\n');
}

// Generate products sample data (500+ records)
function generateProductsCSV() {
    const rows = ['name,sku,barcode,category,description,selling_price,cost_price,current_stock,min_stock_level,max_stock_level,supplier'];
    const suppliers = [
        'Supplier A', 'Supplier B', 'Supplier C', 'Wholesale Dist', 'Direct Manufacturer',
        'Regional Distributor', 'Local Vendor', 'Import Company', 'Premium Supplier', 'Bulk Distributor'
    ];

    for (let i = 1; i <= 550; i++) {
        const productName = getRandomItem(productNames);
        const category = getRandomItem(productCategories);
        const sku = `SKU${String(i).padStart(6, '0')}`;
        const barcode = `8901234${String(i).padStart(6, '0')}`;
        const description = `High quality ${productName.toLowerCase()} - ${category}`;
        const costPrice = getRandomNumber(50, 1000);
        const sellingPrice = Math.round(costPrice * (1 + getRandomNumber(20, 100) / 100));
        const currentStock = getRandomNumber(5, 500);
        const minStockLevel = getRandomNumber(5, 20);
        const maxStockLevel = getRandomNumber(100, 500);
        const supplier = getRandomItem(suppliers);

        rows.push(
            `"${productName}","${sku}","${barcode}","${category}","${description}",${sellingPrice},${costPrice},${currentStock},${minStockLevel},${maxStockLevel},"${supplier}"`
        );
    }

    return rows.join('\n');
}

// Generate and write files
const customersCSV = generateCustomersCSV();
const productsCSV = generateProductsCSV();

fs.writeFileSync(
    path.join(__dirname, 'sample-customers-large.csv'),
    customersCSV,
    'utf-8'
);

fs.writeFileSync(
    path.join(__dirname, 'sample-products-large.csv'),
    productsCSV,
    'utf-8'
);

console.log('✅ Generated sample-customers-large.csv (550 records)');
console.log('✅ Generated sample-products-large.csv (550 records)');
console.log('📁 Files created in ./sample-data/');
