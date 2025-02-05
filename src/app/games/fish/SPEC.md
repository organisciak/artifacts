# Fish Game Specification

## Overview
This document specifies the requirements and design for upgrading the current physics-based ball simulation into a full-fledged fish game. In this game, you control a single fish that must "swim" around using the device accelerometer (or mouse/touch fallback), eat smaller fish to grow, and avoid larger fish that could shrink you. A point counter tracks your progress, and as you progress, levels become tougher with more enemies and faster movements.

## Game Concept
- **Player Role:**  
  You control one **playable fish** that is visually distinct (e.g., using a vibrant, unique color). This fish is affected by the accelerometer or mouse/touch input and must navigate the game space.

- **Enemy Fish:**  
  Enemy fish populate the game area with varied personalities:
  - **Small Fish:** Can be eaten by the player when the player is larger.
  - **Medium Fish:** Become edible only as the player grows.
  - **Large Fish:** Dangerous to the player; colliding with one will shrink the player.
  
  Each enemy fish has basic AI with one of several behaviors (e.g., "Lazy," "Aggressive," or "Erratic") that influence their movement patterns.

- **Growth Mechanic:**  
  As the player eats smaller fish, it grows larger. The "calories" from consumed fish increase non-linearly (diminishing returns for very small fish) so that growth is gradual but eventually enables the player to eat larger enemies.

- **Collision Effects:**
  - **Eating:** If the player collides with a smaller enemy fish, the enemy is consumed, points are awarded, and the player grows.
  - **Damage:** If the player collides with a larger enemy fish, the player is shrunk. If the player is big enough, the level remains the same; otherwise, the penalty forces harder play.
  - **Physics Bounces:** Collisions between enemy fish (or between the player and enemy fish) retain an elastic collision response.
  - **Invincibility Frames:** When the player is hit (i.e., shrinks), there is a brief period of invincibility indicated by opacity changes and flashing visuals.

## Game Areas and Boundaries
- **Playable Area:**  
  The player fish is bound within a defined "playable area" of the canvas. The borders of this area slow or prevent player movement out of bounds.
  
- **Outer Margin:**  
  Enemy fish are allowed to roam within an additional margin around the visible frame. This buffer zone ensures that enemy fish do not startle the player by suddenly entering the playable area.

## Controls
- **Accelerometer (Primary):**  
  The player fish moves based on the device's accelerometer data, simulating swimming by adjusting the fish's velocity in response to tilt.
  
- **Mouse/Touch (Fallback):**  
  For devices lacking accelerometers, the player fish instead follows the position of the mouse or touch. The fish accelerates towards the pointer with a speed that increases with distance (up to a maximum limit).

## Core Mechanics
- **Player Growth and Eating:**
  - Upon colliding with a smaller enemy fish, the player "eats" it, boosting their score and incrementally increasing the fish's size (radius).
  - The growth (or calories gained) from consuming fish scales sub-linearly so that increasingly larger fish require significantly more points or size superiority to eat.
  
- **Damage and Shrinking:**
  - Colliding with a larger enemy fish causes damage: the player fish shrinks rather than immediately ending the game.
  - After taking damage, the player enters an invincibility phase (with visual feedback via flashing or opacity reduction) during which further collisions are ignored.

- **Enemy AI Behaviors:**
  - **Lazy/Drifting:** Slow movement in random or gentle wandering paths.
  - **Aggressive:** Fast, direct movement, sometimes homing in on the player or moving purposefully.
  - **Erratic:** Unpredictable turns and speeds.
  - Each enemy's behavior is chosen from a set of distinct personalities, and their colors will reflect these traits (for example, red for aggressive, green for calm, etc.).

- **Collision Physics:**
  - Maintain elastic collision physics for interactions between all fish.
  - Upon collision, fish experience a bounce effect. For the player fish, collisions leading to changes in size (growth or shrinkage) also factor in invincibility timing.

