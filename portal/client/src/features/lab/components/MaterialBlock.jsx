
import React from 'react';
import { getImageUrlsFromHtml } from './fetchImages';

const MaterialBlock = ({ content }) => {
    return (
        <div className="mt-2 p-2 border bg-gray-50"
            dangerouslySetInnerHTML={{ __html: getImageUrlsFromHtml(content) }} />
    );
}

export default MaterialBlock;
