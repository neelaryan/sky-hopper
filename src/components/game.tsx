"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';

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

type Profile = {
    name: string;
    highScore: number;
};

type GameState = 'profile-menu' | 'create-profile' | 'select-profile' | 'leaderboard' | 'start' | 'playing' | 'gameOver';

const Game: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>('profile-menu');
  const [finalScore, setFinalScore] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('hard');
  const [showDifficultyButtons, setShowDifficultyButtons] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [newProfileName, setNewProfileName] = useState('');

  // Using refs for game state that changes every frame to avoid re-renders
  const birdY = useRef(CANVAS_HEIGHT / 2);
  const birdVelocity = useRef(0);
  const pipes = useRef<Pipe[]>([]);
  const score = useRef(0);
  const lastPipeTime = useRef(0);

  useEffect(() => {
    try {
        const savedProfiles = localStorage.getItem('sky-hopper-profiles');
        if (savedProfiles) {
            setProfiles(JSON.parse(savedProfiles));
        }
    } catch (error) {
        console.error("Could not load profiles from localStorage", error);
    }
  }, []);

  const saveProfiles = useCallback((updatedProfiles: Profile[]) => {
    try {
        localStorage.setItem('sky-hopper-profiles', JSON.stringify(updatedProfiles));
        setProfiles(updatedProfiles);
    } catch (error) {
        console.error("Could not save profiles to localStorage", error);
    }
  }, []);
  
  const setGameOver = useCallback(() => {
    setFinalScore(score.current);
    if (currentProfile && score.current > currentProfile.highScore) {
        const updatedProfiles = profiles.map(p => 
            p.name === currentProfile.name ? { ...p, highScore: score.current } : p
        );
        saveProfiles(updatedProfiles);
        setCurrentProfile(prev => prev ? {...prev, highScore: score.current} : null);
    }
    setGameState('gameOver');
  }, [currentProfile, profiles, saveProfiles]);

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
    setCurrentProfile(null);
    setGameState('profile-menu');
  }, []);

  const handleInput = useCallback(() => {
    if (gameState === 'playing') {
      birdVelocity.current = JUMP_FORCE;
    }
  }, [gameState]);
  
  const handleCreateProfile = useCallback(() => {
    if (newProfileName.trim() && !profiles.find(p => p.name === newProfileName.trim())) {
        const newProfile: Profile = { name: newProfileName.trim(), highScore: 0 };
        const updatedProfiles = [...profiles, newProfile];
        saveProfiles(updatedProfiles);
        setCurrentProfile(newProfile);
        setNewProfileName('');
        setGameState('start');
    }
  }, [newProfileName, profiles, saveProfiles]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleInput();
      }
      if (gameState === 'create-profile') {
        if (e.key === 'Enter') {
          handleCreateProfile();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleInput, gameState, handleCreateProfile]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleCanvasClick = (event: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        if (gameState === 'profile-menu') {
            const buttonY = CANVAS_HEIGHT / 2 - 20;
            const buttonHeight = 40;
            const buttonWidth = 180;
            const createX = CANVAS_WIDTH / 2 - buttonWidth / 2;

            if (y > buttonY && y < buttonY + buttonHeight) {
                setGameState('create-profile');
            } else if (y > buttonY + 50 && y < buttonY + 50 + buttonHeight) {
                if (profiles.length > 0) setGameState('select-profile');
            } else if (y > buttonY + 100 && y < buttonY + 100 + buttonHeight) {
                setGameState('leaderboard');
            }
        } else if (gameState === 'select-profile') {
            const backButtonY = CANVAS_HEIGHT - 60;
            const backButtonHeight = 40;
            const backButtonWidth = 120;
            const backButtonX = CANVAS_WIDTH / 2 - backButtonWidth / 2;
            if (y > backButtonY && y < backButtonY + backButtonHeight && x > backButtonX && x < backButtonX + backButtonWidth) {
                setGameState('profile-menu');
                return;
            }

            profiles.forEach((profile, index) => {
                const profileY = 100 + index * 40;
                if (y > profileY && y < profileY + 30) {
                    setCurrentProfile(profile);
                    setGameState('start');
                }
            });
        } else if (gameState === 'leaderboard') {
             const backButtonY = CANVAS_HEIGHT - 60;
            const backButtonHeight = 40;
            const backButtonWidth = 120;
            const backButtonX = CANVAS_WIDTH / 2 - backButtonWidth / 2;
            if (y > backButtonY && y < backButtonY + backButtonHeight && x > backButtonX && x < backButtonX + backButtonWidth) {
                setNewProfileName('');
                setGameState('profile-menu');
            }
        } else if (gameState === 'start' && showDifficultyButtons) {
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
      if (gameState === 'playing') {
        handleInput();
      } else {
        // Replicate click logic for touch on menus
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        if (gameState === 'profile-menu') {
            const buttonY = CANVAS_HEIGHT / 2 - 20;
            const buttonHeight = 40;
            const buttonWidth = 180;
            const createX = CANVAS_WIDTH / 2 - buttonWidth / 2;
            
            if (y > buttonY && y < buttonY + buttonHeight && x > createX && x < createX + buttonWidth) {
                setGameState('create-profile');
            } else if (y > buttonY + 50 && y < buttonY + 50 + buttonHeight && x > createX && x < createX + buttonWidth) {
                if (profiles.length > 0) setGameState('select-profile');
            } else if (y > buttonY + 100 && y < buttonY + 100 + buttonHeight && x > createX && x < createX + buttonWidth) {
                setGameState('leaderboard');
            }
        } else if (gameState === 'select-profile') {
            const backButtonY = CANVAS_HEIGHT - 60;
            const backButtonHeight = 40;
            const backButtonWidth = 120;
            const backButtonX = CANVAS_WIDTH / 2 - backButtonWidth / 2;
            if (y > backButtonY && y < backButtonY + backButtonHeight && x > backButtonX && x < backButtonX + backButtonWidth) {
                setGameState('profile-menu');
                return;
            }

            profiles.forEach((profile, index) => {
                const profileY = 100 + index * 40;
                if (y > profileY && y < profileY + 30) {
                    setCurrentProfile(profile);
                    setGameState('start');
                }
            });
        } else if (gameState === 'leaderboard') {
             const backButtonY = CANVAS_HEIGHT - 60;
            const backButtonHeight = 40;
            const backButtonWidth = 120;
            const backButtonX = CANVAS_WIDTH / 2 - backButtonWidth / 2;
            if (y > backButtonY && y < backButtonY + backButtonHeight && x > backButtonX && x < backButtonX + backButtonWidth) {
                setNewProfileName('');
                setGameState('profile-menu');
            }
        } else if (gameState === 'start' && showDifficultyButtons) {
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
            
            const restartButtonX = CANVAS_WIDTH / 2 - 120;
            if (y > restartButtonY && y < restartButtonY + buttonHeight && x > restartButtonX && x < restartButtonX + buttonWidth) {
                resetGame();
            }

            const mainMenuButtonX = CANVAS_WIDTH / 2 + 10;
            if (y > restartButtonY && y < restartButtonY + buttonHeight && x > mainMenuButtonX && x < mainMenuButtonX + buttonWidth) {
                handleMainMenu();
            }
        }
      }
    }
    canvas.addEventListener('touchstart', touchHandler, { passive: false });

    return () => {
      canvas.removeEventListener('mousedown', handleCanvasClick);
      canvas.removeEventListener('touchstart', touchHandler);
    };
  }, [gameState, showDifficultyButtons, startGame, resetGame, handleMainMenu, handleInput, profiles, handleCreateProfile]);

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
      if (gameState === 'playing' || gameState === 'gameOver') {
          context.fillStyle = PIPE_COLOR;
          context.strokeStyle = PIPE_BORDER_COLOR;
          context.lineWidth = 4;
          pipes.current.forEach(pipe => {
              context.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
              context.strokeRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
              context.fillRect(pipe.x, pipe.y + diffSettings.PIPE_GAP, PIPE_WIDTH, pipe.bottomHeight);
              context.strokeRect(pipe.x, pipe.y + diffSettings.PIPE_GAP, PIPE_WIDTH, pipe.bottomHeight);
          });
      }

      // Draw bird
       if (gameState === 'playing' || gameState === 'gameOver') {
            context.fillStyle = BIRD_COLOR;
            context.strokeStyle = '#c6a600';
            context.lineWidth = 2;
            context.fillRect(BIRD_X, birdY.current, BIRD_WIDTH, BIRD_HEIGHT);
            context.strokeRect(BIRD_X, birdY.current, BIRD_WIDTH, BIRD_HEIGHT);
       }
      
      // Draw UI
      context.font = "bold 36px 'Space Grotesk', sans-serif";
      context.fillStyle = TEXT_COLOR;
      context.strokeStyle = TEXT_SHADOW_COLOR;
      context.lineWidth = 4;
      context.textAlign = 'center';
      context.textBaseline = 'middle';

    if (gameState === 'profile-menu') {
        context.strokeText('Sky Hopper', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 4);
        context.fillText('Sky Hopper', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 4);

        context.font = "bold 24px 'Space Grotesk', sans-serif";
        const buttonWidth = 180;
        const buttonHeight = 40;
        const buttonX = CANVAS_WIDTH / 2 - buttonWidth / 2;

        context.fillStyle = '#4CAF50';
        context.fillRect(buttonX, CANVAS_HEIGHT / 2 - 20, buttonWidth, buttonHeight);
        context.fillStyle = TEXT_COLOR;
        context.fillText('Create Profile', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

        context.fillStyle = profiles.length > 0 ? '#FFC107' : '#9E9E9E';
        context.fillRect(buttonX, CANVAS_HEIGHT / 2 + 30, buttonWidth, buttonHeight);
        context.fillStyle = TEXT_COLOR;
        context.fillText('Select Profile', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);

        context.fillStyle = '#2196F3';
        context.fillRect(buttonX, CANVAS_HEIGHT / 2 + 80, buttonWidth, buttonHeight);
        context.fillStyle = TEXT_COLOR;
        context.fillText('Leaderboard', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 100);

    } else if (gameState === 'create-profile') {
        context.strokeText('Create Profile', CANVAS_WIDTH / 2, 100);
        context.fillText('Create Profile', CANVAS_WIDTH / 2, 100);
        context.font = "20px 'Space Grotesk', sans-serif";
        context.strokeText('Enter your name:', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);
        context.fillText('Enter your name:', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);
        
    } else if (gameState === 'select-profile') {
        context.strokeText('Select Profile', CANVAS_WIDTH / 2, 60);
        context.fillText('Select Profile', CANVAS_WIDTH / 2, 60);
        context.font = "bold 20px 'Space Grotesk', sans-serif";
        
        profiles.forEach((profile, index) => {
            context.fillStyle = '#FFC107';
            context.fillRect(40, 100 + index * 40, CANVAS_WIDTH - 80, 30);
            context.fillStyle = TEXT_COLOR;
            context.fillText(profile.name, CANVAS_WIDTH / 2, 115 + index * 40);
        });

        // Back button
        context.fillStyle = '#F44336';
        context.fillRect(CANVAS_WIDTH / 2 - 60, CANVAS_HEIGHT - 60, 120, 40);
        context.fillStyle = TEXT_COLOR;
        context.fillText('Back', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 40);

    } else if (gameState === 'leaderboard') {
        context.strokeText('Leaderboard', CANVAS_WIDTH / 2, 60);
        context.fillText('Leaderboard', CANVAS_WIDTH / 2, 60);
        context.font = "bold 20px 'Space Grotesk', sans-serif";

        const sortedProfiles = [...profiles].sort((a, b) => b.highScore - a.highScore);
        sortedProfiles.forEach((profile, index) => {
            context.textAlign = 'left';
            context.strokeText(`${index + 1}. ${profile.name}`, 40, 120 + index * 30);
            context.fillText(`${index + 1}. ${profile.name}`, 40, 120 + index * 30);
            context.textAlign = 'right';
            context.strokeText(`${profile.highScore}`, CANVAS_WIDTH - 40, 120 + index * 30);
            context.fillText(`${profile.highScore}`, CANVAS_WIDTH - 40, 120 + index * 30);
        });
        context.textAlign = 'center';
         // Back button
        context.fillStyle = '#F44336';
        context.fillRect(CANVAS_WIDTH / 2 - 60, CANVAS_HEIGHT - 60, 120, 40);
        context.fillStyle = TEXT_COLOR;
        context.fillText('Back', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 40);

    } else if (gameState === 'start') {
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
        context.font = "bold 20px 'Space Grotesk', sans-serif";
        context.textAlign = 'left';
        context.strokeText(`Player: ${currentProfile?.name}`, 10, 30);
        context.fillText(`Player: ${currentProfile?.name}`, 10, 30);
        context.textAlign = 'right';
        context.strokeText(`High Score: ${currentProfile?.highScore}`, CANVAS_WIDTH - 10, 30);
        context.fillText(`High Score: ${currentProfile?.highScore}`, CANVAS_WIDTH - 10, 30);

        context.textAlign = 'center';
        context.font = "bold 36px 'Space Grotesk', sans-serif";
        context.strokeText(score.current.toString(), CANVAS_WIDTH / 2, 80);
        context.fillText(score.current.toString(), CANVAS_WIDTH / 2, 80);
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
  }, [gameState, finalScore, setGameOver, resetGame, difficulty, showDifficultyButtons, startGame, handleMainMenu, profiles, currentProfile]);

  return (
    <div className="relative">
        <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="rounded-b-lg cursor-pointer"
        />
        {gameState === 'create-profile' && (
            <div 
                className="absolute flex flex-col items-center justify-center"
                style={{ 
                    top: `calc(${CANVAS_HEIGHT / 2}px - 20px)`, 
                    left: '50%', 
                    transform: 'translateX(-50%)', 
                    width: '220px' 
                }}
            >
                <Input
                    type="text"
                    placeholder="Enter your name"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    maxLength={15}
                    className="bg-white text-black text-center text-lg font-bold"
                    autoFocus
                />
                <div className="flex gap-2 mt-4">
                     <Button onClick={handleCreateProfile} className="bg-[#4CAF50] hover:bg-[#45a049]">
                        Create
                    </Button>
                    <Button 
                        onClick={() => {
                            setNewProfileName('');
                            setGameState('profile-menu');
                        }}
                        className="bg-[#F44336] hover:bg-[#da190b]"
                    >
                        Back
                    </Button>
                </div>
            </div>
        )}
    </div>
  );
};

export default Game;