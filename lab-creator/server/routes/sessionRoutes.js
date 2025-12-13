const express = require('express');
const router = express.Router();
const { gradeQuestion } = require('../controllers/gradeController');
const {loadSession, saveSession, getSessions, deleteSession} = require('../controllers/sessionController');

//ROOT localhost:4000/api/session
router.post('/save-session', saveSession);
router.get('/load-session/:labId',loadSession);
router.get('/get-sessions',getSessions);
router.delete('/delete-session/:labId',deleteSession);

module.exports = router;