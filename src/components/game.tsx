"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';

// Game Constants
const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 480;
const BIRD_WIDTH = 34;
const BIRD_HEIGHT = 24;
const BIRD_X = 60;
const PIPE_WIDTH = 52;
const GRAVITY = 0.5;
const JUMP_FORCE = -8;

// Difficulty Settings
const difficulties = {
  easy: {
    PIPE_GAP: 150,
    PIPE_SPEED: -1.2,
    PIPE_SPAWN_INTERVAL: 2200,
  },
  medium: {
    PIPE_GAP: 120,
    PIPE_SPEED: -1.5,
    PIPE_SPAWN_INTERVAL: 1800,
  },
  hard: {
    PIPE_GAP: 120,
    PIPE_SPEED: -2,
    PIPE_SPAWN_INTERVAL: 1500,
  },
};

type Difficulty = keyof typeof difficulties;

// Colors
const SKY_COLOR = "#B0E2FF";
const BIRD_COLOR = "#FFDA33";
const PIPE_COLOR = "#228B22";
const PIPE_BORDER_COLOR = "#1c741c";
const TEXT_COLOR = "#FFFFFF";
const TEXT_SHADOW_COLOR = "#000000";

type Pipe = {
  x: number;
  y: number; // y position of the top of the gap
  topHeight: number;
  bottomHeight: number;
  passed: boolean;
};

type GameState = 'start' | 'playing' | 'gameOver';