- **Level Progression:**
  - **Difficulty Increase:** As the player's score increases (or the player fish grows), levels become tougher:
    - More enemy fish will populate the screen.
    - Enemy fish may move faster.
    - The calorie gain from eating small fish exhibits diminishing returns—forcing the player to seek larger targets.
  - **Score and Levels:** A visible point counter tracks the player's progress, and level changes are reflected in gameplay difficulty.

## Visuals and Audio
- **Distinct Visual Identity:**
  - The **player fish** should be rendered in a unique and vibrant color to set it apart from enemy fish.
  - **Enemy fish** will have varied, identifiable colors based on their personality type.
  - Update the current circular "ball" visuals (with motion lines and inner circles) to more fish-like representations, potentially including fins or a tail.
  
- **Audio Feedback:**
  - Retain collision sounds (with velocity-based variation) from the current simulation for both eating and damaging events.
  - Additional sounds might be considered for growth and level transitions.

- **Invincibility Feedback:**
  - Visual cues such as flashing or opacity changes indicate invincibility frames after the player is damaged.

## Technical and Architectural Changes
- **Class Restructuring:**
  - Refactor the existing `Ball` class into a more generic `Fish` class with additional properties:
    - `type` (player or enemy)
    - `personality` (for enemy AI behaviors)
    - `calories` or `growthValue` (to manage growth mechanics)
    - `invincibleUntil` (timestamp for invincibility period, if applicable)
  - Separate update and control logic between the player fish and enemy fish.
  
- **Input Handling:**
  - Integrate device motion events for accelerometer data.
  - Implement mouse/touch input fallback that calculates direction and speed based on the pointer's distance from the player fish.
  
- **Enemy AI:**
  - Implement a simple state machine or behavior tree for enemy movement. Each enemy fish's update method should:
    - Apply its personality-based movement pattern.
    - Allow free movement beyond the playable area boundaries (with eventual re-entry into the visible frame).
  
- **Collision and Physics Updates:**
  - Adjust collision logic to:
    - Differentiate between eating (player colliding with smaller enemy) and taking damage (player colliding with larger enemy).
    - Apply bounce physics between all fish.
    - Integrate invincibility frames for the player.
  
- **Game World Layout:**
  - Define clear boundaries for the player fish. The canvas still uses HTML5 Canvas for rendering.
  - Implement an outer margin for enemy movement and appropriate scaling for high-DPI displays.

## User Interface
- **Score and Level Display:**  
  Display current points and level progress prominently.
  
- **Control Feedback:**
  - Indicate when accelerometer access is not available or enabled.
  - Provide settings to toggle sound effects.
  
- **Restart/Reset Options:**
  - Include a button to reset the simulation/game, reinitializing fish positions and difficulty settings.

## Summary
This specification outlines the transformation of a simple ball-based physics simulator into an engaging fish game. The player controls one fish using device motion or mouse/touch, maneuvering within a defined playable area and growing by consuming smaller enemy fish. With enemy AI possessing distinct behaviors and a dynamic level progression that increases difficulty over time, the game challenges the player to balance growth with survival. Visual and audio cues, including invincibility frames following damage, enhance player engagement and convey game mechanics clearly.

Future iterations may include refined graphics, additional enemy behaviors, power-ups, and more sophisticated audio-visual effects. 


## Original Outline, Updating from The Ball Physics Demo

