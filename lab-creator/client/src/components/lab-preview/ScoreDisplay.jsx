import React from 'react';

const ScoreDisplay = ({ finalResults, gradedResults, questionId }) => {
    //no finalResults means no submissions. Do not show score and feedback
    if(!finalResults) return null;

    let result = gradedResults[questionId];
    if(!result){
        result = {
            score:0,
            feedback: "no response"
        };
    }

    return (
        <div className="mt-2 p-2 bg-green-50 border rounded text-sm">
            <div><strong>Score:</strong> {result?.score}</div>
            <div><strong>Feedback:</strong> {result?.feedback}</div>
        </div>
    );
}

export default ScoreDisplay;