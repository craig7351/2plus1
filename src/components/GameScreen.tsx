import React, { useEffect, useState, useRef, useCallback } from 'react';
import { peerService } from '../services/PeerService';
import type { PeerMessage } from '../services/PeerService';
import { useNavigate } from 'react-router-dom';
import { GameEngine } from '../game/GameEngine';
import { Renderer } from '../game/Renderer';
import { soundService } from '../services/SoundService';

const HOST_PEER_ID = 'HOST_LOCAL';

const GameScreen: React.FC = () => {
    const navigate = useNavigate();
    const [roomId, setRoomId] = useState<string>('Initializing...');
    const [playerCount, setPlayerCount] = useState(0);
    const [pcJoined, setPcJoined] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Game Logic Refs (to persist across renders without re-running effects)
    const engineRef = useRef<GameEngine>(new GameEngine());
    const rendererRef = useRef<Renderer | null>(null);
    const loopRef = useRef<number>(0);

    // 讓 PC 加入遊戲
    const handlePcJoin = useCallback(() => {
        if (pcJoined) return;
        const playerId = engineRef.current.addPlayer(HOST_PEER_ID);
        if (playerId) {
            setPcJoined(true);
            setPlayerCount(engineRef.current.state.players.length);
            soundService.connected();
        }
    }, [pcJoined]);

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
                    if (playerId) {
                        conn.send({ type: 'STATUS', payload: { id: playerId } });
                    }
                    setPlayerCount(engineRef.current.state.players.length);

                    conn.on('close', () => {
                        console.log('Player disconnected:', conn.peer);
                        engineRef.current.removePlayer(conn.peer);
                        setPlayerCount(engineRef.current.state.players.length);
                    });
                });

                peerService.onData((data: any, conn) => {
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

        initHost();

        // 鍵盤控制映射
        const keyMap: { [key: string]: string } = {
            'ArrowUp': 'UP', 'w': 'UP', 'W': 'UP',
            'ArrowDown': 'DOWN', 's': 'DOWN', 'S': 'DOWN',
            'ArrowLeft': 'LEFT', 'a': 'LEFT', 'A': 'LEFT',
            'ArrowRight': 'RIGHT', 'd': 'RIGHT', 'D': 'RIGHT',
            ' ': 'A', 'j': 'A', 'J': 'A',
            'k': 'B', 'K': 'B',
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            const input = keyMap[e.key];
            if (input) {
                e.preventDefault();
                engineRef.current.handleInput(HOST_PEER_ID, input, true);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const input = keyMap[e.key];
            if (input) {
                e.preventDefault();
                engineRef.current.handleInput(HOST_PEER_ID, input, false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // 設置音效回調
        engineRef.current.onJump = () => soundService.jump();
        engineRef.current.onAttack = () => soundService.attack();
        engineRef.current.onHit = () => soundService.hit();
        engineRef.current.onGameOver = () => soundService.victory();

        // 追蹤上次遊戲狀態
        let lastStatus = engineRef.current.state.status;

        // Game Loop
        const loop = () => {
            engineRef.current.update();
            if (rendererRef.current) {
                rendererRef.current.draw(engineRef.current.state);
            }

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
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    return (
        <div className="game-screen" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="game-header" style={{ padding: '10px', background: '#333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1rem', cursor: 'pointer' }}>⬅ Exit</button>
                <div style={{ color: 'cyan', fontSize: '1.2rem', fontFamily: 'monospace' }}>
                    ROOM ID: <span style={{ backgroundColor: '#000', padding: '5px 10px', border: '1px solid cyan', userSelect: 'text', cursor: 'text' }}>{roomId}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {!pcJoined && playerCount < 2 && (
                        <button
                            onClick={handlePcJoin}
                            style={{
                                background: 'linear-gradient(135deg, #00f3ff 0%, #0088aa 100%)',
                                border: 'none',
                                color: 'black',
                                padding: '8px 16px',
                                fontSize: '0.9rem',
                                fontWeight: 'bold',
                                borderRadius: '5px',
                                cursor: 'pointer',
                            }}
                        >
                            🎮 PC 加入遊戲
                        </button>
                    )}
                    <div style={{ color: playerCount === 2 ? 'lime' : 'yellow', fontFamily: 'monospace' }}>
                        Players: {playerCount}/2
                    </div>
                </div>
            </div>

            <div className="canvas-container">
                <canvas ref={canvasRef} width={800} height={600} style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', background: '#000' }} />
            </div>

            <div style={{ textAlign: 'center', color: '#888', fontSize: '0.85rem', padding: '10px', background: '#1a1a1a' }}>
                {playerCount < 2 ? (
                    <span>等待玩家加入中... (分享 Room ID 給朋友，或點擊「PC 加入遊戲」用鍵盤操作)</span>
                ) : (
                    <span style={{ color: 'lime' }}>FIGHT!</span>
                )}
                <div style={{ marginTop: '8px', color: '#666' }}>
                    <strong style={{ color: '#00f3ff' }}>PC 控制：</strong>
                    <span style={{ marginLeft: '10px' }}>移動: <code style={{ background: '#333', padding: '2px 6px', borderRadius: '3px' }}>W A S D</code> 或 <code style={{ background: '#333', padding: '2px 6px', borderRadius: '3px' }}>方向鍵</code></span>
                    <span style={{ marginLeft: '15px' }}>攻擊: <code style={{ background: '#333', padding: '2px 6px', borderRadius: '3px' }}>空白鍵</code> 或 <code style={{ background: '#333', padding: '2px 6px', borderRadius: '3px' }}>J</code></span>
                </div>
            </div>
        </div>
    );
};

export default GameScreen;

