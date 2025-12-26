import React from 'react';
import { useNavigate } from 'react-router-dom';

const Lobby: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="lobby-screen">
            <h1 className="game-title">PIXEL FIGHTERS</h1>
            <div className="menu-buttons">
                <button className="menu-btn host-btn" onClick={() => navigate('/host')}>
                    <span className="icon">🖥️</span>
                    <span className="text">建立遊戲 (HOST)</span>
                </button>
                <button className="menu-btn join-btn" onClick={() => navigate('/join')}>
                    <span className="icon">📱</span>
                    <span className="text">加入遊戲 (JOIN)</span>
                </button>
            </div>
        </div>
    );
};

export default Lobby;
