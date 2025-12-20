const express = require('express');
const router = express.Router();
const { gradeQuestion } = require('../controllers/gradeController');
const {loadSession, saveSession, getSessions, deleteSession,getSessionsByLabId} = require('../controllers/sessionController');

//ROOT localhost:4000/api/session
router.post('/save-session', saveSession);
router.get('/load-session/:labId',loadSession);
router.get('/get-sessions',getSessions);
//api/get-sessions/labId?labId=1
router.get('/get-sessions/labId',getSessionsByLabId);
router.delete('/delete-session/:labId',deleteSession);

module.exports = router;