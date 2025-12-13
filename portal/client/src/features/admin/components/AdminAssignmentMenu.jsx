import React from 'react';
import CreateAssignment from './CreateAssignment';
import EditAssignment from './EditAssignment';

const AdminAssignmentMenu = ({
    setSelectedAssignmentId,
    selectedAssignmentId,
    assignments,
    selectedAssignmentObj,
    setTitle,
    onAssignmentUpdate,
    onAssignmentDelete,
    onAssignmentCreate
}) => {


    const showCreateAssignment = selectedAssignmentId === -2;

    
    return (<>
        <div style={{
            maxWidth: '600px',
            margin: '20px auto',
            padding: '20px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            backgroundColor: '#f9f9f9'
        }}>
            <h3 style={{ textAlign: 'center', marginTop: 0 }}>Select or Create Assignment</h3>

            {/* DROP DOWN MENU FOR ASSIGNMENTS */}
            <div style={{ marginBottom: '15px' }}>
                <label style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontWeight: 'bold'
                }}>
                    Assignment:
                </label>
                <select
                    value={selectedAssignmentId} //value that gets passed is not the text but assignment id
                    onChange={e => {
                        //if there is no target value because nothing has been selected, return -1
                        const val = Number(e.target.value);
                        setSelectedAssignmentId(val || -1);
                        //setTitle to the assignment list selection
                        if (e.target.value !== "-2") setTitle(assignments.find((a) => a.id === val)?.title ?? '');
                    }}
                    style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '14px'
                    }}
                >
                    <option value="-1">Select an Assignment</option>
                    <option value="-2">➕ Create New Assignment</option>
                    {assignments.map(ass => (
                        <option key={ass.id} value={ass.id}>
                            {ass.title}
                        </option>
                    ))}
                </select>
            </div>

            {showCreateAssignment && <CreateAssignment
                onAssignmentCreate={onAssignmentCreate} />}

            {/* DISPLAY SELECTED ASSIGNMENT (DUE DATE, TITLE, TYPE ) */}
            {selectedAssignmentObj && (<EditAssignment setSelectedAssignmentId={setSelectedAssignmentId} selectedAssignmentObj={selectedAssignmentObj} onAssignmentDelete={onAssignmentDelete} onAssignmentUpdate={onAssignmentUpdate} />)}

        </div>
    </>);
}

export default AdminAssignmentMenu;