I want to update this to a game, where you control 1 little ball and using the accelerometer, you have to 'swim' around, eating little fish and avoiding bigger fish. As you eat little fish, you grow bigger, and eventually can eat bigger fish. There's a point counter. As you progress, the levels get tougher (more fish on screen, faster moving. The 'calories' from fish go up faster than linearly, so eating the littlest fish has diminishing returns. When you crash into a bigger fish, it shrinks you, so if you're big enough you may not lose immediately (level doesn't go down, though).

Your 'fish' needs to be a visually distinct color, and the smaller/bigger fish should be identifiable from their color.

In updating this web demo into a game, it means that 1) there is only one 'playable' ball that is affected by the accelerometer, 2) the other fish have some basic swimming AI (with one of a set of varying, distinct personalities), 3) the hitbox bounce is still in effect, when other fish crash into each other, 4) there are a few invincibility frames when you crash into something and shrink (communicated to the play with opacity and flashing 4) the border of the game affects the player, but not the enemies - the enemies can move in and out of frame, but the player is bound within it 5) there's a margin that only the enemies can go to, so the player isn't surprising at the edges when an enemy enters frame because there's a bit of buffer that they travel in the visible frame before getting into the playable frame 6) there's a mouse/touch backup for devices without an accelerometer, where the playable fish follows in the direction of the mouse, going faster based on how far the cursor/touch is from the fish (up to a max)


## Implementation Plan

### ✅ Step 1: Set Up Project Structure & Placeholders
- ✅ Create directory structure:
  ```
  src/
  ├── game/
  │   ├── entities/
  │   │   ├── Fish.ts
  │   │   ├── PlayerFish.ts
  │   │   └── EnemyFish.ts
  │   ├── ai/
  │   │   └── FishAI.ts
  │   └── utils/
  │       └── physics.ts
  ├── hooks/
  │   └── useFishInput.ts
  └── components/
      └── games/
          └── fish/
              ├── ScoreBoard.tsx
              └── GameHUD.tsx
  ```
- ✅ Add placeholder files with docstrings (as shown in provided files)
- ✅ Create types.ts for shared type definitions
- ✅ Verify project compiles with empty implementations
- ✅ Test basic app loading without runtime errors

### ✅ Step 2: Basic Rendering and Animation For Player
- ✅ Port relevant physics code from Ball class to Fish class:
- ✅ Implement minimal PlayerFish update/draw methods
- ✅ Create canvas in main game view with proper DPI scaling
- ✅ Set up GameManager with basic game loop using requestAnimationFrame
- ✅ Render simple circle for player fish with motion lines
- ✅ Test with fixed velocity movement to verify animation

### ✅ Step 3: Input Handling for Player Movement
- ✅ Port accelerometer permission logic from FishGame component
- ✅ Implement useFishInput hook:
  - ✅ Add accelerometer event handling
  - ✅ Add mouse/touch position tracking
  - ✅ Implement velocity calculations based on input type
  - ✅ Add input smoothing for both control methods
- ✅ Update PlayerFish to accept input data
- ✅ Connect input events in main game view
- ✅ Test both accelerometer and fallback controls
- ✅ Add visual feedback for control method in use (including worm cursor)

### ⬜ Step 4: Playable Area Boundaries
- ⬜ Define constants for playable area and margin sizes
- ⬜ Add checkBoundaries() to PlayerFish
- ⬜ Implement boundary collision response (sliding along edges)
- ⬜ Add visual boundary indicators for debugging
- ⬜ Test player containment within boundaries
- ⬜ Verify proper scaling on different screen sizes

### ✅ Step 5: Static Enemy Fish Entities
- ✅ Implement basic EnemyFish update/draw methods
- ✅ Add size categories (small, medium, large)
- ✅ Create color scheme for different fish sizes
- ✅ Add enemy fish instantiation in GameManager
- ✅ Implement basic fish spawning logic
- ✅ Test static enemy rendering
- ✅ Verify different sizes/colors display correctly

### ⬜ Step 6: Basic Enemy AI
- ⬜ Implement FishAI module with basic movement patterns:
  - ⬜ Add wandering behavior (lazy)
  - ⬜ Add linear movement with direction changes
  - ⬜ Add boundary awareness for margin area
- ⬜ Create behavior state machine
- ⬜ Add basic target position calculation
- ⬜ Integrate AI updates in game loop
- ⬜ Test independent enemy movement
- ⬜ Verify enemies properly enter/exit playable area

