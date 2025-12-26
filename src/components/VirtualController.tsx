import React, { useState } from 'react';
import { peerService } from '../services/PeerService';
import type { PeerMessage } from '../services/PeerService';
import { useNavigate } from 'react-router-dom';

const VirtualController: React.FC = () => {
    const navigate = useNavigate();
    const [roomId, setRoomId] = useState('');
    const [status, setStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED'>('DISCONNECTED');
    const [error, setError] = useState('');

    const handleConnect = async () => {
        if (!roomId) return;
        setStatus('CONNECTING');
        try {
            await peerService.initialize(); // Init self first to get an ID (needed for connection)
            await peerService.connect(roomId);
            setStatus('CONNECTED');
        } catch (err: any) {
            console.error(err);
            setError('Connection failed. Check Room ID.');
            setStatus('DISCONNECTED');
        }
    };

    const sendInput = (input: string, pressed: boolean) => {
        if (status !== 'CONNECTED') return;
        const msg: PeerMessage = {
            type: 'INPUT',
            payload: { input, pressed }
        };
        peerService.send(msg);
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
            <div style={{ textAlign: 'center', color: 'lime', marginBottom: 10 }}>CONNECTED TO {roomId}</div>

            <div className="controls-layout">
                <div className="d-pad">
                    <button
                        className="d-btn d-up"
                        onTouchStart={() => sendInput('UP', true)}
                        onTouchEnd={() => sendInput('UP', false)}
                        onMouseDown={() => sendInput('UP', true)}
                        onMouseUp={() => sendInput('UP', false)}
                    >▲</button>
                    <button
                        className="d-btn d-down"
                        onTouchStart={() => sendInput('DOWN', true)}
                        onTouchEnd={() => sendInput('DOWN', false)}
                        onMouseDown={() => sendInput('DOWN', true)}
                        onMouseUp={() => sendInput('DOWN', false)}
                    >▼</button>
                    <button
                        className="d-btn d-left"
                        onTouchStart={() => sendInput('LEFT', true)}
                        onTouchEnd={() => sendInput('LEFT', false)}
                        onMouseDown={() => sendInput('LEFT', true)}
                        onMouseUp={() => sendInput('LEFT', false)}
                    >◀</button>
                    <button
                        className="d-btn d-right"
                        onTouchStart={() => sendInput('RIGHT', true)}
                        onTouchEnd={() => sendInput('RIGHT', false)}
                        onMouseDown={() => sendInput('RIGHT', true)}
                        onMouseUp={() => sendInput('RIGHT', false)}
                    >▶</button>
                </div>

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
