import type { GameState, Player, Bullet } from './GameState';
import { INITIAL_HP, PLAYER_WIDTH, PLAYER_HEIGHT, BULLET_SPEED, BULLET_DAMAGE, SHOOT_COOLDOWN } from './GameState';

const GRAVITY = 0.5;
const MOVE_SPEED = 5;
const JUMP_FORCE = -12;
const GROUND_Y = 500;
const CANVAS_WIDTH = 800;

type InputState = {
    UP: boolean;
    DOWN: boolean;
    LEFT: boolean;
    RIGHT: boolean;
    A: boolean;
    B: boolean;
};

export class GameEngine {
    public state: GameState;
    private inputs: Map<string, InputState> = new Map();

    // 音效回調
    public onJump?: () => void;
    public onAttack?: () => void;
    public onHit?: () => void;
    public onShoot?: () => void;
    public onGameStart?: () => void;
    public onGameOver?: (winner: string) => void;

    private bulletIdCounter = 0;

    constructor() {
        this.state = {
            players: [],
            bullets: [],
            status: 'WAITING'
        };
    }

    // 重新開始遊戲
    restartGame() {
        // 重置所有玩家的 HP 和位置
        this.state.players.forEach((player, index) => {
            player.hp = INITIAL_HP;
            player.x = index === 0 ? 100 : 700 - PLAYER_WIDTH;
            player.y = 500 - PLAYER_HEIGHT; // GROUND_Y - PLAYER_HEIGHT
            player.vx = 0;
            player.vy = 0;
            player.state = 'IDLE';
            player.isGrounded = false;
            player.attackCooldown = 0;
            player.shootCooldown = 0;
        });
        this.state.bullets = [];
        this.state.status = this.state.players.length >= 2 ? 'PLAYING' : 'WAITING';
        this.state.winner = undefined;
    }

    addPlayer(peerId: string): string {
        // 防止同一玩家重複加入
        const existingPlayer = this.state.players.find(p => p.peerId === peerId);
        if (existingPlayer) {
            return existingPlayer.id;
        }

        if (this.state.players.length >= 2) return '';

        const id = this.state.players.length === 0 ? 'P1' : 'P2';
        const startX = id === 'P1' ? 100 : 700 - PLAYER_WIDTH;
        const color = id === 'P1' ? '#00f3ff' : '#ff00ff';
        const direction = id === 'P1' ? 1 : -1;

        const newPlayer: Player = {
            id,
            peerId,
            x: startX,
            y: GROUND_Y - PLAYER_HEIGHT,
            width: PLAYER_WIDTH,
            height: PLAYER_HEIGHT,
            vx: 0,
            vy: 0,
            hp: INITIAL_HP,
            maxHp: INITIAL_HP,
            isGrounded: false,
            state: 'IDLE',
            direction,
            color,
            attackCooldown: 0,
            shootCooldown: 0
        };

        // Initialize input for this player
        this.inputs.set(peerId, { UP: false, DOWN: false, LEFT: false, RIGHT: false, A: false, B: false });

        this.state.players.push(newPlayer);

        if (this.state.players.length === 2) {
            this.state.status = 'PLAYING';
        }

        return id;
    }

    removePlayer(peerId: string) {
        this.state.players = this.state.players.filter(p => p.peerId !== peerId);
        if (this.state.players.length < 2 && this.state.status === 'PLAYING') {
            this.state.status = 'WAITING';
        }
    }

    handleInput(peerId: string, input: string, pressed: boolean) {
        const playerInputs = this.inputs.get(peerId);
        if (playerInputs) {
            const key = input as keyof InputState;
            playerInputs[key] = pressed;
        }
    }

