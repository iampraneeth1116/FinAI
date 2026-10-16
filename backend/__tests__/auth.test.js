import { jest } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { makePrismaMock } from './helpers.js';

const prismaMock = makePrismaMock();
jest.unstable_mockModule('../lib/prisma.js', () => ({ default: prismaMock }));

const { default: app } = await import('../server.js');

beforeEach(() => {
    Object.values(prismaMock).forEach((m) => Object.values(m).forEach((fn) => fn.mockReset()));
});

describe('POST /api/auth/register', () => {
    it('registers a new user and returns a token', async () => {
        prismaMock.user.findUnique.mockResolvedValue(null);
        prismaMock.user.create.mockResolvedValue({ id: 'u1', email: 'new@example.com', name: 'New' });

        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'new@example.com', password: 'password123', name: 'New' });

        expect(res.status).toBe(201);
        expect(res.body.token).toBeDefined();
        expect(res.body.user).toEqual({ id: 'u1', email: 'new@example.com', name: 'New' });
        // password should be hashed before persisting
        expect(prismaMock.user.create).toHaveBeenCalled();
        const created = prismaMock.user.create.mock.calls[0][0].data;
        expect(created.password).not.toBe('password123');
    });

    it('rejects duplicate emails with 409', async () => {
        prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', email: 'dupe@example.com' });
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'dupe@example.com', password: 'password123' });
        expect(res.status).toBe(409);
        expect(res.body.error).toMatch(/already exists/i);
    });

    it('rejects weak passwords with a validation error', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'a@b.com', password: 'short' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/validation/i);
    });

    it('rejects invalid email format', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'not-an-email', password: 'password123' });
        expect(res.status).toBe(400);
    });
});

describe('POST /api/auth/login', () => {
    it('logs in with valid credentials', async () => {
        const hash = await bcrypt.hash('password123', 4);
        prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.com', name: 'A', password: hash });

        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'a@b.com', password: 'password123' });

        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
        expect(res.body.user.id).toBe('u1');
    });

    it('rejects wrong password with 401', async () => {
        const hash = await bcrypt.hash('password123', 4);
        prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.com', password: hash });

        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'a@b.com', password: 'wrongpass' });
        expect(res.status).toBe(401);
    });

    it('rejects unknown user with 401 (no user enumeration)', async () => {
        prismaMock.user.findUnique.mockResolvedValue(null);
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'ghost@example.com', password: 'whatever123' });
        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/invalid email or password/i);
    });
});