### ⬜ Step 7: Collision Detection And Basic Interaction
- ⬜ Port collision detection from ball demo
- ⬜ Implement size comparison logic
- ⬜ Add collision resolution based on relative sizes:
  - ⬜ Larger fish eats smaller fish
  - ⬜ Equal size fish bounce
  - ⬜ Smaller fish gets eaten
- ⬜ Add basic growth/shrink mechanics
- ⬜ Implement score tracking
- ⬜ Test all collision scenarios
- ⬜ Verify proper physics response

### ⬜ Step 8: Invincibility Frames & Visual Feedback
- ⬜ Add invincibilityTimer to PlayerFish
- ⬜ Implement collision immunity during invincibility
- ⬜ Add visual feedback:
  - ⬜ Opacity pulsing
  - ⬜ Color flashing
  - ⬜ Optional particle effects
- ⬜ Test invincibility mechanics
- ⬜ Verify visual clarity of feedback

### ⬜ Step 9: Score, Level Progression, and HUD
- ⬜ Implement ScoreBoard component:
  - ⬜ Add score display
  - ⬜ Add level indicator
  - ⬜ Add high score tracking
  - ⬜ Add score animation
- ⬜ Implement GameHUD component:
  - ⬜ Add player status display
  - ⬜ Add control method indicator
  - ⬜ Add game state messages
- ⬜ Add score/level tracking to GameManager
- ⬜ Implement progressive difficulty scaling
- ⬜ Test score updates and level progression
- ⬜ Verify HUD responsiveness

### ⬜ Step 10: Sound Effects
- ⬜ Port collision sound logic from ball demo
- ⬜ Add new sound effects:
  - ⬜ Eating smaller fish
  - ⬜ Taking damage
  - ⬜ Level up
  - ⬜ Game over
- ⬜ Implement velocity-based sound variation
- ⬜ Add volume controls
- ⬜ Test audio feedback system
- ⬜ Verify sound mixing and balance

### ⬜ Step 11: Polish Visuals
- ⬜ Enhance fish rendering:
  - ⬜ Add fins and tail
  - ⬜ Add eye(s)
  - ⬜ Add simple body animation
- ⬜ Implement distinct color schemes:
  - ⬜ Player fish unique color
  - ⬜ Size-based enemy colors
  - ⬜ Personality-based variations
- ⬜ Add simple animations:
  - ⬜ Eating effects
  - ⬜ Damage effects
  - ⬜ Growth/shrink transitions
- ⬜ Test visual clarity
- ⬜ Verify performance with multiple fish

### ⬜ Step 12: Refine Enemy AI and Difficulty
- ⬜ Implement varied AI behaviors:
  - ⬜ Lazy: slow, meandering movement
  - ⬜ Aggressive: player-seeking behavior
  - ⬜ Erratic: random speed/direction changes
- ⬜ Add personality-based movement patterns
- ⬜ Implement progressive difficulty scaling:
  - ⬜ Increased enemy count
  - ⬜ Faster movement
  - ⬜ More aggressive behavior ratio
- ⬜ Add diminishing returns for small fish
- ⬜ Test balanced gameplay progression
- ⬜ Verify AI performance impact

### ⬜ Step 13: Final Integration and Polish
- ⬜ Add game reset functionality
- ⬜ Implement input calibration
- ⬜ Add game state persistence
- ⬜ Optimize rendering performance
- ⬜ Add loading states
- ⬜ Conduct performance profiling
- ⬜ Complete end-to-end testing
- ⬜ Add error boundaries
- ⬜ Implement analytics tracking

### Progress Tracking
- Total Steps: 13
- Completed: 0
- In Progress: 0
- Remaining: 13

Each step should result in a demo-able increment of functionality. Steps can be worked on in parallel if dependencies allow, but each step's checklist items should be completed sequentially.
