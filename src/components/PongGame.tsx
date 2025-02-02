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
  const paddle1Ref = useRef<PaddleRef>(null);
  const paddle2Ref = useRef<PaddleRef>(null);
  const ballRef = useRef<BallRef>(null);
  const ballVelocity = useRef<THREE.Vector3>(new THREE.Vector3(0.1, 0, 0.1));

  // Game constants
  const TABLE_SIZE = { x: 40, y: 2, z: 30 };
  const PADDLE_SIZE = { x: 1, y: 1, z: 7 };
  const BALL_SIZE = 0.5;

  const resetBall = useCallback(() => {
    if (!ballRef.current) return;
    ballRef.current.position.set(0, BALL_SIZE, 0);
    ballVelocity.current = new THREE.Vector3(
      Math.random() * 0.1 + 0.1,
      0,
      (Math.random() - 0.5) * 0.1
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
    }

    // Paddle collisions
    if (
      Math.abs(ballPos.x - paddle1Pos.x) < PADDLE_SIZE.x / 2 + BALL_SIZE &&
      Math.abs(ballPos.z - paddle1Pos.z) < PADDLE_SIZE.z / 2 + BALL_SIZE
    ) {
      ballVelocity.current.x *= -1;
    }

    if (
      Math.abs(ballPos.x - paddle2Pos.x) < PADDLE_SIZE.x / 2 + BALL_SIZE &&
      Math.abs(ballPos.z - paddle2Pos.z) < PADDLE_SIZE.z / 2 + BALL_SIZE
    ) {
      ballVelocity.current.x *= -1;
    }

    // Score points
    if (ballPos.x > TABLE_SIZE.x / 2) {
      setScore1((s) => s + 1);
      resetBall();
    }
    if (ballPos.x < -TABLE_SIZE.x / 2) {
      setScore2((s) => s + 1);
      resetBall();
    }
  }, [isPaused, resetBall]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const speed = 1;
      if (!paddle1Ref.current || !paddle2Ref.current) return;

      // Player 1 controls (W/S)
      if (e.key === 'w') paddle1Ref.current.position.z -= speed;
      if (e.key === 's') paddle1Ref.current.position.z += speed;

      // Player 2 controls (Up/Down arrows)
      if (e.key === 'ArrowUp') paddle2Ref.current.position.z -= speed;
      if (e.key === 'ArrowDown') paddle2Ref.current.position.z += speed;

      // Clamp paddle positions
      paddle1Ref.current.position.z = Math.max(
        -TABLE_SIZE.x / 2 + PADDLE_SIZE.z,
        Math.min(
          TABLE_SIZE.x / 2 - PADDLE_SIZE.z,
          paddle1Ref.current.position.z
        )
      );
      paddle2Ref.current.position.z = Math.max(
        -TABLE_SIZE.x / 2 + PADDLE_SIZE.z,
        Math.min(
          TABLE_SIZE.x / 2 - PADDLE_SIZE.z,
          paddle2Ref.current.position.z
        )
      );
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
          <meshStandardMaterial color="#2ecc71" />
        </mesh>

        {/* Paddles */}
        <mesh ref={paddle1Ref} position={[-TABLE_SIZE.x / 2 + 0.5, 0, 0]}>
          <boxGeometry args={[PADDLE_SIZE.x, PADDLE_SIZE.y, PADDLE_SIZE.z]} />
          <meshStandardMaterial color="white" />
        </mesh>
        <mesh ref={paddle2Ref} position={[TABLE_SIZE.x / 2 - 0.5, 0, 0]}>
          <boxGeometry args={[PADDLE_SIZE.x, PADDLE_SIZE.y, PADDLE_SIZE.z]} />
          <meshStandardMaterial color="white" />
        </mesh>

        {/* Ball */}
        <mesh ref={ballRef} position={[0, BALL_SIZE, 0]}>
          <sphereGeometry args={[BALL_SIZE, 32, 32]} />
          <meshStandardMaterial color="yellow" />
        </mesh>

        {/* Score displays */}
        <Text position={[-5, 10, 0]} fontSize={4} color="white">
          {score1}
        </Text>
        <Text position={[5, 10, 0]} fontSize={4} color="white">
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
