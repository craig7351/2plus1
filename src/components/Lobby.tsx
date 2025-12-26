import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Lobby: React.FC = () => {
    const navigate = useNavigate();
    const [visitorCount, setVisitorCount] = useState<string>('載入中...');

    useEffect(() => {
        const API_URL = "https://counter-service.zeabur.app/api/visit";
        const PAGE_URL = "BOOK_2plus1";

        fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ url: PAGE_URL })
        })
            .then(response => response.json())
            .then(data => {
                setVisitorCount(data.count);
            })
            .catch(error => {
                console.error("Error:", error);
                setVisitorCount("N/A");
            });
    }, []);

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

            <div style={{
                marginTop: '30px',
                color: '#fff',
                fontSize: '14px',
                textShadow: '0 0 5px #00f3ff',
                fontFamily: 'monospace'
            }}>
                累積人氣: <span style={{ color: '#00ff88', fontSize: '16px', fontWeight: 'bold' }}>{visitorCount}</span>
            </div>
        </div>
    );
};

export default Lobby;
