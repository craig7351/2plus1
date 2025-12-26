import React, { useEffect, useState, useRef } from 'react';
import { peerService } from '../services/PeerService';
import type { PeerMessage } from '../services/PeerService';
import { useNavigate } from 'react-router-dom';
import { GameEngine } from '../game/GameEngine';
import { Renderer } from '../game/Renderer';

const GameScreen: React.FC = () => {
    const navigate = useNavigate();
    const [roomId, setRoomId] = useState<string>('Initializing...');
    const [playerCount, setPlayerCount] = useState(0);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Game Logic Refs (to persist across renders without re-running effects)
    const engineRef = useRef<GameEngine>(new GameEngine());
    const rendererRef = useRef<Renderer | null>(null);
    const loopRef = useRef<number>(0);

    useEffect(() => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        rendererRef.current = new Renderer(ctx, canvasRef.current.width, canvasRef.current.height);

        const initHost = async () => {
            try {
                const id = await peerService.initialize();
                setRoomId(id);

                peerService.onConnection((conn) => {
                    console.log('Player connected:', conn.peer);
                    const playerId = engineRef.current.addPlayer(conn.peer);
                    // Optionally send back which player they are (not critical for MVP)
                    if (playerId) {
                        conn.send({ type: 'STATUS', payload: { id: playerId } });
                    }
                    setPlayersCountSafe();

                    conn.on('close', () => {
                        console.log('Player disconnected:', conn.peer);
                        engineRef.current.removePlayer(conn.peer);
                        setPlayersCountSafe();
                    });
                });

                peerService.onData((data: any, conn) => {
                    // Type guard or cast
                    const msg = data as PeerMessage;
                    if (msg && msg.type === 'INPUT') {
                        const { input, pressed } = msg.payload;
                        engineRef.current.handleInput(conn.peer, input, pressed);
                    } else if (msg && msg.type === 'RESTART') {
                        engineRef.current.restartGame();
                    }
                });

            } catch (err) {
                console.error('Failed to init host', err);
                setRoomId('Error creating room');
            }
        };

        const setPlayersCountSafe = () => {
            setPlayerCount(engineRef.current.state.players.length);
        };

        initHost();

        // 追蹤上次遊戲狀態
        let lastStatus = engineRef.current.state.status;

        // Game Loop
        const loop = () => {
            engineRef.current.update();
            if (rendererRef.current) {
                rendererRef.current.draw(engineRef.current.state);
            }

            // 檢測遊戲結束並通知手機
            const currentStatus = engineRef.current.state.status;
            if (currentStatus === 'GAME_OVER' && lastStatus !== 'GAME_OVER') {
                peerService.send({
                    type: 'GAME_OVER',
                    payload: { winner: engineRef.current.state.winner }
                });
            }
            lastStatus = currentStatus;

            loopRef.current = requestAnimationFrame(loop);
        };
        loopRef.current = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(loopRef.current);
        };
    }, []);

    return (
        <div className="game-screen" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="game-header" style={{ padding: '10px', background: '#333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1rem', cursor: 'pointer' }}>⬅ Exit</button>
                <div style={{ color: 'cyan', fontSize: '1.2rem', fontFamily: 'monospace' }}>
                    ROOM ID: <span style={{ backgroundColor: '#000', padding: '5px 10px', border: '1px solid cyan', userSelect: 'text', cursor: 'text' }}>{roomId}</span>
                </div>
                <div style={{ color: playerCount === 2 ? 'lime' : 'yellow', fontFamily: 'monospace' }}>
                    Players: {playerCount}/2
                </div>
            </div>

            <div className="canvas-container">
                <canvas ref={canvasRef} width={800} height={600} style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', background: '#000' }} />
            </div>
            <div style={{ textAlign: 'center', color: '#666', fontSize: '0.8rem', padding: '5px' }}>
                {playerCount < 2 ? 'Waiting for players to join... (Share Room ID)' : 'FIGHT! P1: WASD/Arrows | P2: Mobile'}
            </div>
        </div>
    );
};

export default GameScreen;