const Game: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>('start');
  const [finalScore, setFinalScore] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('hard');
  const [showDifficultyButtons, setShowDifficultyButtons] = useState(true);

  // Using refs for game state that changes every frame to avoid re-renders
  const birdY = useRef(CANVAS_HEIGHT / 2);
  const birdVelocity = useRef(0);
  const pipes = useRef<Pipe[]>([]);
  const score = useRef(0);
  const lastPipeTime = useRef(0);

  const setGameOver = useCallback(() => {
    setFinalScore(score.current);
    setGameState('gameOver');
  }, []);

  const resetGame = useCallback(() => {
    birdY.current = CANVAS_HEIGHT / 2;
    birdVelocity.current = 0;
    pipes.current = [];
    score.current = 0;
    setFinalScore(0);
    lastPipeTime.current = 0;
    setGameState('playing');
  }, []);

  const startGame = useCallback((selectedDifficulty: Difficulty) => {
    setDifficulty(selectedDifficulty);
    setShowDifficultyButtons(false);
    resetGame();
  }, [resetGame]);

  const handleMainMenu = useCallback(() => {
    setShowDifficultyButtons(true);
    setGameState('start');
  }, []);

  const handleInput = useCallback(() => {
    if (gameState === 'playing') {
      birdVelocity.current = JUMP_FORCE;
    }
  }, [gameState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleInput();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleInput]);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleCanvasClick = (event: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        if (gameState === 'start' && showDifficultyButtons) {
            const buttonY = CANVAS_HEIGHT / 2 - 15;
            const buttonHeight = 30;
            const easyButtonX = CANVAS_WIDTH / 2 - 120;
            const mediumButtonX = CANVAS_WIDTH / 2 - 40;
            const hardButtonX = CANVAS_WIDTH / 2 + 40;
            const buttonWidth = 80;

            if (y > buttonY && y < buttonY + buttonHeight) {
                if (x > easyButtonX && x < easyButtonX + buttonWidth) {
                    startGame('easy');
                } else if (x > mediumButtonX && x < mediumButtonX + buttonWidth) {
                    startGame('medium');
                } else if (x > hardButtonX && x < hardButtonX + buttonWidth) {
                    startGame('hard');
                }
            }
        } else if (gameState === 'gameOver') {
            const restartButtonY = CANVAS_HEIGHT / 2 + 40;
            const buttonHeight = 30;
            const buttonWidth = 110;
            
            // Restart Button
            const restartButtonX = CANVAS_WIDTH / 2 - 120;
            if (y > restartButtonY && y < restartButtonY + buttonHeight && x > restartButtonX && x < restartButtonX + buttonWidth) {
                resetGame();
            }

            // Main Menu Button
            const mainMenuButtonX = CANVAS_WIDTH / 2 + 10;
            if (y > restartButtonY && y < restartButtonY + buttonHeight && x > mainMenuButtonX && x < mainMenuButtonX + buttonWidth) {
                handleMainMenu();
            }
        } else if (gameState === 'playing') {
             handleInput();
        }
    };

    canvas.addEventListener('mousedown', handleCanvasClick);
    const touchHandler = (e: TouchEvent) => {
      e.preventDefault();
      handleInput();
    }
    canvas.addEventListener('touchstart', touchHandler, { passive: false });

    return () => {
      canvas.removeEventListener('mousedown', handleCanvasClick);
      canvas.removeEventListener('touchstart', touchHandler);
    };
  }, [gameState, showDifficultyButtons, startGame, resetGame, handleMainMenu, handleInput]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    let animationFrameId: number;
    const diffSettings = difficulties[difficulty];

    const gameLoop = (timestamp: number) => {
      // Update game logic
      if (gameState === 'playing') {
        // Gravity
        birdVelocity.current += GRAVITY;
        birdY.current += birdVelocity.current;
        
        // Pipe generation
        if (timestamp - lastPipeTime.current > diffSettings.PIPE_SPAWN_INTERVAL) {
            const gapY = Math.random() * (CANVAS_HEIGHT - diffSettings.PIPE_GAP - 100) + 50;
            pipes.current.push({
                x: CANVAS_WIDTH,
                y: gapY,
                topHeight: gapY,
                bottomHeight: CANVAS_HEIGHT - gapY - diffSettings.PIPE_GAP,
                passed: false,
            });
            lastPipeTime.current = timestamp;
        }

        // Move pipes
        pipes.current.forEach(pipe => {
            pipe.x += diffSettings.PIPE_SPEED;
        });

        // Remove off-screen pipes
        pipes.current = pipes.current.filter(pipe => pipe.x + PIPE_WIDTH > 0);

        // Collision detection
        const bird = { x: BIRD_X, y: birdY.current, width: BIRD_WIDTH, height: BIRD_HEIGHT };
        // Ground and ceiling collision
        if (bird.y + bird.height > CANVAS_HEIGHT || bird.y < 0) {
            setGameOver();
        }
        // Pipe collision
        for (const pipe of pipes.current) {
            const isColliding = bird.x < pipe.x + PIPE_WIDTH &&
                                bird.x + bird.width > pipe.x &&
                                (bird.y < pipe.topHeight || bird.y + bird.height > pipe.y + diffSettings.PIPE_GAP);
            
            if (isColliding) {
                setGameOver();
            }
        }
        
        // Update score
        pipes.current.forEach(pipe => {
            if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
                pipe.passed = true;
                score.current += 1;
            }
        });
      }
      
      // Drawing
      context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      context.fillStyle = SKY_COLOR;
      context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw pipes
      context.fillStyle = PIPE_COLOR;
      context.strokeStyle = PIPE_BORDER_COLOR;
      context.lineWidth = 4;
      pipes.current.forEach(pipe => {
          context.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
          context.strokeRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
          context.fillRect(pipe.x, pipe.y + diffSettings.PIPE_GAP, PIPE_WIDTH, pipe.bottomHeight);
          context.strokeRect(pipe.x, pipe.y + diffSettings.PIPE_GAP, PIPE_WIDTH, pipe.bottomHeight);
      });

      // Draw bird
      context.fillStyle = BIRD_COLOR;
      context.strokeStyle = '#c6a600';
      context.lineWidth = 2;
      context.fillRect(BIRD_X, birdY.current, BIRD_WIDTH, BIRD_HEIGHT);
      context.strokeRect(BIRD_X, birdY.current, BIRD_WIDTH, BIRD_HEIGHT);
      
      // Draw UI
      context.font = "bold 36px 'Space Grotesk', sans-serif";
      context.fillStyle = TEXT_COLOR;
      context.strokeStyle = TEXT_SHADOW_COLOR;
      context.lineWidth = 4;
      context.textAlign = 'center';
      context.textBaseline = 'middle';

      if (gameState === 'start') {
        context.strokeText('Sky Hopper', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 3);
        context.fillText('Sky Hopper', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 3);
        context.font = "bold 20px 'Space Grotesk', sans-serif";

        if(showDifficultyButtons){
            context.strokeText('Select Difficulty', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);
            context.fillText('Select Difficulty', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);
            
            // Draw buttons
            const buttonY = CANVAS_HEIGHT / 2 - 15;
            const buttonHeight = 30;
            const buttonWidth = 80;

            // Easy
            context.fillStyle = '#4CAF50';
            context.fillRect(CANVAS_WIDTH / 2 - 120, buttonY, buttonWidth, buttonHeight);
            context.fillStyle = TEXT_COLOR;
            context.fillText('Easy', CANVAS_WIDTH / 2 - 80, CANVAS_HEIGHT / 2);

            // Medium
            context.fillStyle = '#FFC107';
            context.fillRect(CANVAS_WIDTH / 2 - 40, buttonY, buttonWidth, buttonHeight);
            context.fillStyle = TEXT_COLOR;
            context.fillText('Medium', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

            // Hard
            context.fillStyle = '#F44336';
            context.fillRect(CANVAS_WIDTH / 2 + 40, buttonY, buttonWidth, buttonHeight);
            context.fillStyle = TEXT_COLOR;
            context.fillText('Hard', CANVAS_WIDTH / 2 + 80, CANVAS_HEIGHT / 2);

        } else {
            // This case might not be reachable with current logic but kept for safety.
            context.strokeText('Tap or Space to Start', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
            context.fillText('Tap or Space to Start', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        }

      } else if (gameState === 'playing') {
        context.strokeText(score.current.toString(), CANVAS_WIDTH / 2, 60);
        context.fillText(score.current.toString(), CANVAS_WIDTH / 2, 60);
      } else if (gameState === 'gameOver') {
        context.strokeText('Game Over', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);
        context.fillText('Game Over', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);
        
        context.font = "bold 24px 'Space Grotesk', sans-serif";
        context.strokeText(`Score: ${finalScore}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        context.fillText(`Score: ${finalScore}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        
        // Draw buttons for restart and main menu
        const buttonY = CANVAS_HEIGHT / 2 + 40;
        const buttonHeight = 30;
        const buttonWidth = 110;
        context.font = "bold 18px 'Space Grotesk', sans-serif";

        // Restart button
        context.fillStyle = '#4CAF50';
        context.fillRect(CANVAS_WIDTH / 2 - 120, buttonY, buttonWidth, buttonHeight);
        context.fillStyle = TEXT_COLOR;
        context.fillText('Restart', CANVAS_WIDTH / 2 - 65, buttonY + 15);

        // Main Menu button
        context.fillStyle = '#FFC107';
        context.fillRect(CANVAS_WIDTH / 2 + 10, buttonY, buttonWidth, buttonHeight);
        context.fillStyle = TEXT_COLOR;
        context.fillText('Main Menu', CANVAS_WIDTH / 2 + 65, buttonY + 15);
      }
      
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    gameLoop(0);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameState, finalScore, setGameOver, resetGame, difficulty, showDifficultyButtons, startGame, handleMainMenu]);

  return (
    <div className="relative">
        <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="rounded-b-lg cursor-pointer"
        />
    </div>
  );
};

export default Game;
