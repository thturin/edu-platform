
import React, { useState } from 'react';
import axios from 'axios';

const SubmissionRegrade = ({ assignmentId, selectedSection = null, onRegradeApplied = () => {} }) => {
  const [status, setStatus] = useState(null);
  const [dryRunLoading, setDryRunLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [dryRunSummaries, setDryRunSummaries] = useState([]);

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const pollJobStatus = async (jobId) => {
    const maxAttempts = 120; // wait up to ~2 minutes
    let lastState = null;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const statusRes = await axios.get(
          //print logs 
          `${process.env.REACT_APP_API_HOST}/submissions/regrade/${jobId}`,
          {
            headers: { 'Cache-Control': 'no-cache' },
            params: { t: Date.now() } // cache bust to avoid 304 with empty body
          }
        );
        const { state } = statusRes.data || {};
        lastState = state;
        if (state === 'completed' || state === 'failed') {
          return statusRes.data;
        }
      } catch (err) {
        console.error('pollJobStatus error', err.response?.data || err.message);
        return null;
      }
      await sleep(1000);
    }
    console.warn('pollJobStatus timed out', { jobId, lastState });
    return null;
  };

  const runRegrade = async (dryRun) => {
    // if (!assignmentId) {
    //   setStatus('Select an assignment first.');
    //   return;
    // }
    const setLoadingState = dryRun ? setDryRunLoading : setApplyLoading;
    setLoadingState(true);
    try {
      if (dryRun) setDryRunSummaries([]);
      const resolvedSectionId = (!selectedSection || selectedSection === '-1') ? null : selectedSection;

      const res = await axios.post(`${process.env.REACT_APP_API_HOST}/submissions/regrade`, {
        assignmentId,
        dryRun,
        sectionId: resolvedSectionId
      });
      const statusData = await pollJobStatus(res.data.jobId);
      if (!statusData) {
        setStatus(`${dryRun ? 'Dry run' : 'Regrade'} timed out before finishing.`);
        return;
      }

      if (statusData.state === 'failed') {
        throw new Error(statusData.result?.error || 'Regrade worker failed');
      }

      if (dryRun) {
        setDryRunSummaries(statusData.result || []);
        setStatus(`Dry regrade completed. Processed ${statusData.result?.length || 0} submissions.`);
      } else {
        setStatus('Regrade applied. Scores are being updated in the database.');
        setDryRunSummaries([]);
        onRegradeApplied(); //tells the labpreview to refresh
      }
    } catch (err) {
      setStatus(`Failed to queue ${dryRun ? 'dry run' : 'regrade'}: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoadingState(false);
    }
  };

  return (
    <div style={{ marginTop: '1rem' }}>
      <button
        onClick={() => runRegrade(true)}
        disabled={dryRunLoading || applyLoading || !assignmentId}
        style={{
          padding: '10px 16px',
          borderRadius: '6px',
          fontWeight: '600',
          border: 'none',
          cursor: (dryRunLoading || applyLoading || !assignmentId) ? 'not-allowed' : 'pointer',
          opacity: (dryRunLoading || applyLoading || !assignmentId) ? 0.6 : 1,
          backgroundColor: '#4f46e5',
          color: '#fff'
        }}
      >
        {dryRunLoading ? 'Queuing…' : 'Dry Regrade Submissions'}
      </button>
      {dryRunSummaries.length > 0 && ( //if ther was a dry run queued, show the button to actually run regrade and apply submissions
        <button
          onClick={() => runRegrade(false)}
          disabled={applyLoading || !assignmentId}
          style={{
            marginLeft: '12px',
            padding: '10px 16px',
            borderRadius: '6px',
            fontWeight: '600',
            border: 'none',
            cursor: applyLoading || !assignmentId ? 'not-allowed' : 'pointer',
            opacity: applyLoading || !assignmentId ? 0.6 : 1,
            backgroundColor: '#059669',
            color: '#fff'
          }}
        >
          {applyLoading ? 'Applying…' : 'Apply Regrade Updates'}
        </button>
      )}
      {status && <p style={{ marginTop: '0.5rem' }}>{status}</p>}
      {dryRunSummaries.length > 0 && (
        <div style={{ marginTop: '0.75rem' }}>
          <strong>Dry Run Results</strong>
          <ul style={{ marginTop: '0.5rem' }}>
            {dryRunSummaries.map(summary => (
              <li key={summary.submissionId} style={{ marginBottom: '0.5rem' }}>
                <div>Submission #{summary.submissionId} ({summary.user || 'unknown'}) [{summary.type}]</div>
                {summary.type === 'lab' && (
                  <div>
                    <div>Final Score: {summary.finalScore?.percent || '0'}% ({summary.finalScore?.totalScore || 0}/{summary.finalScore?.maxScore || 0})</div>
                    {/* <pre style={{ background: '#f3f4f6', padding: '8px', borderRadius: '4px', overflowX: 'auto' }}>
                      {JSON.stringify(summary.gradedResults, null, 2)}
                    </pre> */}
                  </div>
                )}
                {summary.type === 'github' && (
                  <div>
                    <div>Score: {summary.result?.score ?? 0}</div>
                    {summary.result?.output && (
                      <pre style={{ background: '#f3f4f6', padding: '8px', borderRadius: '4px', overflowX: 'auto' }}>
                        {summary.result.output}
                      </pre>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}


    </div>
  );
};

export default SubmissionRegrade;
