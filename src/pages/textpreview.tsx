// pages/textpreview.tsx
import { useEffect, useState } from 'react';

export default function TextPreview() {
  const [parsed, setParsed] = useState<{ draftText: string; guidelinesText: string } | null>(null);

  useEffect(() => {
    const fetchParsedText = async () => {
      const res = await fetch('/api/getParsedText');
      const data = await res.json();
      setParsed(data);
    };
    fetchParsedText();
  }, []);

  return (
    <div style={{ backgroundColor: 'white', minHeight: '100vh', padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem' }}>Text Extract Preview</h1>

      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: 'black', fontWeight: 'bold' }}>Draft Text</h2>
        <div style={{
          border: '2px solid black',
          padding: '1rem',
          backgroundColor: '#fff',
          color: '#000',
          whiteSpace: 'pre-wrap',
          minHeight: '100px'
        }}>
          {parsed?.draftText || 'Loading...'}
        </div>
      </div>

      <div>
        <h2 style={{ color: 'black', fontWeight: 'bold' }}>Guidelines Text</h2>
        <div style={{
          border: '2px solid black',
          padding: '1rem',
          backgroundColor: '#fff',
          color: '#000',
          whiteSpace: 'pre-wrap',
          minHeight: '100px'
        }}>
          {parsed?.guidelinesText || 'Loading...'}
        </div>
      </div>
    </div>
  );
}
