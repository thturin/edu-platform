const axios = require('axios');
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();



const calculateScore = async (req, res) => {
    console.log('--------calculating score-----------');
    console.time('calculateScore');
    const { gradedResults, labId, userId } = req.body;
    //console.log(Array.isArray(gradedResults));
    if (!gradedResults) return res.status(400).json({ error: 'gradedResults is missing' });
    // console.log('HERE ARE THE GRADED RESULTS ->>>>',gradedResults);
    let maxPoints = Object.keys(gradedResults).length;
    let totalPoints = 0;

    for (const key in gradedResults) {
        totalPoints += gradedResults[key].score;
    }

    let percent = ((totalPoints / maxPoints) * 100).toFixed(1);

    const finalScore = {
        percent,
        maxScore: maxPoints,
        totalScore: totalPoints
    };
    console.log(finalScore);

    try {
        console.time('prismaUpdate');
        const updatedSession = await prisma.session.update({
            where: { labId_userId: { labId, userId } },
            data: { finalScore }
        });
        console.timeEnd('prismaUpdate');
        console.timeEnd('calculateScore');
        //console.log(updatedSession);
        return res.json({ session: updatedSession });
    } catch (err) {
        console.error('Error in calculateScore', err);
        return res.status(500).json({ error: 'error calculating score' });
    }
}
const parseScoreFeedback = (raw) => {
    try {

        //check deepseek response if it is actuall a string {score: number, feedback:string}
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw; //parse it into json if not already
        const score = Number(parsed?.score);
        const feedback = typeof parsed?.feedback === 'string' ? parsed.feedback.trim().slice(0,400) : '';

        if (Number.isFinite(score) && score >= 0 && score <= 1 && feedback.length > 0) {
            return { score, feedback };
        }
    } catch (err) {
        console.warn('DeepSeek parse error', err.message);
    }

    return { score: 0, feedback: 'Model response malformed or empty' };
};

const buildPrompt = ({ userAnswer, answerKey, question, questionType, AIPrompt }) => {
    const basePrompt = AIPrompt || ``;

    return `compare the student's answer to the answer key. 
            Answer Key: ${answerKey}
            Student Answer: ${userAnswer}
            Question: ${question}
            Question Type: ${questionType}
            AI Prompt: ${basePrompt}.
            You are an empathetic grading assistant that responds only with a 
            JSON object with EXACTLY { "score": number, "feedback": string }. 
            Compare the student answer to the answer key, look for misconceptions, 
            and explain how to correct them. Mention the specific concept they misunderstood, 
            point toward the right reasoning, and suggest one next step (e.g., revisit a definition or example).
            Be kind, concise, and avoid grammar penalties. Feedback should be ≤400 characters.
            The response will be be in html but ignore all html artifacts and just analyze the text.
            Is the student's answer correct, give a score from 0 to 1 and a brief feedback.
            If the response is empty, just respond with 'response is empty' `
};

// we need this function separate becauyse before we were trying to call 
//gradeQuestionDeepSeek inside regradeSession which means we were sending a plain object with 
//to the function that wanted (req,ress)-> this can cause an issue.
//now we call this function direectly in regradeSession
//we think this solution will fix the problem with production timing for dry regrade
const gradeWithDeepSeek = async ({ userAnswer, answerKey, question, questionType, AIPrompt, timeoutMs = 20000 }) => {
    if (!process.env.DEEPSEEK_API_KEY) {
        throw new Error('DEEPSEEK_API_KEY is not configured');
    }

    const prompt = buildPrompt({ userAnswer, answerKey, question, questionType, AIPrompt });

    const response = await axios.post(
        'https://api.deepseek.com/chat/completions',
        {
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: 'You are a grading assistant that responds ONLY with a single JSON object.' },
                { role: 'user', content: prompt }
            ],
            response_format: {
                type: 'json_object'
            },
            temperature: 0.2,
            max_tokens: 200
        },
        {
            headers: {
                Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: timeoutMs
        }
    );

    const raw = response.data?.choices?.[0]?.message?.content || '';
    return parseScoreFeedback(raw);
};


