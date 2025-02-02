import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { FaPause, FaPlay, FaRedo, FaGithub } from 'react-icons/fa';
import logo from '../assets/logo.png';

interface PaddleRef extends THREE.Mesh {
  position: THREE.Vector3;
}

interface BallRef extends THREE.Mesh {
  position: THREE.Vector3;
}

const PongGame: React.FC = () => {
  const [score1, setScore1] = useState<number>(0);
  const [score2, setScore2] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(true);
  const [keys, setKeys] = useState<{ [key: string]: boolean }>({});
  const [isTwoPlayer, setIsTwoPlayer] = useState(() => {
    const savedIsTwoPlayer = localStorage.getItem('isTwoPlayer');
    return savedIsTwoPlayer !== null ? JSON.parse(savedIsTwoPlayer) : true;
  });
  const [aiDifficulty, setAIDifficulty] =
    useState<keyof typeof AI_DIFFICULTY>('medium');
  const paddle1Ref = useRef<PaddleRef>(null);
  const paddle2Ref = useRef<PaddleRef>(null);
  const ballRef = useRef<BallRef>(null);
  const ballVelocity = useRef<THREE.Vector3>(new THREE.Vector3(0.15, 0, 0.15));
  const audioContextRef = useRef<AudioContext | null>(null);

  // Animation States
  const [paddle1Scale, setPaddle1Scale] = useState(1);
  const [paddle2Scale, setPaddle2Scale] = useState(1);
  const [scoreScale, setScoreScale] = useState(1);

  // Game constants
  const PADDLE_SPEED = 0.5;
  const TABLE_SIZE = { x: 40, y: 2, z: 30 };
  const PADDLE_SIZE = { x: 1, y: 1, z: 7 };
  const BALL_SIZE = 0.5;
  const AI_DIFFICULTY = {
    // easy: { speed: 0.2, prediction: 0.1 },
    medium: { speed: 0.6, prediction: 0.3 },
    // hard: { speed: 1.0, prediction: 0.5 },
  };

  // Save isTwoPlayer to localStorage on change
  useEffect(() => {
    localStorage.setItem('isTwoPlayer', JSON.stringify(isTwoPlayer));
  }, [isTwoPlayer]);

  // AI Movement logic
  const updateAI = useCallback(() => {
    if (!ballRef.current || !paddle2Ref.current || isTwoPlayer) return;

    const { speed: aiSpeed, prediction } = AI_DIFFICULTY[aiDifficulty];
    const ballFutureZ =
      ballRef.current.position.z + ballVelocity.current.z * prediction * 10;
    const targetZ = THREE.MathUtils.clamp(
      ballFutureZ,
      -TABLE_SIZE.z / 2 + PADDLE_SIZE.z / 2,
      TABLE_SIZE.z / 2 - PADDLE_SIZE.z / 2
    );

    paddle2Ref.current.position.z += Math.min(
      (targetZ - paddle2Ref.current.position.z) * aiSpeed,
      PADDLE_SPEED
    );
  }, [isTwoPlayer, aiDifficulty]);

  // Add these animations in updateGame
  const animateGameElements = () => {
    setPaddle1Scale(THREE.MathUtils.lerp(paddle1Scale, 1, 0.1));
    setPaddle2Scale(THREE.MathUtils.lerp(paddle2Scale, 1, 0.1));
    setScoreScale(THREE.MathUtils.lerp(scoreScale, 1, 0.1));
  };

  const playBounceSound = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    const context = audioContextRef.current;
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(523.25, context.currentTime); // C5 note
    gainNode.gain.setValueAtTime(0.1, context.currentTime);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.1);
  };

  const playScoreSound = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    const context = audioContextRef.current;
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(1046.5, context.currentTime); // C6 note
    gainNode.gain.setValueAtTime(0.1, context.currentTime);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.3);
  };

  const resetBall = useCallback(() => {
    if (!ballRef.current) return;
    ballRef.current.position.set(0, BALL_SIZE, 0);
    ballVelocity.current = new THREE.Vector3(
      (Math.random() < 0.5 ? -1 : 1) * 0.2,
      0,
      (Math.random() - 0.5) * 0.2
    );
  }, []);

  const updateGame = useCallback(() => {
    if (
      !ballRef.current ||
      !paddle1Ref.current ||
      !paddle2Ref.current ||
      isPaused
    )
      return;

    updateAI();
    animateGameElements();

    // Ball movement
    ballRef.current.position.add(ballVelocity.current);

    // Ball collisions
    const ballPos = ballRef.current.position;
    const paddle1Pos = paddle1Ref.current.position;
    const paddle2Pos = paddle2Ref.current.position;

    // Wall collisions
    if (Math.abs(ballPos.z) > TABLE_SIZE.z / 2 - BALL_SIZE) {
      ballVelocity.current.z *= -1;
      playBounceSound();
    }

    // Paddle collisions
    const handlePaddleCollision = (
      paddlePos: THREE.Vector3,
      direction: number
    ) => {
      const hitZ = ballPos.z - paddlePos.z;
      const maxHitZ = PADDLE_SIZE.z / 2;
      const normalizedHit = hitZ / maxHitZ;
      ballVelocity.current.z += normalizedHit * 0.2;
      ballVelocity.current.x =
        direction * (Math.abs(ballVelocity.current.x) + 0.02);
      playBounceSound();
    };

    if (
      Math.abs(ballPos.x - paddle1Pos.x) < PADDLE_SIZE.x / 2 + BALL_SIZE &&
      Math.abs(ballPos.z - paddle1Pos.z) < PADDLE_SIZE.z / 2 + BALL_SIZE
    ) {
      handlePaddleCollision(paddle1Pos, 1);
      setPaddle1Scale(1.2);
    }

    if (
      Math.abs(ballPos.x - paddle2Pos.x) < PADDLE_SIZE.x / 2 + BALL_SIZE &&
      Math.abs(ballPos.z - paddle2Pos.z) < PADDLE_SIZE.z / 2 + BALL_SIZE
    ) {
      handlePaddleCollision(paddle2Pos, -1);
      setPaddle2Scale(1.4);
    }

    // Score points
    if (ballPos.x > TABLE_SIZE.x / 2) {
      setScore1((s) => s + 1);
      playScoreSound();
      resetBall();
    }
    if (ballPos.x < -TABLE_SIZE.x / 2) {
      setScore2((s) => s + 1);
      playScoreSound();
      resetBall();
    }

    // Paddle movement
    [paddle1Ref, paddle2Ref].forEach((paddleRef, index) => {
      if (!paddleRef.current) return;
      const isPlayer1 = index === 0;
      const upKey = isPlayer1 ? 'w' : 'ArrowUp';
      const downKey = isPlayer1 ? 's' : 'ArrowDown';

      if (keys[upKey]) paddleRef.current.position.z -= PADDLE_SPEED;
      if (keys[downKey]) paddleRef.current.position.z += PADDLE_SPEED;

      paddleRef.current.position.z = Math.max(
        -TABLE_SIZE.z / 2 + PADDLE_SIZE.z / 2,
        Math.min(
          TABLE_SIZE.z / 2 - PADDLE_SIZE.z / 2,
          paddleRef.current.position.z
        )
      );
    });
  }, [isPaused, resetBall, keys]);

  useEffect(() => {
    const handleKeyEvent = (e: KeyboardEvent, isPressed: boolean) => {
      if (['w', 's', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        setKeys((prev) => ({ ...prev, [e.key]: isPressed }));
      }
    };

    const keyDownHandler = (e: KeyboardEvent) => handleKeyEvent(e, true);
    const keyUpHandler = (e: KeyboardEvent) => handleKeyEvent(e, false);

    window.addEventListener('keydown', keyDownHandler);
    window.addEventListener('keyup', keyUpHandler);
    return () => {
      window.removeEventListener('keydown', keyDownHandler);
      window.removeEventListener('keyup', keyUpHandler);
    };
  }, []);

  useEffect(() => {
    const gameLoop = setInterval(updateGame, 16);
    return () => clearInterval(gameLoop);
  }, [updateGame]);

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#000' }}>
      <Canvas camera={{ position: [0, 40, 40], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        {/* Table */}
        <mesh position={[0, -1, 0]}>
          <boxGeometry args={[TABLE_SIZE.x, TABLE_SIZE.y, TABLE_SIZE.z]} />
          <meshStandardMaterial color="black" />
          <lineSegments>
            <edgesGeometry
              attach="geometry"
              args={[
                new THREE.BoxGeometry(TABLE_SIZE.x, TABLE_SIZE.y, TABLE_SIZE.z),
              ]}
            />
            <lineBasicMaterial attach="material" color="white" />
          </lineSegments>
        </mesh>
        {/* Paddles */}
        <mesh ref={paddle1Ref} position={[-TABLE_SIZE.x / 2 + 0.5, 0.6, 0]}>
          <boxGeometry args={[PADDLE_SIZE.x, PADDLE_SIZE.y, PADDLE_SIZE.z]} />
          <meshStandardMaterial color="black" />
          <lineSegments>
            <edgesGeometry
              attach="geometry"
              args={[
                new THREE.BoxGeometry(
                  PADDLE_SIZE.x,
                  PADDLE_SIZE.y,
                  PADDLE_SIZE.z
                ),
              ]}
            />
            <lineBasicMaterial attach="material" color="white" />
          </lineSegments>
        </mesh>
        <mesh ref={paddle2Ref} position={[TABLE_SIZE.x / 2 - 0.5, 0.6, 0]}>
          <boxGeometry args={[PADDLE_SIZE.x, PADDLE_SIZE.y, PADDLE_SIZE.z]} />
          <meshStandardMaterial color="black" />
          <lineSegments>
            <edgesGeometry
              attach="geometry"
              args={[
                new THREE.BoxGeometry(
                  PADDLE_SIZE.x,
                  PADDLE_SIZE.y,
                  PADDLE_SIZE.z
                ),
              ]}
            />
            <lineBasicMaterial attach="material" color="white" />
          </lineSegments>
        </mesh>
        <mesh ref={ballRef} position={[0, BALL_SIZE, 0]}>
          <sphereGeometry args={[BALL_SIZE, 32, 32]} />
          <meshStandardMaterial color="white" />
        </mesh>
        {/* Score displays */}
        <Text
          position={[-8, 16, 0]}
          fontSize={8}
          color="white"
          scale={scoreScale}
        >
          {score1}
        </Text>
        <Text position={[0, 16, 0]} fontSize={8} color="white">
          -
        </Text>
        <Text
          position={[8, 16, 0]}
          fontSize={8}
          color="white"
          scale={scoreScale}
        >
          {score2}
        </Text>
        <OrbitControls enabled={false} />
      </Canvas>

      {/* UI Overlay */}
      <div className="absolute top-5 left-1/2 transform -translate-x-1/2 text-white flex space-x-4">
        <button
          className="bg-gray-800 p-3 rounded flex items-center cursor-pointer"
          onClick={() => setIsPaused(!isPaused)}
        >
          {isPaused ? <FaPlay /> : <FaPause />}
        </button>
        <button
          className="bg-gray-800 p-3 rounded flex items-center cursor-pointer"
          onClick={() => {
            resetBall();
            setScore1(0);
            setScore2(0);
          }}
        >
          <FaRedo />
        </button>
        <button
          className="bg-gray-800 p-3 rounded flex items-center cursor-pointer"
          onClick={() => setIsTwoPlayer(!isTwoPlayer)}
        >
          {isTwoPlayer ? '🤖 AI Mode' : '👥 2 Player'}
        </button>
        {!isTwoPlayer && (
          <div className="relative group">
            <select
              className="bg-gray-800 p-3 rounded text-white appearance-none pr-8 transition-opacity duration-200 group-hover:opacity-100"
              value={aiDifficulty}
              onChange={(e) =>
                setAIDifficulty(e.target.value as keyof typeof AI_DIFFICULTY)
              }
              disabled={isTwoPlayer}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Links moved to top right with icons */}
      <div className="absolute top-5 right-5 text-white flex space-x-4">
        <a
          href="https://mitsuo.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center"
          style={{ color: 'white' }}
        >
          <img src={logo} alt="Portfolio" className="w-6 h-6 mr-2" />
        </a>
        <a
          href="https://github.com/mitsuoyg/pong-game"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center"
          style={{ color: 'white' }}
        >
          <FaGithub className="w-6 h-6 mr-2" />
        </a>
      </div>
    </div>
  );
};

export default PongGame;
