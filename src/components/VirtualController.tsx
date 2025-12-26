import React, { useState, useRef, useCallback } from 'react';
import { peerService } from '../services/PeerService';
import type { PeerMessage } from '../services/PeerService';
import { useNavigate } from 'react-router-dom';
import Joystick from './Joystick';

const VirtualController: React.FC = () => {
    const navigate = useNavigate();
    const [roomId, setRoomId] = useState('');
    const [status, setStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED'>('DISCONNECTED');
    const [error, setError] = useState('');
    const [gameOver, setGameOver] = useState<{ show: boolean; winner: string }>({ show: false, winner: '' });

    // 追蹤目前的方向狀態
    const currentDirectionRef = useRef({ up: false, down: false, left: false, right: false });

    const handleConnect = async () => {
        if (!roomId) return;
        setStatus('CONNECTING');
        try {
            await peerService.initialize();
            await peerService.connect(roomId);
            setStatus('CONNECTED');

            // 監聽來自 Host 的訊息
            peerService.onData((data: any) => {
                const msg = data as PeerMessage;
                if (msg && msg.type === 'GAME_OVER') {
                    setGameOver({ show: true, winner: msg.payload.winner });
                }
            });
        } catch (err: any) {
            console.error(err);
            setError('Connection failed. Check Room ID.');
            setStatus('DISCONNECTED');
        }
    };

    const sendInput = useCallback((input: string, pressed: boolean) => {
        if (status !== 'CONNECTED') return;
        const msg: PeerMessage = {
            type: 'INPUT',
            payload: { input, pressed }
        };
        peerService.send(msg);
    }, [status]);

    const handleJoystickMove = useCallback((direction: { up: boolean; down: boolean; left: boolean; right: boolean }) => {
        const prev = currentDirectionRef.current;

        // 只在狀態改變時發送
        if (direction.up !== prev.up) {
            sendInput('UP', direction.up);
        }
        if (direction.down !== prev.down) {
            sendInput('DOWN', direction.down);
        }
        if (direction.left !== prev.left) {
            sendInput('LEFT', direction.left);
        }
        if (direction.right !== prev.right) {
            sendInput('RIGHT', direction.right);
        }

        currentDirectionRef.current = direction;
    }, [sendInput]);

    const sendRestart = () => {
        if (status !== 'CONNECTED') return;
        const msg: PeerMessage = {
            type: 'RESTART',
            payload: {}
        };
        peerService.send(msg);
        setGameOver({ show: false, winner: '' });
    };

    if (status !== 'CONNECTED') {
        return (
            <div className="controller-screen">
                <button onClick={() => navigate('/')} style={{ position: 'absolute', top: 10, left: 10, background: 'none', border: 'none', color: 'white' }}>⬅ Back</button>
                <div className="connection-panel">
                    <h2>Enter Room ID</h2>
                    <input
                        className="room-input"
                        type="text"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        placeholder="Room ID"
                    />
                    <button className="menu-btn" onClick={handleConnect} disabled={status === 'CONNECTING'}>
                        {status === 'CONNECTING' ? 'CONNECTING...' : 'CONNECT'}
                    </button>
                    {error && <p style={{ color: 'red' }}>{error}</p>}
                </div>
            </div>
        );
    }

    return (
        <div className="controller-screen">
            {/* 遊戲結束彈窗 */}
            {gameOver.show && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.85)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000,
                }}>
                    <div style={{
                        textAlign: 'center',
                        color: 'white',
                    }}>
                        <h1 style={{
                            fontSize: '2rem',
                            marginBottom: '1rem',
                            color: '#ff00ff',
                            textShadow: '0 0 20px #ff00ff'
                        }}>
                            🎮 GAME OVER
                        </h1>
                        <p style={{
                            fontSize: '1.5rem',
                            marginBottom: '2rem',
                            color: '#00f3ff',
                        }}>
                            {gameOver.winner} WINS!
                        </p>
                        <button
                            onClick={sendRestart}
                            style={{
                                background: 'linear-gradient(135deg, #ff6600 0%, #ff3300 100%)',
                                border: 'none',
                                color: 'white',
                                padding: '20px 50px',
                                fontSize: '1.5rem',
                                fontWeight: 'bold',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                boxShadow: '0 0 30px rgba(255, 102, 0, 0.5)',
                            }}
                        >
                            🔄 RESTART
                        </button>
                    </div>
                </div>
            )}

            <div style={{ textAlign: 'center', color: 'lime', padding: '10px 20px', fontSize: '0.9rem' }}>
                CONNECTED TO {roomId}
            </div>

            <div className="controls-layout">
                {/* 搖桿控制 */}
                <Joystick size={160} onMove={handleJoystickMove} />

                {/* 動作按鈕 */}
                <div className="action-buttons">
                    <button
                        className="a-btn btn-A"
                        onTouchStart={() => sendInput('A', true)}
                        onTouchEnd={() => sendInput('A', false)}
                        onMouseDown={() => sendInput('A', true)}
                        onMouseUp={() => sendInput('A', false)}
                    >A</button>
                    <button
                        className="a-btn btn-B"
                        onTouchStart={() => sendInput('B', true)}
                        onTouchEnd={() => sendInput('B', false)}
                        onMouseDown={() => sendInput('B', true)}
                        onMouseUp={() => sendInput('B', false)}
                    >B</button>
                </div>
            </div>
        </div>
    );
};

export default VirtualController;


