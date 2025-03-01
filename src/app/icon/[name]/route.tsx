import { NextRequest } from 'next/server';
import seedrandom from 'seedrandom';

// List of fun emojis to choose from
const EMOJIS = [
  '😀', '😎', '🚀', '🌈', '🔥', '✨', '🎉', '🎸', 
  '🍕', '🌮', '🍦', '🧠', '💡', '🌱', '🦄', '🐱',
  '🐶', '🦊', '🦁', '🐼', '🐯', '🦋', '🌺', '🌴',
  '⚡', '💫', '🌟', '🎮', '🎨', '📚', '🎵', '🏆',
  '🌍', '🚲', '🏄', '🧩', '🎭', '🍉', '🥑', '🍋',
  '🌻', '🐬', '🦜', '🦢', '🦩', '🦚', '🌵', '🍄',
  '🧸', '🎪', '🎠', '🎡', '🎢', '🏰', '🗿', '🎁',
  '🌋', '🏝️', '🌠', '🎯', '🧿', '🧶', '🪁', '🧙‍♂️',
  '🧚‍♀️', '🦖', '🦕', '🦝', '🦡', '🦥', '🦦', '🦨',
  '🦔', '🐲', '🌮', '🍩', '🍭', '🧁', '🍪', '🥝',
  '🥥', '🧃', '🧊', '🪐', '🧬', '🧫', '🧪', '🔮',
];

// List of vibrant background colors
const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA5A5', '#A5FFD6',
  '#FFC145', '#FF6B8B', '#845EC2', '#D65DB1', '#008F7A',
  '#0089BA', '#2C73D2', '#FF9671', '#F9F871', '#B39CD0'
];

export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  // Get the name from the URL parameter and ensure it's properly awaited
  // Using Promise.resolve() to handle the case where params.name might be a promise
  const nameParam = await Promise.resolve(params.name);
  const name = nameParam || 'default';
  
  // Convert name to a more unique seed by creating a simple hash
  const seed = Array.from(name)
    .reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0)
    .toString(16);
  
  // Initialize random generator with the hex hash seed
  const rng = seedrandom(seed);
  
  // Generate random elements
  const backgroundColor = COLORS[Math.floor(rng() * COLORS.length)];
  
  // Select 4 unique emojis
  const uniqueEmojis = [];
  const availableEmojis = [...EMOJIS]; // Create a copy of the EMOJIS array
  
  for (let i = 0; i < 4; i++) {
    // Get random index from remaining emojis
    const randomIndex = Math.floor(rng() * availableEmojis.length);
    // Add the emoji to our selection
    uniqueEmojis.push(availableEmojis[randomIndex]);
    // Remove the selected emoji from available options
    availableEmojis.splice(randomIndex, 1);
  }
  
  // Generate SVG
  const svg = `
    <svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect width="400" height="400" fill="${backgroundColor}" />
      
      <!-- Emoji Quadrants -->
      <text x="100" y="120" font-size="160" text-anchor="middle" alignment-baseline="central">${uniqueEmojis[0]}</text>
      <text x="300" y="120" font-size="160" text-anchor="middle" alignment-baseline="central">${uniqueEmojis[1]}</text>
      <text x="100" y="300" font-size="160" text-anchor="middle" alignment-baseline="central">${uniqueEmojis[2]}</text>
      <text x="300" y="300" font-size="160" text-anchor="middle" alignment-baseline="central">${uniqueEmojis[3]}</text>
    </svg>
  `;
  
  // Return the SVG as the response
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
    }
  });
}