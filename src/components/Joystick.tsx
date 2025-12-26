import React, { useRef, useState, useCallback, useEffect } from 'react';

interface JoystickProps {
    size?: number;
    onMove: (direction: { up: boolean; down: boolean; left: boolean; right: boolean }) => void;
}

const Joystick: React.FC<JoystickProps> = ({ size = 150, onMove }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);

    const maxDistance = size / 2 - 25; // 搖桿可移動的最大距離
    const threshold = 0.3; // 觸發方向的閾值 (30%)

    const updatePosition = useCallback((clientX: number, clientY: number) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        let deltaX = clientX - centerX;
        let deltaY = clientY - centerY;

        // 計算距離並限制在最大範圍內
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (distance > maxDistance) {
            deltaX = (deltaX / distance) * maxDistance;
            deltaY = (deltaY / distance) * maxDistance;
        }

        setPosition({ x: deltaX, y: deltaY });

        // 計算方向
        const normalizedX = deltaX / maxDistance;
        const normalizedY = deltaY / maxDistance;

        onMove({
            up: normalizedY < -threshold,
            down: normalizedY > threshold,
            left: normalizedX < -threshold,
            right: normalizedX > threshold,
        });
    }, [maxDistance, threshold, onMove]);

    const handleStart = useCallback((clientX: number, clientY: number) => {
        setIsDragging(true);
        updatePosition(clientX, clientY);
    }, [updatePosition]);

    const handleMove = useCallback((clientX: number, clientY: number) => {
        if (!isDragging) return;
        updatePosition(clientX, clientY);
    }, [isDragging, updatePosition]);

    const handleEnd = useCallback(() => {
        setIsDragging(false);
        setPosition({ x: 0, y: 0 });
        onMove({ up: false, down: false, left: false, right: false });
    }, [onMove]);

    // 觸控事件處理
    const onTouchStart = (e: React.TouchEvent) => {
        e.preventDefault();
        const touch = e.touches[0];
        handleStart(touch.clientX, touch.clientY);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        e.preventDefault();
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
    };

    const onTouchEnd = (e: React.TouchEvent) => {
        e.preventDefault();
        handleEnd();
    };

    // 滑鼠事件處理
    const onMouseDown = (e: React.MouseEvent) => {
        handleStart(e.clientX, e.clientY);
    };

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            handleMove(e.clientX, e.clientY);
        };

        const onMouseUp = () => {
            handleEnd();
        };

        if (isDragging) {
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [isDragging, handleMove, handleEnd]);

    return (
        <div
            ref={containerRef}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseDown={onMouseDown}
            style={{
                width: size,
                height: size,
                borderRadius: '50%',
                background: 'radial-gradient(circle, #444 0%, #222 100%)',
                border: '4px solid #666',
                position: 'relative',
                touchAction: 'none',
                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
            }}
        >
            {/* 搖桿頭 */}
            <div
                style={{
                    position: 'absolute',
                    width: 50,
                    height: 50,
                    borderRadius: '50%',
                    background: isDragging
                        ? 'radial-gradient(circle, #00f3ff 0%, #0088aa 100%)'
                        : 'radial-gradient(circle, #888 0%, #555 100%)',
                    border: '3px solid #aaa',
                    left: '50%',
                    top: '50%',
                    transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
                    transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                    boxShadow: isDragging
                        ? '0 0 15px #00f3ff, inset 0 0 10px rgba(255,255,255,0.3)'
                        : '0 2px 5px rgba(0,0,0,0.5)',
                }}
            />
        </div>
    );
};

export default Joystick;