const gradeQuestionDeepSeek = async (req, res) => {
    const { userAnswer, answerKey, question, questionType, AIPrompt } = req.body;
    const hasUserAnswer = Boolean(userAnswer && userAnswer.trim().length > 0);
    const hasAnswerKey = Boolean(answerKey && answerKey.trim().length > 0);
    if (!hasUserAnswer) {
        return res.status(400).json({ score: 0, feedback: 'No response submitted' });
    }
    if (!hasAnswerKey) {
        return res.status(400).json({ score: 1, feedback: 'Answer key missing; awarding full credit' });
    }

    try {
        const result = await gradeWithDeepSeek({ userAnswer, answerKey, question, questionType, AIPrompt });
        return res.json(result);
    } catch (err) {
        console.log('Error in accessing deep seek api. Request failed.', err.message);
        return res.status(400).json({ error: 'cannot access deep seek api' });
    }
};


//this is called asynchronously with redis
const regradeSession = async (req, res) => {
    const { labId, userId, responses, questionLookup, dryRun = true, aiPrompt } = req.body;
    if (!labId || !userId || !responses || !questionLookup) {
        return res.status(400).json({ error: 'labId, userId, responses, questionLookup are required' });
    }

    try {
        const regradedResults = {};

        for (const [questionId, userAnswer] of Object.entries(responses)) {
            const details = questionLookup[questionId];
            if (!details) {
                console.warn(`question metadata missing for id ${questionId} in regradeSession`);
                continue;
            }

            try {
                const result = await gradeWithDeepSeek({
                    userAnswer,
                    answerKey: details.key,
                    question: details.prompt,
                    questionType: details.type,
                    AIPrompt: aiPrompt
                });

                regradedResults[questionId] = {
                    score: result.score,
                    feedback: result.feedback
                };
            } catch (err) {
                console.error(`Error grading question ${questionId} during regrade`, err.message);
            }
        }

        const maxPoints = Object.keys(regradedResults).length;
        const totalPoints = Object.values(regradedResults).reduce((sum, result) => sum + result.score, 0);
        const finalScore = {
            percent: maxPoints ? ((totalPoints / maxPoints) * 100).toFixed(1) : '0.0',
            maxScore: maxPoints,
            totalScore: totalPoints
        };

        const responsePayload = {
            gradedResults: regradedResults,
            finalScore,
            rawScore: totalPoints
        };

        if (dryRun) { //if the admin is doing dryRun, return data
            return res.json(responsePayload);
        }

        const updatedSession = await prisma.session.update({
            where: { labId_userId: { labId, userId } },
            data: { finalScore, gradedResults: regradedResults }
        });

        return res.json({
            ...responsePayload,
            session: updatedSession
        });
    } catch (err) {
        console.error('regradeSession error', err.message);
        return res.status(500).json({ error: 'Failed to regrade lab session' });
    }
};


/// USELESS WITHOUT BETTER HARDWARE 
const gradeQuestionOllama = async (req, res) => {
    // const ollamaHost = process.env.OLLAMA_HOST;
    // try {
    //     const { model = 'deepseek-coder:6.7b', temperature = 0.2, userAnswer, answerKey, question, questionType, AIPrompt } = req.body;
    //     const hasUserAnswer = Boolean(userAnswer && userAnswer.trim().length > 0);
    //     const hasAnswerKey = Boolean(answerKey && answerKey.trim().length > 0);

    //     if (!hasUserAnswer) {
    //         return res.status(400).json({ score: 0, feedback: 'No response submitted' });
    //     }
    //     if (!hasAnswerKey) {
    //         return res.status(400).json({ score: 1, feedback: 'Answer key missing; awarding full credit' });
    //     }
    //     if (!model) {
    //         return res.status(400).json({ error: 'model missing' });
    //     }

    //     const response = await axios.post(`${ollamaHost}/api/generate`, {
    //         model,
    //         prompt: buildPrompt({ userAnswer, answerKey, question, questionType, AIPrompt }),
    //         temperature
    //     });

    //     // Only return the payload, not the full axios response (which is circular)
    //     return res.json(response.data);

    // } catch (err) {
    //     console.error('Ollama request failed', err.message);
    //     return res.status(502).json({ error: 'Failed to reach Ollama', detail: err.message });
    // }
};



module.exports = { regradeSession, gradeQuestionDeepSeek, calculateScore,gradeQuestionOllama };