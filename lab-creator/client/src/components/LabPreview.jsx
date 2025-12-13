import axios from "axios";
import { useState, useEffect } from 'react';
import { createSession } from '../models/session';
import MaterialBlock from './lab-preview/MaterialBlock';
import QuestionBlock from './lab-preview/QuestionBlock';



function LabPreview({ blocks, setBlocks, title, setTitle }) {
    const studentId = '1234';
    const [responses, setResponses] = useState({});
    const [gradedResults, setGradedResults] = useState({}); //object, not id
    const [finalResults, setFinalResults] = useState();
    const [sessionLoaded, setSessionLoaded] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    //data received from ifrmae (dom)
    const [assignmentId, setAssignmentId] = useState(null);
    const [labId, setId] = useState(null);

    //if the handleMessage is not being triggered by the setAssignmentId, then why are we using a useEffect??
    //Set up the listener once when the component mounts (so it’s ready to receive messages).
    // Clean up the listener when the component unmounts (to avoid memory leaks or duplicate listeners).
    useEffect(() => {
        // setAssignmentId is called inside the message handler, which is triggered by messages sent from the parent window.
        // The parent sends the assignment ID via postMessage when the user selects an assignment.
        // The iframe (LabBuilder) listens for this message and updates its state accordingly.
        const handleMessage = (event) => {
            if (event?.data.type!=='SET_ASSIGNMENT') return;
            //when printing out event.data.AsssignmentId, it can be undefined due to hot reloading
            console.log('here is the event data-->',event.data.type);
            if (event.data.type === 'SET_ASSIGNMENT' && event.data.assignmentId) {
                setAssignmentId(event.data.assignmentId);
                setId(event.data.labId); //not sure if I need to send the lab data
                loadLab(event.data.assignmentId);
            }
        };
        window.addEventListener('message', handleMessage);
        // Cleanup on unmount
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [setAssignmentId]);
    
    const allQuestions = [
        //filter questions without subquestions
        ...blocks.filter(b => b.blockType === "question" && (!b.subQuestions || b.subQuestions.length === 0))
        //filter questions with subquestions
        , ...blocks.filter(b => b.blockType === "question" && b.subQuestions.length > 0).flatMap(b => b.subQuestions)
        // const arr = [[1, 2], [3, 4]];
        // const result = arr.flatMap(x => x);
        // console.log(result); // [1, 2, 3, 4]
    ];

    const loadLab = async(id=assignmentId)=>{
         try {
            const response = await axios.get(`${process.env.REACT_APP_SERVER_HOST}/lab/load-lab`, {
                params: { assignmentId: id, title }
            });
            setBlocks(response.data.blocks);
            setTitle(response.data.title);
            setId(response.data.id);
        } catch (err) {
            console.error('Lab did not load from labController successfully', err.message);
        }
    };
    

    useEffect(() => { // console.log() happens faster than fetchSession() use this to track values
        if (sessionLoaded) {
            console.log('State updated:', {
                responses,
                finalResults,
                gradedResults
            });
        }
    }, [responses, finalResults, gradedResults, sessionLoaded]);


    //LOAD SESSION
    useEffect(() => { //on  mount, load json 
        //extract responses, graded results and final score
        //ENSURE THIS HAPPENS BEFORE AUTOSAVE USE EFFECT
        const fetchSession = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_SERVER_HOST}/session/load-session/${title}`);
                if (response.error) {
                    console.log(response.error);
                    return;
                }
                if (response.data.session.responses && Object.keys(response.data.session.responses).length > 0) {
                    setResponses(response.data.session.responses);
                }
                // Only set if gradedResults is not empty
                if (response.data.session.gradedResults && Object.keys(response.data.session.gradedResults).length > 0) {
                    setGradedResults(response.data.session.gradedResults);
                }
                // Only set if finalScore exists
                if (response.data.session.finalScore && response.data.session.finalScore.totalScore !== undefined) {
                    setFinalResults(response.data.session.finalScore.totalScore);
                }
                setSessionLoaded(true);
            } catch (err) {
                console.error('Error in getResponse()', err);
            };
        }
        fetchSession();
    }, []);

    //SAVE SESSION - save 
    useEffect(() => { //useeffect cannot be async
        const saveSession = async () => {
            if (!title || !studentId || !sessionLoaded) return; //if not title was created or studentId is not found, don't update
            const session = createSession();
            session.labInfo.title = title;
            if (responses) session.responses = responses;
            session.gradedResults = gradedResults;
            
            //do not need await because we are not receving json
            axios.post(`${process.env.REACT_APP_SERVER_HOST}/session/save-session`, session)
                .catch(err => {
                    console.log('save session error', err);
                });
        };

        const timeoutId = setTimeout(saveSession, 1000); //add 1 second delay 
        return () => clearTimeout(timeoutId);
    }, [responses, gradedResults, finalResults, sessionLoaded]);


    const submitResponses = async () => {
        setIsSubmitting(true);
        let newGradedResults = { ...gradedResults };//create a new grade results to add empty
        //LOOP THROUGH RESPONSES
        for (const [questionId, userAnswer] of Object.entries(responses)) {
            //questionId is a string
            let answerKey = '';
            let question = '';
            let type = '';
            //THIS ASSUMES SUB QUESTIONS DO NOT HAVE SUB QUESTIONS
            //LOOP THROUGH BLOCKS AND ASSIGN ANSWERKEY, QUESTIOHN, TYPE
            for (const block of blocks) { //FIND BLOCK 
                if (block.blockType === 'question' &&
                    block.subQuestions.length === 0 &&
                    block.id === questionId) {
                    answerKey = block.key;
                    question = block.prompt;
                    type = block.type;
                    break;
                }
                if (block.blockType === 'question' && //FIND SUBQUESTION BLOCK
                    block.subQuestions.length > 0) {
                    for (const sq of block.subQuestions) {
                        if (sq.id === questionId) {
                            answerKey = sq.key;
                            question = sq.prompt;
                            type = sq.type;
                            break;
                        }
                    }
                }
            }

            try {
                const response = await axios.post(`${process.env.REACT_APP_SERVER_HOST}/grade`, {
                    userAnswer,
                    answerKey,
                    question,
                    questionType: type
                });
                //UPDATED GRADEDRESULTS 
                newGradedResults = {
                    ...newGradedResults,
                    [questionId]: { //add or update current gradedResult with questionId
                        score: response.data.score,
                        feedback: response.data.feedback
                    }
                }
            } catch (err) {
                console.error("Error grading in LabPreview [LabPreview.jsx]");
            } 
        } //END OF FOR LOOP
        //FOR QUESTIONS THAT WERE LEFT BLANK, CREATE A NEW OBJECT IN GRADEDRESULTS 
        //WITH SCORE 0 AND NO RESPONSE
        allQuestions.forEach(q => {
            //if new gradedResults does not contain this id,
            if (!newGradedResults[q.id]) {
                newGradedResults[q.id] = {
                    score: 0,
                    feedback: "no response"
                }
            }
        });

        //useStates are inherintley async. We don't want to wait on setGradedResults 
        //to update. If it doesn't update before grade/calculate-score call, it will cause an issue
        setGradedResults(newGradedResults);
        //   "123": { score: 1, feedback: "Good!" },  
        //CALCULATE FINAL SCORE 
        try {
            const response = await axios.post(`${process.env.REACT_APP_SERVER_HOST}/grade/calculate-score`, {
                gradedResults: newGradedResults, //use variable instead
                title
            });
            console.log('data received for calculate-score', response.data.session.finalScore);
            setFinalResults(response.data.session.finalScore);
            // {
            //     "percent": null,
            //     "maxScore": 0,
            //     "totalScore": 0
            // }
        } catch (err) {
            console.error('error calculating final score', err);
        }finally {
                setIsSubmitting(false); //stop loading regardless of success/failure
            }
    }

    return (
        <>
            {/* LAB PREVIEW */}
            <div className="ml-8">
                <div className="mt-8 p-6 border rounded bg-gray-100">
                    <h2 className="text-xl font-bold mb-4">Lab Preview</h2>
                </div>
                <div>
                    <h3 className="font-semibold mb-2">{title}</h3>
                </div>
                {/* LIST BLOCKS AND DISPLAY */}
                {blocks.map((block, i) => (
                    <div key={block.id || i} className="mb-6">

                        {/* DISPLAY A MATERIAL */}
                        {block.blockType === "material" ? (
                            <MaterialBlock content={block.content} />
                        ) : (
                            // DISPLAY A QUESTION OR SUBQUESTION
                            <QuestionBlock
                                block={block}
                                setResponses={setResponses}
                                responses={responses}
                                gradedResults={gradedResults}
                                finalResults={finalResults}
                            />
                        )}
                    </div>
                ))}
                <button
                    onClick={submitResponses}
                    disabled={isSubmitting}
                    className={`bg-purple-600 text-white px-4 py-2 rounded mt-4 flex items-center ${isSubmitting ? 'opacity-75 cursor-not-allowed' : ''
                        }`}
                >
                    {isSubmitting ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Submitting...
                        </>
                    ) : (
                        'Submit'
                    )}
                </button>
                {/*OUTPUT FINAL SCORE */}
                {gradedResults && finalResults && (
                    <div className="mb-6 p-4 border rounded bg-blue-50">
                        <h3 className="font-bold mb-2">Score</h3>
                        Total Score: {parseFloat(finalResults.totalScore).toFixed(2)} / {finalResults.maxScore}----{finalResults.percent}%
                    </div>
                )}
            </div>
        </>

    )
}


export default LabPreview;