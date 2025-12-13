
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StrictMode, useState } from 'react';
import MainView from './components/MainView';
import LabBuilder from './components/LabBuilder';
import LabPreview from './components/LabPreview';

function App() {
  const [title, setTitle] = useState('empty');
  const [blocks, setBlocks] = useState([]);
  return (
    <StrictMode>
      <BrowserRouter>
        <Routes>
          <Route
            path="/builder"
            element={
              <LabBuilder
                blocks={blocks}
                setBlocks={setBlocks}
                title={title}
                setTitle={setTitle}
              />
            }
          />
          <Route
            path="/preview"
            element={<LabPreview
              title={title}
              setTitle={setTitle}
              blocks={blocks}
              setBlocks={setBlocks}
            />}
          />
          <Route
            path="/"
            element={
              <MainView
                blocks={blocks}
                setBlocks={setBlocks}
                title={title}
                setTitle={setTitle}
              />
            }
          />
        </Routes>
      </BrowserRouter>
    </StrictMode>
  );
}
export default App;
