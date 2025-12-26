export interface Player {
    id: string; // 'P1' | 'P2'
    peerId: string;
    x: number;
    y: number;
    width: number;
    height: number;
    vx: number;
    vy: number;
    hp: number;
    maxHp: number;
    isGrounded: boolean;
    state: 'IDLE' | 'RUN' | 'JUMP' | 'ATTACK' | 'hit';
    direction: 1 | -1; // 1 = right, -1 = left
    color: string;
    attackCooldown: number;
}

export interface GameState {
    players: Player[];
    status: 'WAITING' | 'PLAYING' | 'GAME_OVER';
    winner?: string;
}

export const INITIAL_HP = 100;
export const PLAYER_WIDTH = 50;
export const PLAYER_HEIGHT = 100;
