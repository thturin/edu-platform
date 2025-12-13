
import React from 'react';


const MaterialBlock = ({ content }) => {
    return (
        <div className="mt-2 p-2 border bg-gray-50"
            dangerouslySetInnerHTML={{ __html: content }} />
    );
}

export default MaterialBlock;