import { useState, useRef, useEffect } from "react";
import { createQuestion, createMaterial } from "../models/block";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import axios from "axios";

//useRef allows you to store, access, and mutate variables between renders without re-rendering


function QuestionEditor({ q, onQuestionChange, onQuestionDelete }) {
    //onChange passed down from the parent so everything stays in sync
    const update = (field, value) => {
        //ONCHANGE CREATES A NEW QUESTION OBJECT WITH UQPDATED FIELD  VALUE
        onQuestionChange({ ...q, [field]: value }); //field is the placeholder for any property
        //properties of questionBlock blockType, type, prompt, desc
    };

    const modules = {
        toolbar: [
            ['bold', 'italic', 'underline'],
            ['code-block'], // ✅ Add code block support
            ['clean']
        ]
    }

    //DISPLAY PROMPT TEXT BOX
    return (
        <div className="p-4 border rounded mb-4 bg-white shadow">
            <div className="flex items-start gap-4">
                <div className="flex-1">
                    <ReactQuill
                        type="text"
                        placeholder="Prompt"
                        className="w-full border p-2 mb-2"
                        value={q.prompt}
                        rows={3}
                        onChange={(value) => update("prompt", value)}
                    />
                </div>

                {/*DISPLAY ANSWER KEY. If q has subquestions, don't render*/}
                {q.subQuestions.length === 0 && (
                    <div className="w-64">
                        <label className="block font-semibold mb-1">Answer Key</label>
                        <ReactQuill
                            placeholder="Admin Key"
                            className="w-full border mb-2"
                            value={q.key || ""}
                            onChange={value => update("key", value)}
                            modules={modules}
                            theme="snow"
                        />
                    </div>
                )}

            </div>

            {/* DISPLAY SUB QUESTIONS */}
            {q.subQuestions && q.subQuestions.length > 0 && (
                <div className="ml-4 border-l-2 pl-2">
                    {q.subQuestions.map((sq, i) => (
                        <QuestionEditor
                            key={sq.id}
                            q={sq}
                            onQuestionChange={
                                //pass the updated Sub Q from child to parent in
                                //updatedSubQ
                                updatedSubQ => {
                                    const updatedSubs = q.subQuestions.map((sub, idx) =>
                                        idx === i ? updatedSubQ : sub
                                    );
                                    // Call parent's onQuestionChange to update the parent question
                                    onQuestionChange({ ...q, subQuestions: updatedSubs });
                                }}
                            onQuestionDelete={() => {
                                //filter everything but the q to delete
                                const updatedSubs = q.subQuestions.filter((_, idx) => idx !== i);
                                onQuestionChange({ ...q, subQuestions: updatedSubs });
                            }}
                        />
                    ))}
                </div>
            )}

            <select
                className="border p-2"
                value={q.type}
                onChange={(e) => update("type", e.target.value)}
            >
                <option value="short">Short Answer</option>
                <option value="textarea">Paragraph</option>
                <option value="code">Code Response</option>
            </select>

            <button
                onClick={() => {
                    const nextIndex = (q.subQuestions?.length || 0);
                    const nextLetter = String.fromCharCode(97 + nextIndex); //97=a
                    const newSubQ = createQuestion();
                    newSubQ.prompt = `${nextLetter}.`;
                    const updatedSubs = [...(q.subQuestions || []), newSubQ];
                    onQuestionChange({ ...q, subQuestions: updatedSubs }); //send to parent updated  q's and subQuestions
                }}
                className="bg-green-600 text-white px-4 py-2 rounded"
            >
                Add Sub Question
            </button>
            <button
                onClick={onQuestionDelete}
                className="bg-red-600 text-white px-2 py-1 rounded ml-2"
            >
                Delete
            </button>

        </div>
    );
}

function MaterialEditor({ block, onMaterialChange, onMaterialDelete }) {
    const quillRef = useRef();
    const update = (field, value) => {
        //ONCHANGE CREATES A NEW BLOCK OBJECT WITH UPDATED FIELD AND TYPE VALUES 
        let updatedBlock = { ...block, [field]: value };
        //extract images from content when it changes
        if (field === 'content') {
            const images = extractImagesFromHTML(value);
            updatedBlock.images = images;
        }
        onMaterialChange(updatedBlock);
        //text image block properties blockType, type, content, images
    };

    const extractImagesFromHTML = (html) => { //extracts image url from html
        const div = document.createElement('div');
        div.innerHTML = html;
        const imgs = div.querySelectorAll('img');
        return Array.from(imgs).map(img => img.src);
    };

    const modules = {
        toolbar: [
            ['bold', 'italic', 'underline'],
            ['image'],//default quill image handler
            ['clean']
        ]

    };


    return (
        <div className="p-4 border rounded mb-4 bg-white shadow">
            <ReactQuill
                ref={quillRef}
                placeholder="Paste image or write here"
                rows={8}
                className="w-full border p-2 font-mono mb-2"
                value={block.content}
                // onChange handler doesn't receive a DOM event object, gives you content value directly
                //in other words, you dont need to use e=>e.target.value
                onChange={value => {
                    update("content", value);
                }}
                modules={modules}
            />

            <div className="mt-2 p-2 border bg-gray-50"
                dangerouslySetInnerHTML={{ __html: block.content }} />

            <button
                onClick={onMaterialDelete}
                className="bg-red-600 text-white px-2 py-1 rounded ml-2"
            >
                Delete
            </button>
        </div>
    )
}

