import React from 'react';
import ScoreDisplay from './ScoreDisplay';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';


const SingleQuestionEditor = ({ blockId, responses, setResponses, gradedResults, finalResults }) => (
    <>
        <ReactQuill
            theme="snow"
            value={responses[blockId] || ''}
            onChange={content => {
                setResponses(prev => ({
                    ...prev,
                    [blockId]: content
                }));
            }}
            className="w-full mb-2"
            placeholder="Your answer..."
        />
        <ScoreDisplay
            finalResults={finalResults}
            gradedResults={gradedResults}
            questionId={blockId}
        />
    </>
);

const SubQuestionEditor = ({ question, responses, setResponses, gradedResults, finalResults }) => (
    <div key={question.id} className="mb-4">
        <div 
            className="font-semibold mb-1" 
            dangerouslySetInnerHTML={{ __html: question.prompt }} 
        />
        <ReactQuill
            theme="snow"
            value={responses[question.id] || ''}
            onChange={content => {
                setResponses(prev => ({
                    ...prev,
                    [question.id]: content
                }));
            }}
            className="w-full mb-2"
            placeholder="Your answer..."
        />
        <ScoreDisplay
            finalResults={finalResults}
            gradedResults={gradedResults}
            questionId={question.id}
        />
    </div>
);

const QuestionBlock = ({ block, setResponses, responses, gradedResults, finalResults }) => {
    return (
        <div>
            <div 
                className="font-semibold mb-1" 
                dangerouslySetInnerHTML={{ __html: block.prompt }} 
            />
            {block.subQuestions.length > 0 ? (
                <div className="ml-4 border-l-2 pl-2">
                    {block.subQuestions.map((sq, j) => (
                        <SubQuestionEditor
                            key={sq.id || j}
                            question={sq}
                            responses={responses}
                            setResponses={setResponses}
                            gradedResults={gradedResults}
                            finalResults={finalResults}
                        />
                    ))}
                </div>
            ) : (
                <SingleQuestionEditor
                    blockId={block.id}
                    responses={responses}
                    setResponses={setResponses}
                    gradedResults={gradedResults}
                    finalResults={finalResults}
                />
            )}
        </div>
    );
};

export default QuestionBlock;


// React-Quill Fix Explanation
// We fixed the typing issue in the QuestionBlock component by following React's best practices for component organization. Here are the key changes we made:

// Moved Editor Components to Top Level

// Previously, components were defined inside the render method
// This caused React to recreate them on every render
// Moving them outside prevents unnecessary recreation
// QuestionBlock (Parent)
// ├── SingleQuestionEditor (Top Level)
// └── SubQuestionEditor (Top Level)
//Before problematic
// const QuestionBlock = ({ block, ...props }) => {
//     // 🔴 BAD: Component defined inside another component
//     const SingleQuestion = () => (
//         <ReactQuill ... />
//     );
    
//     return <SingleQuestion />;
// };
//After GOOD
// ✅ GOOD: Components defined at top level
// const SingleQuestionEditor = ({ blockId, ...props }) => (
//     <ReactQuill ... />
// );

// const QuestionBlock = ({ block, ...props }) => {
//     return <SingleQuestionEditor ... />;
// };