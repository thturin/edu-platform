const express = require('express');
const router = express.Router();
const { regradeSession,gradeQuestionDeepSeek,calculateScore,gradeQuestionOllama } = require('../controllers/gradeController');


//ROOT localhost:4000/api/grade
router.post('/deepseek', gradeQuestionDeepSeek);
router.post('/ollama', gradeQuestionOllama);
router.post('/calculate-score',calculateScore);
router.post('/regrade',regradeSession);


module.exports = router;