'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function IconDemo() {
  const [key, setKey] = useState('');
  const [iconUrl, setIconUrl] = useState('/icon/default');
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    // Set the origin when component mounts (client-side only)
    setOrigin(window.location.origin);
    
    // Update the icon URL when the key changes
    const newUrl = key.trim() ? `/icon/${encodeURIComponent(key)}` : '/icon/default';
    setIconUrl(newUrl);
  }, [key]);

  const copyImgTag = () => {
    const fullUrl = `${origin}${iconUrl}`;
    const imgTag = `<img src="${fullUrl}" alt="Generated icon for ${key}" width="100" height="100" />`;
    
    navigator.clipboard.writeText(imgTag).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Social Icon Generator</h1>
      <p className="text-gray-600 mb-8">Get a consistent emoji icon from a given screen name, word, or other text. Useful for prototyping or when you need placeholder images quickly.</p>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Enter a key..."
            className="flex-1"
          />
          
          <Button onClick={copyImgTag} variant="secondary">
            {copied ? 'Copied!' : 'Copy <img> tag'}
          </Button>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="flex justify-center items-center bg-gray-50 rounded-lg p-4">
            <img src={iconUrl} alt="Generated icon" width="200" height="200" />
          </div>
          
          <div className="flex flex-col justify-center">
            <p className="text-sm text-gray-500 mb-1">Icon URL:</p>
            <code className="bg-gray-100 p-2 rounded text-sm break-all">
              {origin}{iconUrl}
            </code>
          </div>
        </div>
      </div>
      
      <div>
        <h2 className="text-2xl font-semibold mb-4">Examples</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {['Hoagie', 'Laverne', 'BernardBernoulli'].map((example) => (
            <div key={example} className="flex flex-col items-center bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
              <img 
                src={`/icon/${example}`} 
                alt={`Icon for ${example}`} 
                width="100" 
                height="100" 
              />
              <p className="mt-2 text-sm text-gray-600">{example}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}