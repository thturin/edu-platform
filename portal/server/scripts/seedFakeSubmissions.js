#!/usr/bin/env node
// Seed 30 fake submissions for local testing.
// Usage: from portal/server directory -> `node scripts/seedFakeSubmissions.js`

const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Load env (DATABASE_URL) from the server .env
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function main() {
    const SECTION_ID = 18; // set to your test section id
    const ASSIGNMENT_ID = 35; // set to your test assignment id
    const USERS_TO_CREATE = 30;

    // Look up required records; abort if missing to avoid bad data
    const section = await prisma.section.findFirst({ where: { id: SECTION_ID } });
    if (!section) {
        console.error(`Section ${SECTION_ID} not found. Aborting.`);
        return;
    }

    const assignment = await prisma.assignment.findFirst({ where: { id: ASSIGNMENT_ID } });
    if (!assignment) {
        console.error(`Assignment ${ASSIGNMENT_ID} not found. Aborting.`);
        return;
    }

    // Wipe existing submissions for this assignment to avoid unique collisions
    await prisma.submission.deleteMany({ where: { assignmentId: assignment.id } });

    const submissions = [];
    for (let i = 1; i <= USERS_TO_CREATE; i++) {
        const username = `dev-student-${i}`;

        let user = await prisma.user.findFirst({ where: { username } });
        if (!user) {
            user = await prisma.user.create({
                data: {
                    username,
                    firstName: 'Dev',
                    lastName: `Student${i}`,
                    role: 'student',
                    sectionId: section.id,
                    password: '123',
                },
            });
        }

        submissions.push({
            url: `https://example.com/repo/${username}`,
            language: 'javascript',
            score: null,
            rawScore: null,
            feedback: null,
            submittedAt: new Date(Date.now() - i * 60 * 60 * 1000),
            assignmentId: assignment.id,
            userId: user.id,
        });
    }

    await prisma.submission.createMany({ data: submissions });

    console.log(`Seeded ${USERS_TO_CREATE} submissions for assignment ${assignment.id} in section ${section.id}.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
