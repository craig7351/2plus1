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
    shootCooldown: number; // 子彈冷卻
}

export interface Bullet {
    id: number;
    ownerId: string; // 發射者的 peerId
    x: number;
    y: number;
    vx: number;
    color: string;
    size: number; // 子彈大小 (1 = 普通, 2 = 大)
}

export interface Platform {
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
}

export interface GameState {
    players: Player[];
    bullets: Bullet[];
    platforms: Platform[];
    status: 'WAITING' | 'PLAYING' | 'GAME_OVER';
    winner?: string;
}

export const INITIAL_HP = 200;
export const PLAYER_WIDTH = 50;
export const PLAYER_HEIGHT = 100;
export const BULLET_SPEED = 15;
export const BULLET_DAMAGE = 5;
export const BIG_BULLET_DAMAGE = 15; // 大子彈傷害
export const SHOOT_COOLDOWN = 15; // 射擊冷卻幀數


