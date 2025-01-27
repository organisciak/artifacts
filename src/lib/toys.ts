export type Toy = {
  id: string;
  name: string;
  description: string;
  iconName: string;
  path: string;
  category: string;
  tags: string[];
};

export const toys: Toy[] = [
  {
    id: 'touch-synth',
    name: 'Touch Synthesizer',
    description: 'An expressive multi-touch synthesizer with visual feedback',
    iconName: 'Music',
    path: '/touch-synth',
    category: 'Audio',
    tags: ['Web Audio API', 'Touch Events'],
  },
  {
    id: 'ball-physics',
    name: 'Ball Bloops',
    description: 'An accelerometer-based blooping-ball demo',
    iconName: 'Volleyball',
    path: '/ball-physics',
    category: 'Audio',
    tags: ['Accelerometer', 'Canvas', 'Hit Detection', 'Web Audio API'],
  },
  {
    id: 'touch-drum-synth',
    name: 'Touch Drum Synth',
    description: 'A drum synth with touch events',
    iconName: 'Drum',
    path: '/touch-drum-synth',
    category: 'Audio',
    tags: ['Touch Events', 'Web Audio API'],
  }
];