function LabBuilder({ blocks, setBlocks, title, setTitle }) {
    //data received from iframe
    const [assignmentId, setAssignmentId] = useState(null);
    const [id,setId] = useState(null);

    //if the handleMessage is not being triggered by the setAssignmentId, then why are we using a useEffect??
    //Set up the listener once when the component mounts (so it’s ready to receive messages).
    // Clean up the listener when the component unmounts (to avoid memory leaks or duplicate listeners).
    useEffect(() => {
        // setAssignmentId is called inside the message handler, which is triggered by messages sent from the parent window.
        // The parent sends the assignment ID via postMessage when the user selects an assignment.
        // The iframe (LabBuilder) listens for this message and updates its state accordingly.
        const handleMessage = (event) => {
            //when printing out event.data.AsssignmentId, it can be undefined due to hot reloading
            if (event.data?.type === 'SET_ASSIGNMENT' && event.data.assignmentId && event.data.title) {
                setAssignmentId(event.data.assignmentId);
                setTitle(event.data.title);
                loadLab(event.data.assignmentId, event.data.title);
            }
        };
        window.addEventListener('message', handleMessage);
        // Cleanup on unmount
        return () =>  window.removeEventListener('message', handleMessage);
        
    }, [setAssignmentId ]);

    const deleteBlock = (id) => {
        setBlocks(blocks.filter(b => b.id !== id)); //remove block with id
    }

    const addMaterialBlock = () => { //type can be text, or image?
        setBlocks([
            ...blocks,
            createMaterial()
        ]);

    }

    const addQuestionBlock = () => {
        setBlocks([
            ...blocks,
            createQuestion()
        ]);
    };

    //update block from child component 
    const updateBlock = (id, updated) => {
        //replace old block with new block
        setBlocks(blocks.map((b) => (b.id === id ? updated : b)));
    };

    const moveBlock = (from, to) => {
        if (to < 0 || to > blocks.length - 1) return;
        const updatedBlocks = [...blocks];
        //remove block is moving
        const [moveBlock] = updatedBlocks.splice(from, 1);
        //you could also do moveBlock= and then call moveBlock[0]
        //move moveBlock to "to" index
        updatedBlocks.splice(to, 0, moveBlock);
        setBlocks(updatedBlocks);
    }

    const saveLab = async () => {
        const lab = { title: title, blocks, assignmentId};
        const response = await axios.post(`${process.env.REACT_APP_SERVER_HOST}/lab/upsert-lab`, lab);
        
    };

    const loadLab = async (id = assignmentId, labTitle = title) => {

        try {
  
            const lab = await import('../lab-tests/U1T6.json');
            setTitle(lab.default.title || "");
            setBlocks(lab.default.blocks || []);
            console.log('Lab loaded from lab.json');
    
         
        } catch (err) {
            console.error('Lab did not load from labController successfully', err.message);
        }
    }

    const exportLabToFolder = () => {
        const lab = { title, blocks };
        const filename = 'lab.json';
        const blob = new Blob([JSON.stringify(lab, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div className="max-w-7xl mx-auto p-10">
            <h1 className="text-2xl font-bold mb-4" style={{ whiteSpace: "pre-line" }}>
                {title}
            </h1>
            <textarea
                type="text"
                className="w-full border p-3 text-xl font-semibold mb-6"
                placeholder="Enter lab title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        saveLab();
                    }
                }}
            />

            {/* DISPLAY BLOCKS */}
            {blocks.map((block, i) => (
                <div key={block.id || i} className="mb-6 flex items-start">
                    {/* Arrow buttons on the left */}
                    <div className="flex flex-col mr-2">
                        <button
                            disabled={i === 0}
                            onClick={() => moveBlock(i, i - 1)}
                            className="bg-gray-300 text-black px-2 py-1 rounded mb-1"
                            title="Move Up"
                        >
                            ↑
                        </button>
                        <button
                            disabled={i === blocks.length - 1}
                            onClick={() => moveBlock(i, i + 1)}
                            className="bg-gray-300 text-black px-2 py-1 rounded"
                            title="Move Down"
                        >
                            ↓
                        </button>
                    </div>
                    {/* Block editor */}
                    <div className="flex-1">
                        {block.blockType === "material" ? (
                            <MaterialEditor
                                key={block.id}
                                block={block}
                                onMaterialChange={(updatedBlock) => updateBlock(block.id, updatedBlock)}
                                onMaterialDelete={() => deleteBlock(block.id)}
                            />
                        ) : (
                            <QuestionEditor
                                key={block.id}
                                q={block}
                                onQuestionChange={(updatedBlock) => updateBlock(block.id, updatedBlock)}
                                onQuestionDelete={() => deleteBlock(block.id)}
                            />
                        )}
                    </div>
                </div>
            ))}

            {/* BUTTONS */}
            <button
                onClick={addMaterialBlock}
                className="bg-green-600 text-white px-4 py-2 rounded mr-2"
            >
                Add Materials
            </button>
            <button
                onClick={addQuestionBlock}
                className="bg-green-600 text-white px-4 py-2 rounded mr-2"
            >
                ➕ Add Question
            </button>
            <button
                onClick={saveLab}
                className="bg-blue-600 text-white px-4 py-2 rounded"
            >
                💾 Save
            </button>
            <button
                onClick={loadLab}
                className="bg-yellow-600 text-white px-4 py-2 rounded mr-2"
            >
                📂 Load
            </button>
            <button
                onClick={exportLabToFolder}
                className="bg-blue-600 text-white px-4 py-2 rounded ml-2"
            >
                ⬇️ Export
            </button>

        </div>
    );
}

export default LabBuilder;


