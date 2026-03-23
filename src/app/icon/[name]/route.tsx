import { NextRequest } from 'next/server';
import seedrandom from 'seedrandom';
import fs from 'fs/promises';
import path from 'path';

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
  // Get the name from the URL parameter - properly awaited
  const name = (await params).name || 'default';
  
  // Get the URL parameters
  const { searchParams } = new URL(request.url);
  const rounded = searchParams.get('rounded');
  const cornerRadius = rounded ? parseInt(rounded) || 50 : 0; // Default to 50 if just "?rounded" is provided
  const showOcs = searchParams.get('ocs') === 'true';
  const singleEmoji = searchParams.get('single') === 'true';
  
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
  let svg = `
    <svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect width="400" height="400" fill="${backgroundColor}" rx="${cornerRadius}" ry="${cornerRadius}" />

      <!-- Background Overlay -->
      
      ${singleEmoji 
        ? `<!-- Single Centered Emoji -->
           <text x="200" y="200" font-size="290" text-anchor="middle" alignment-baseline="central">${uniqueEmojis[0]}</text>`
        : `<!-- Emoji Quadrants -->
           <text x="100" y="120" font-size="160" text-anchor="middle" alignment-baseline="central">${uniqueEmojis[0]}</text>
           <text x="300" y="120" font-size="160" text-anchor="middle" alignment-baseline="central">${uniqueEmojis[1]}</text>
           <text x="100" y="300" font-size="160" text-anchor="middle" alignment-baseline="central">${uniqueEmojis[2]}</text>
           <text x="300" y="300" font-size="160" text-anchor="middle" alignment-baseline="central">${uniqueEmojis[3]}</text>`
      }
  `;
  
  // Add OCS overlay if requested - this is very specific to my use with openscoring.du.edu
  if (showOcs) {
    try {
      // Read the OCS overlay SVG file
      const ocsOverlayPath = path.join(process.cwd(), 'public', 'images', 'ocs2-overlay.svg');
      const ocsOverlaySvg = await fs.readFile(ocsOverlayPath, 'utf-8');
      
      // Extract the SVG content (just the paths)
      const pathsMatch = ocsOverlaySvg.match(/<g class="layer">([\s\S]*?)<\/g>/);
      const paths = pathsMatch ? pathsMatch[1] : '';
      
      // Add a background overlay with difference blend mode
      svg = svg.replace(`<!-- Background Overlay -->`,
        `<!-- Background Overlay -->
        <g transform="translate(5, 0) scale(1.3)" fill="rgba(255, 255, 255, 0.15)" style="mix-blend-mode: difference;">
          ${paths}
        </g>`);
      
      // Add the OCS overlay paths to our SVG (on top of emojis)
      svg += `
      <!-- OCS Overlay -->
      <g transform="translate(5, 0) scale(1.3)" fill="rgba(0, 0, 0, 1)" style="mix-blend-mode: overlay;">
        ${paths}
      </g>
      
      `;
    } catch (error) {
      console.error('Error adding OCS overlay:', error);
    }
  }
  
  // Close the SVG tag
  svg += `</svg>`;
  
  // Return the SVG as the response
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
    }
  });
}