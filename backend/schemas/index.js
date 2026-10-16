import { z } from 'zod';

// ---- Shared primitives ----
const id = z.string().min(1, 'id is required');
export const idParam = z.object({ id });

// Coerce numeric strings (common from form posts) into numbers.
const money = z.coerce.number({ invalid_type_error: 'must be a number' }).finite();
const isoDate = z.coerce.date({ invalid_type_error: 'must be a valid date' });

// ---- Auth ----
export const registerSchema = z.object({
    email: z.string().trim().toLowerCase().email('A valid email is required'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(100),
    name: z.string().trim().min(1).max(80).optional(),
});

export const loginSchema = z.object({
    email: z.string().trim().toLowerCase().email('A valid email is required'),
    password: z.string().min(1, 'Password is required'),
});

// ---- Users ----
export const updateProfileSchema = z.object({
    name: z.string().trim().min(1).max(80).optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8, 'New password must be at least 8 characters').max(100).optional(),
}).refine((d) => !d.newPassword || d.currentPassword, {
    message: 'Current password is required to set a new password',
    path: ['currentPassword'],
});

// ---- Transactions ----
export const createTransactionSchema = z.object({
    amount: money.refine((v) => v !== 0, 'Amount cannot be zero'),
    date: isoDate,
    description: z.string().trim().max(200).optional().or(z.literal('')),
    categoryId: z.string().min(1).optional().nullable(),
});

export const updateTransactionSchema = z.object({
    amount: money.optional(),
    date: isoDate.optional(),
    description: z.string().trim().max(200).optional().nullable(),
    categoryId: z.string().min(1).optional().nullable(),
});

// ---- Categories ----
export const createCategorySchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(60),
    type: z.enum(['INCOME', 'EXPENSE'], { errorMap: () => ({ message: 'Type must be INCOME or EXPENSE' }) }),
});

export const updateCategorySchema = z.object({
    name: z.string().trim().min(1).max(60).optional(),
    type: z.enum(['INCOME', 'EXPENSE']).optional(),
});

// ---- Budgets ----
export const createBudgetSchema = z.object({
    amount: money.positive('Budget amount must be positive'),
    month: z.coerce.number().int().min(1).max(12),
    year: z.coerce.number().int().min(2000).max(2100),
});

export const updateBudgetSchema = z.object({
    amount: money.positive('Budget amount must be positive'),
});

// ---- Goals ----
export const createGoalSchema = z.object({
    name: z.string().trim().min(1, 'Goal name is required').max(80),
    targetAmount: money.positive('Target amount must be positive'),
    currentAmount: money.min(0).optional().default(0),
    deadline: isoDate,
});

export const updateGoalSchema = z.object({
    name: z.string().trim().min(1).max(80).optional(),
    targetAmount: money.positive().optional(),
    currentAmount: money.min(0).optional(),
    deadline: isoDate.optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'At least one field is required' });

export const contributeGoalSchema = z.object({
    amount: money.positive('Contribution must be positive'),
});

// ---- Scenario ----
export const simulateSchema = z.object({
    monthlyIncomeDelta: z.coerce.number().finite().default(0),
    monthlyExpenseDelta: z.coerce.number().finite().default(0),
    oneTimeCost: z.coerce.number().finite().min(0).default(0),
    months: z.coerce.number().int().min(1).max(120).default(12),
});

// ---- AI ----
export const chatSchema = z.object({
    message: z.string().trim().min(1, 'Message is required').max(2000),
    history: z.array(z.object({
        role: z.enum(['user', 'model']),
        text: z.string().max(8000),
    })).max(50).optional().default([]),
});

export const categorizeSchema = z.object({
    description: z.string().trim().min(1, 'Description is required').max(200),
    amount: money.optional(),
});
