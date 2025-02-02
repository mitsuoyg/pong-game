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
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [keys, setKeys] = useState<{ [key: string]: boolean }>({});
  const paddle1Ref = useRef<PaddleRef>(null);
  const paddle2Ref = useRef<PaddleRef>(null);
  const ballRef = useRef<BallRef>(null);
  const ballVelocity = useRef<THREE.Vector3>(new THREE.Vector3(0.15, 0, 0.15));
  const audioContextRef = useRef<AudioContext | null>(null);

  // Game constants
  const TABLE_SIZE = { x: 40, y: 2, z: 30 };
  const PADDLE_SIZE = { x: 1, y: 1, z: 7 };
  const BALL_SIZE = 0.5;

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
    }

    if (
      Math.abs(ballPos.x - paddle2Pos.x) < PADDLE_SIZE.x / 2 + BALL_SIZE &&
      Math.abs(ballPos.z - paddle2Pos.z) < PADDLE_SIZE.z / 2 + BALL_SIZE
    ) {
      handlePaddleCollision(paddle2Pos, -1);
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
    const paddleSpeed = 0.5;
    [paddle1Ref, paddle2Ref].forEach((paddleRef, index) => {
      if (!paddleRef.current) return;
      const isPlayer1 = index === 0;
      const upKey = isPlayer1 ? 'w' : 'ArrowUp';
      const downKey = isPlayer1 ? 's' : 'ArrowDown';

      if (keys[upKey]) paddleRef.current.position.z -= paddleSpeed;
      if (keys[downKey]) paddleRef.current.position.z += paddleSpeed;

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

        {/* Ball */}
        <mesh ref={ballRef} position={[0, BALL_SIZE, 0]}>
          <sphereGeometry args={[BALL_SIZE, 32, 32]} />
          <meshPhongMaterial color="white" />
        </mesh>

        {/* Score displays */}
        <Text position={[-8, 16, 0]} fontSize={8} color="white">
          {score1}
        </Text>
        <Text position={[0, 16, 0]} fontSize={8} color="white">
          -
        </Text>
        <Text position={[8, 16, 0]} fontSize={8} color="white">
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
