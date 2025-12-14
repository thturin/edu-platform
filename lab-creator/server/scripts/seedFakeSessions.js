#!/usr/bin/env node
// Seed 30 fake sessions for lab preview/grading testing.
// Usage: from lab-creator/server directory -> `node scripts/seedFakeSessions.js`

const path = require('path');
// Load envs from repo root (.env) so Docker/compose values are reused
require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const { Q1_Variants, Q2_Variants, Q3_Variants } = require('./variants');
const { computeFinalScore } = require('../services/gradingService');

const labDbUrl = process.env.LABCREATOR_DATABASE_URL || process.env.DATABASE_URL;
const portalDbUrl = process.env.PORTAL_DATABASE_URL || process.env.DATABASE_URL_PORTAL;

if (!labDbUrl) {
  throw new Error('Missing LABCREATOR_DATABASE_URL (or DATABASE_URL) in root .env');
}
if (!portalDbUrl) {
  throw new Error('Missing PORTAL_DATABASE_URL (or DATABASE_URL_PORTAL) in root .env');
}

const prisma = new PrismaClient({ datasources: { db: { url: labDbUrl } } });
const prismaPortal = new PrismaClient({ datasources: { db: { url: portalDbUrl } } });

const LAB_ID = 31;
const LAB_TITLE = 'Test_1';
const COUNT = 30;

const QUESTION_IDS = {
  q1: '1765677952441',
  q2: '1765678234439',
  q3: '1765678253268',
};

// Simple local grader for seed data (no API calls)
const gradeSeedResponses = (responses) => {
  const gradedResults = {};
  for (const [questionId, answer] of Object.entries(responses)) {
    const hasAnswer = typeof answer === 'string' ? answer.trim().length > 0 : Boolean(answer);
    gradedResults[questionId] = {
      score: hasAnswer ? 1 : 0,
      feedback: hasAnswer ? 'Auto-graded seed: assumed correct' : 'No answer provided',
    };
  }
  const finalScore = computeFinalScore(gradedResults);
  return { gradedResults, finalScore };
};


async function main() {
  const lab = await prisma.lab.findUnique({ where: { id: LAB_ID } });
  if (!lab) {
    console.error(`Lab ${LAB_ID} (${LAB_TITLE}) not found. Aborting.`);
    return;
  }

  await prisma.session.deleteMany({ where: { labId: LAB_ID } });

  const portalUsers = await prismaPortal.user.findMany({
    where: { username: { startsWith: 'dev-student-' } },
    select: { id: true, username: true },
  });
  const portalUserMap = new Map(portalUsers.map((u) => [u.username, u.id]));

  const now = new Date();
  const data = Array.from({ length: COUNT }, (_, idx) => {
    const n = idx + 1;
    const username = `dev-student-${n}`;
    const resp = {
      [QUESTION_IDS.q1]: Q1_Variants[idx % Q1_Variants.length],
      [QUESTION_IDS.q2]: Q2_Variants[idx % Q2_Variants.length],
      [QUESTION_IDS.q3]: Q3_Variants[idx % Q3_Variants.length],
    };

    const userId = portalUserMap.get(username);
    if (!userId) {
      console.warn(`Portal user missing for ${username}; falling back to synthetic id ${1000 + n}`);
    }



    const { gradedResults, finalScore } = gradeSeedResponses(resp);

    return {
      labId: LAB_ID,
      labTitle: LAB_TITLE,
      username,
      userId: userId ?? 1000 + n,
      responses: resp,
      gradedResults,
      finalScore,
      createdAt: new Date(now.getTime() - n * 60 * 1000),
      lastModified: now,
    };
  });

  await prisma.session.createMany({ data });

  console.log(`Seeded ${COUNT} sessions for lab ${LAB_ID} (${LAB_TITLE}).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await prismaPortal.$disconnect();
  });
