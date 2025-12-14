#!/usr/bin/env node
// Seed 30 fake submissions for local testing.
// Usage: from portal/server directory -> `node scripts/seedFakeSubmissions.js`

const path = require('path');
// Load env from repo root (.env) so Docker/compose values are reused
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const { PrismaClient } = require('@prisma/client');

const portalDbUrl = process.env.PORTAL_DATABASE_URL || process.env.DATABASE_URL;
if (!portalDbUrl) {
    throw new Error('Missing PORTAL_DATABASE_URL (or DATABASE_URL) in root .env');
}

const prisma = new PrismaClient({ datasources: { db: { url: portalDbUrl } } });

async function main() {
    const SECTION_ID = 18; // set to your test section id
    const ASSIGNMENT_ID = 35; // set to your test assignment id
 

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

  
    }

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