    update() {
        if (this.state.status !== 'PLAYING') return;

        this.state.players.forEach(player => {
            const input = this.inputs.get(player.peerId);
            if (!input) return;

            // Horizontal Movement
            if (input.LEFT) {
                player.vx = -MOVE_SPEED;
                player.direction = -1;
                if (player.state !== 'JUMP' && player.state !== 'ATTACK') player.state = 'RUN';
            } else if (input.RIGHT) {
                player.vx = MOVE_SPEED;
                player.direction = 1;
                if (player.state !== 'JUMP' && player.state !== 'ATTACK') player.state = 'RUN';
            } else {
                player.vx = 0;
                if (player.state !== 'JUMP' && player.state !== 'ATTACK') player.state = 'IDLE';
            }

            // Jump
            if (input.UP && player.isGrounded) {
                player.vy = JUMP_FORCE;
                player.isGrounded = false;
                player.state = 'JUMP';
                this.onJump?.();
            }

            // Attack (A 按鍵)
            if (input.A && player.attackCooldown <= 0) {
                player.state = 'ATTACK';
                player.attackCooldown = 20;
                this.onAttack?.();
                this.checkAttackHit(player);
            }

            // Shoot (B 按鍵)
            if (input.B && player.shootCooldown <= 0) {
                this.shootBullet(player);
                player.shootCooldown = SHOOT_COOLDOWN;
                this.onShoot?.();
            }

            // Physics Application
            player.vy += GRAVITY;
            player.x += player.vx;
            player.y += player.vy;

            // Ground Collision
            if (player.y + player.height >= GROUND_Y) {
                player.y = GROUND_Y - player.height;
                player.vy = 0;
                player.isGrounded = true;
                if (player.state === 'JUMP') player.state = 'IDLE';
            }

            // Bounds
            if (player.x < 0) player.x = 0;
            if (player.x + player.width > CANVAS_WIDTH) player.x = CANVAS_WIDTH - player.width;

            // Cooldowns
            if (player.attackCooldown > 0) {
                player.attackCooldown--;
                if (player.attackCooldown === 0 && player.state === 'ATTACK') {
                    player.state = 'IDLE';
                }
            }
            if (player.shootCooldown > 0) {
                player.shootCooldown--;
            }
        });

        // Update bullets
        this.updateBullets();

        // Check game over
        const loser = this.state.players.find(p => p.hp <= 0);
        if (loser) {
            this.state.status = 'GAME_OVER';
            const winner = this.state.players.find(p => p.hp > 0)?.id || 'Draw';
            this.state.winner = winner;
            this.onGameOver?.(winner);
        }
    }

    checkAttackHit(attacker: Player) {
        const opponent = this.state.players.find(p => p.peerId !== attacker.peerId);
        if (!opponent) return;

        // Simple AABB hit check with range
        const attackRange = 40;
        const hitBoxX = attacker.direction === 1 ? attacker.x + attacker.width : attacker.x - attackRange;
        const hitBoxWidth = attackRange;

        // Overlap check
        if (
            hitBoxX < opponent.x + opponent.width &&
            hitBoxX + hitBoxWidth > opponent.x &&
            attacker.y < opponent.y + opponent.height &&
            attacker.y + attacker.height > opponent.y
        ) {
            opponent.hp -= 10;
            // Simple knockback
            opponent.vx = attacker.direction * 10;
            opponent.vy = -5;
            opponent.isGrounded = false;
            this.onHit?.();
        }
    }

    // 發射子彈
    shootBullet(player: Player) {
        const bullet: Bullet = {
            id: this.bulletIdCounter++,
            ownerId: player.peerId,
            x: player.direction === 1 ? player.x + player.width : player.x - 10,
            y: player.y + player.height / 2 - 5,
            vx: player.direction * BULLET_SPEED,
            color: player.color,
        };
        this.state.bullets.push(bullet);
    }

    // 更新子彈
    updateBullets() {
        const bulletsToRemove: number[] = [];

        this.state.bullets.forEach(bullet => {
            // 移動子彈
            bullet.x += bullet.vx;

            // 檢查是否超出邊界
            if (bullet.x < -20 || bullet.x > CANVAS_WIDTH + 20) {
                bulletsToRemove.push(bullet.id);
                return;
            }

            // 檢查碰撞玩家
            const hitPlayer = this.state.players.find(player =>
                player.peerId !== bullet.ownerId &&
                bullet.x > player.x &&
                bullet.x < player.x + player.width &&
                bullet.y > player.y &&
                bullet.y < player.y + player.height
            );

            if (hitPlayer) {
                hitPlayer.hp -= BULLET_DAMAGE;
                bulletsToRemove.push(bullet.id);
                this.onHit?.();
            }
        });

        // 移除已處理的子彈
        this.state.bullets = this.state.bullets.filter(b => !bulletsToRemove.includes(b.id));
    }
}
