"use client"
import React, { useState, useEffect } from 'react';
import { Shuffle, ChevronLeft, ChevronRight } from 'lucide-react';
import projectsData from '@/data/projects.json';

const DMPCardPage = () => {
  const projects = projectsData;

  // Start with a fixed initial index
  const [currentIndex, setCurrentIndex] = useState(0);

  // Move random initialization to useEffect
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * projects.length);
    setCurrentIndex(randomIndex);
  }, []); // Empty dependency array means this runs once after mount

  const getRandomIndex = () => {
    const newIndex = Math.floor(Math.random() * projects.length);
    return newIndex === currentIndex ? getRandomIndex() : newIndex;
  };

  const handleShuffle = () => {
    setCurrentIndex(getRandomIndex());
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : projects.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < projects.length - 1 ? prev + 1 : 0));
  };

  const handleJumpToNumber = (event) => {
    const num = parseInt(event.target.value);
    if (!isNaN(num) && num >= 1 && num <= projects.length) {
      setCurrentIndex(num - 1);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              {projects[currentIndex].title}
            </h2>
            <button 
              onClick={handleShuffle}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Show another random project"
            >
              <Shuffle className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <p className="text-gray-600 leading-relaxed">
            {projects[currentIndex].abstract}
          </p>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handlePrevious}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                aria-label="Previous project"
              >
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Project</span>
                <input
                  type="number"
                  min="1"
                  max={projects.length}
                  value={currentIndex + 1}
                  onChange={handleJumpToNumber}
                  className="w-12 px-1 py-0.5 text-sm text-gray-700 border rounded"
                  aria-label="Jump to project number"
                />
                <span className="text-sm text-gray-500">of {projects.length}</span>
              </div>
              <button
                onClick={handleNext}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                aria-label="Next project"
              >
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DMPCardPage;