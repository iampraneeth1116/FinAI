import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const users = [
    { name: 'Alice Johnson', email: 'alice@example.com', password: 'password123' },
    { name: 'Bob Smith', email: 'bob@example.com', password: 'password123' },
    { name: 'Carol Williams', email: 'carol@example.com', password: 'password123' },
    { name: 'David Lee', email: 'david@example.com', password: 'password123' },
    { name: 'Eva Martinez', email: 'eva@example.com', password: 'password123' },
];

const categories = [
    { name: 'Food & Dining', type: 'EXPENSE' },
    { name: 'Transportation', type: 'EXPENSE' },
    { name: 'Shopping', type: 'EXPENSE' },
    { name: 'Entertainment', type: 'EXPENSE' },
    { name: 'Utilities', type: 'EXPENSE' },
    { name: 'Salary', type: 'INCOME' },
    { name: 'Freelance', type: 'INCOME' },
];

function randomAmount(min, max) {
    return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

function randomDate(daysBack = 90) {
    const d = new Date();
    d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
    return d;
}

async function main() {
    console.log('🌱 Seeding database...');

    for (const userData of users) {
        // Upsert user
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const user = await prisma.user.upsert({
            where: { email: userData.email },
            update: {},
            create: { name: userData.name, email: userData.email, password: hashedPassword },
        });

        console.log(`  ✅ User: ${user.email}`);

        // Create categories for each user (skip if already exist)
        const createdCategories = [];
        for (const cat of categories) {
            const existing = await prisma.category.findFirst({ where: { name: cat.name, userId: user.id } });
            if (!existing) {
                const created = await prisma.category.create({ data: { ...cat, userId: user.id } });
                createdCategories.push(created);
            } else {
                createdCategories.push(existing);
            }
        }

        const expenseCategories = createdCategories.filter(c => c.type === 'EXPENSE');
        const incomeCategories = createdCategories.filter(c => c.type === 'INCOME');

        // Seed 20 transactions per user
        const transactions = [];

        // 3 income transactions
        for (let i = 0; i < 3; i++) {
            const cat = incomeCategories[Math.floor(Math.random() * incomeCategories.length)];
            transactions.push({
                amount: randomAmount(2000, 6000),
                date: randomDate(90),
                description: cat.name === 'Salary' ? 'Monthly Salary' : 'Freelance Project Payment',
                userId: user.id,
                categoryId: cat.id,
            });
        }

        // 17 expense transactions
        const expenseDescriptions = {
            'Food & Dining': ['Grocery Store', 'Restaurant Dinner', 'Coffee Shop', 'Food Delivery'],
            'Transportation': ['Uber Ride', 'Gas Station', 'Metro Card', 'Parking Fee'],
            'Shopping': ['Amazon Order', 'Clothing Store', 'Electronics', 'Home Goods'],
            'Entertainment': ['Netflix Subscription', 'Movie Tickets', 'Spotify', 'Books'],
            'Utilities': ['Electricity Bill', 'Internet Bill', 'Water Bill', 'Phone Bill'],
        };

        for (let i = 0; i < 17; i++) {
            const cat = expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
            const descs = expenseDescriptions[cat.name] || ['Expense'];
            const desc = descs[Math.floor(Math.random() * descs.length)];
            transactions.push({
                amount: -randomAmount(10, 300),
                date: randomDate(90),
                description: desc,
                userId: user.id,
                categoryId: cat.id,
            });
        }

        await prisma.transaction.createMany({ data: transactions });
        console.log(`     ↳ ${transactions.length} transactions seeded`);

        // Seed 3 months of budgets
        const now = new Date();
        for (let i = 0; i < 3; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const month = d.getMonth() + 1;
            const year = d.getFullYear();
            const existing = await prisma.budget.findFirst({ where: { userId: user.id, month, year } });
            if (!existing) {
                await prisma.budget.create({
                    data: { amount: randomAmount(1500, 3000), month, year, userId: user.id },
                });
            }
        }
        console.log(`     ↳ 3 monthly budgets seeded`);
    }

    console.log('\n✅ Seeding complete!');
    console.log('   All users have password: password123');
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
