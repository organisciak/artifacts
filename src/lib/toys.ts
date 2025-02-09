export type Toy = {
  id: string;
  name: string;
  description: string;
  iconName: string;
  path: string;
  category: string;
  tags: string[];
  backgroundImage?: string;
};

export const toys: Toy[] = [
  {
    id: 'touch-synth',
    name: 'Touch Synthesizer',
    description: 'An expressive multi-touch theremin with visual feedback',
    iconName: 'Music',
    path: '/touch-synth',
    category: 'Audio',
    tags: ['Web Audio API', 'Touch Events'],
    backgroundImage: '/images/theremin2.png',
  },
  {
    id: 'ball-physics',
    name: 'Ball Bloops',
    description: 'An accelerometer-based demo with balls that interactsynthesized blips',
    iconName: 'Volleyball',
    path: '/ball-physics',
    category: 'Audio',
    backgroundImage: '/images/bloops.png',
    tags: ['Accelerometer', 'Canvas', 'Hit Detection', 'Web Audio API'],
  },
  {
    id: 'touch-drum-synth',
    name: 'Touch Drum Synth',
    description: 'A drum synth with touch events',
    iconName: 'Drum',
    path: '/touch-drum-synth',
    category: 'Audio',
    backgroundImage: '/images/pads.png',
    tags: ['Touch Events', 'Web Audio API'],
  },
  {
    id: 'meditative-fractals',
    name: 'Fractals',
    description: '',
    iconName: 'Flower',
    path: '/geom/easy-fractals',
    category: 'Geometric',
    tags: ['SVG', 'Animation', 'Interactive'],
    backgroundImage: '/bg-videos/mfractals.mp4'
  },
  {
    id: 'fish-game',
    name: 'Fish Game',
    description: 'A big fish/little fish game using the angle of your phone to navigate (in-progress)',
    iconName: 'Fish',
    path: '/games/fish',
    category: 'Games',
    tags: ['Canvas', 'Animation', 'Interactive', 'Accelerometer'],
  },
  {
    id: 'bauhaus-pattern',
    name: 'Bauhaus',
    description: '',
    iconName: 'Pyramid',
    path: '/geom/bauhaus',
    category: 'Geometric',
    tags: ['SVG', 'Animation', 'Interactive', 'Generative Art'],
    backgroundImage: '/bg-videos/bauhaus.mp4',
  },
  {
    id: 'fabric-flow',
    name: 'Fabric Flow',
    description: '',
    iconName: 'Waves',
    path: '/geom/fabric',
    category: 'Geometric',
    tags: ['SVG', 'Animation', 'Interactive', 'Generative Art'],
    backgroundImage: '/bg-videos/fabric.mp4',
  },
  /*{
    id: 'pointer-lock',
    name: 'Pointer Lock',
    description: 'A pointer lock demo',
    iconName: 'Pointer',
    path: '/sm/pointer-lock',
    category: 'Crumbs',
    tags: ['Pointer Lock'],
  }*/
];
