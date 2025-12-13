import React from 'react';
import { getImageUrlsFromHtml } from './fetchImages';

export default function Explanation({ content }) {
    if (!content) return null;
    return (
        <div className="mt-3 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900 shadow-[0_1px_0_rgba(12,74,110,0.05)]">
            <div className="mb-1 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sky-800">
                <span className="h-2 w-2 rounded-full bg-sky-500" aria-hidden="true" />
                Explanation
            </div>
            <div
                className="leading-relaxed"
                dangerouslySetInnerHTML={{ __html: getImageUrlsFromHtml(content) }}
            />
        </div>
    );
}
