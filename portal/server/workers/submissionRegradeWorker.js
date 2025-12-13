const { Worker } = require('bullmq');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const { redisOptions } = require('../config/redis');
const { calculateLateScore } = require('../controllers/submissionController');
const { scoreGithubSubmission } = require('../controllers/submissionController');
const prisma = new PrismaClient();
const path = require('path');

const workerDueDate = new Worker('submission-regrade-duedate', async job => {
    const { assignmentId } = job.data;
    const submissions = await prisma.submission.findMany({
        where: { assignmentId: Number(assignmentId) },
        include: { assignment: true }
    });
    //loop through each submission and re-calculat the late score 
    for (const submission of submissions) {
        if (!submission.assignment) continue;
        const dueDateString = submission.assignment.dueDate.toISOString();
        const submittedAt = submission.submittedAt;
        const newScore = calculateLateScore(submittedAt, dueDateString, submission.rawScore);
        await prisma.submission.update({
            where: { id: submission.id },
            data: { score: newScore }
        });
    }

}, { connection: redisOptions });


workerDueDate.on('completed', job => console.log('Submission regrade completed', job.id));
workerDueDate.on('failed', (job, err) => console.error('Submission regrade failed', job?.id, err));

//redis BullMQ has no http involved (no requests or responses)
//controllers respond to API calls, workers handle background tasks.

// Removed unused buildFinalScore helper

const worker = new Worker('submission-regrade', async job => {
    const { assignmentId, dryRun, sectionId } = job.data;
    const dryRunSummaries = [];
    const submissions = await prisma.submission.findMany({
        where: {
            assignmentId:Number(assignmentId),
            //if sectionId is null, no section filter is applied. query will fetch all submissions for hte given assignmentId
            ...(sectionId ? { user: { sectionId: Number(sectionId) } } : {})
        },
        include: { assignment: true, user: true } //include the actual assignment 
    });
   
    for (const submission of submissions) {
         const assignment = submission.assignment;
        if (!assignment) continue;
        const tempDir = path.join(__dirname, '../tmp', `${submission.id}-${Date.now()}`);
        if (assignment.type === 'github') {
            const result = await scoreGithubSubmission(
                submission.url,
                tempDir,
                submission.submittedAt,
                assignment.dueDate
            );

            //IF A DRY RUN, DO NOT UPDATE SUBMISSIONS
            if (dryRun) {
                const summary = {
                    submissionId: submission.id,
                    user: submission.user?.username,
                    type: 'github',
                    result
                };
                dryRunSummaries.push(summary);
                await job.log(JSON.stringify(summary));
                continue;//WILL SKIP SUBMISSION UPDATE BELOW
            }

            await prisma.submission.update({
                where: { id: submission.id },
                data: {
                    rawScore: result.rawScore ?? 0,
                    score: result.score
                    //feedback: result.output
                }
            });
        }
        if (assignment.type === 'lab' && assignment.labId) {
            try {
                // Load session responses for this student/lab
                const sessionResponse = await axios.get(`${process.env.LAB_CREATOR_API_URL}/session/load-session/${assignment.labId}`, {
                    params: {
                        userId: submission.userId,
                        username: submission.user?.username
                    }
                });
                //need to get aiPrompt
                const labResponse = await axios.get(`${process.env.LAB_CREATOR_API_URL}/lab/load-lab`, {
                params: { assignmentId }
                });
                if(!labResponse){
                    console.warn(`Lab  missing for submission ${submission.id}`);
                    continue;//go to next iteration
                } 
                const {aiPrompt, blocks=[]} = labResponse.data;
                
            
                //filter all questions and sub questions into a single array
                const allQuestions = blocks.flatMap(block=>{
                    //console.log(block.subQuestions ? block.subQuestions : 'no subs');
                    if(block.blockType!=='question') return []; //[] will produce not output {} will put {} n he output
                    
                    //if subquestions exists, find and filter the isScored
                    const scoredSubQuestions = (block.subQuestions || [] ).filter(sq=>sq.isScored);
                    //console.log('scoredSubQuestions--->',scoredSubQuestions);
                    if(scoredSubQuestions?.length){//return the subquestions of the current block
                        return scoredSubQuestions;
                    }else{
                        if(block.isScored) return block; //if there's no sub questions, and block is scored,return
                    }
                    return [];
                });
  
                //create a new array of objects that contain the prompt, key, and type
                const questionLookup = allQuestions.reduce((acc, question)=>{
                    acc[question.id] = {
                        prompt: question.prompt,
                        key: question.key,
                        type: question.type
                    };
                    return acc;
                },{});
                
                const session = sessionResponse.data.session;
                if (!session) {
                    console.warn(`Lab session missing for submission ${submission.id}`);
                    continue;//go to next iteration
                }

                // Regrade via lab API GRADECONTROLLER
                const regradeResponse = await axios.post(`${process.env.LAB_CREATOR_API_URL}/grade/regrade`, {
                    responses: session.responses,
                    questionLookup,
                    userId: submission.userId,
                    labId: assignment.labId,
                    dryRun,
                    aiPrompt
                });

                const regradeResult = regradeResponse.data || {};
             
             
                if (dryRun) {
                    const summary = {
                        submissionId: submission.id,
                        user: submission.user?.username,
                        type: 'lab',
                        gradedResults: regradeResult.gradedResults || {},
                        finalScore: regradeResult.finalScore || null
                    };
                    dryRunSummaries.push(summary);
                    await job.log(JSON.stringify(summary));
                    continue;
                }
                //update the submission's rawScore and score
                const rawScore = Number(regradeResult.finalScore?.percent) || 0;
                await prisma.submission.update({
                    where: { id: submission.id },
                    data: {
                        rawScore,
                        score: calculateLateScore(submission.submittedAt, assignment.dueDate, rawScore)
                        // feedback: regradeResult.output
                    }
                });
            } catch (err) {
                console.error('Lab regrade failed for submission', submission.id, err.message);
            }
        }
    }

    if (dryRun) {
        return dryRunSummaries;
    }

},{connection:redisOptions});

worker.on('completed', job => console.log('Submission regrade (full) completed', job.id));
worker.on('failed', (job, err) => console.error('Submission regrade (full) failed', job?.id, err));

module.exports = { workerDueDate, worker };

