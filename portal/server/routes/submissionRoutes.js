const express = require('express');//load express
const router = express.Router(); //create a new router object  (mini express app -> for handling routes)
const {
    getSubmissionRegradeStatus,
    requestSubmissionRegradeDueDate,
    requestSubmissionRegrade,
    upsertGithubSubmission, 
    upsertLabSubmission,
    verifyGithubOwnership, 
    getAllSubmissions,
    getSubmission,
    manualUpdateSubmissionGrade,
    deleteSubmissions} = require('../controllers/submissionController'); //call the handleSubmission function from submissionController 


// benefits of adding middleware
// 1. security _ prevents unauthenticated users from submitting assignments
// 2. can access req.user in all your controllers for github verification
// 3. protection 

//wasn't working initially because the frontend wasn't sending session cookies 
const ensureAuthenticated = (req,res,next)=>{
    // console.log( 'AUTH CHECK',{
    //     isAuthenticated: req.isAuthenticated(),
    //     user:req.u
    // });
    // if(req.isAuthenticated()){
    //     return next();
    // }
    // res.status(401).json({error:'Authentication is required'});
}
//router.get('/submissions', ensureAuthenticated, getAllSubmissions); // 

//ROOT / ISS LOCALHOST:5000/api
router.get('/submissions', getAllSubmissions); //this pathway is relative to the base path set in app.js (api/submit)
router.get('/submissions/:id',getSubmission);
router.post('/submissions/upsertLab',upsertLabSubmission);
router.post('/submissions/upsertGithub',upsertGithubSubmission);
router.post('/submissions/update-late-grade',requestSubmissionRegradeDueDate);
router.post('/submissions/manual-regrade',manualUpdateSubmissionGrade);
router.post('/submissions/regrade',requestSubmissionRegrade);
router.get('/submissions/regrade/:jobId',getSubmissionRegradeStatus);
router.post('/verify-github-ownership',verifyGithubOwnership);
router.delete('/submissions/delete-submissions/:assignmentId',deleteSubmissions);



module.exports = router; //export router object so your main server file can use it