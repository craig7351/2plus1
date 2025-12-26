import type { GameState, Player, Bullet } from './GameState';
import { INITIAL_HP, PLAYER_WIDTH, PLAYER_HEIGHT, BULLET_SPEED, BULLET_DAMAGE, BIG_BULLET_DAMAGE, SHOOT_COOLDOWN } from './GameState';

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

export const AI_PEER_ID = 'AI_PLAYER';

export class GameEngine {
    public state: GameState;
    private inputs: Map<string, InputState> = new Map();
    private aiPlayers: Set<string> = new Set(); // 追蹤哪些玩家是 AI

    // 音效回調
    public onJump?: () => void;
    public onAttack?: () => void;
    public onHit?: () => void;
    public onShoot?: () => void;
    public onGameStart?: () => void;
    public onGameOver?: (winner: string) => void;

    private bulletIdCounter = 0;

    // 必殺技指令追蹤 (後下前B)
    private inputHistory: Map<string, { input: string; time: number }[]> = new Map();
    private readonly COMMAND_TIMEOUT = 500; // 指令輸入時限 (ms)

    // 音效回調
    public onSpecialShoot?: () => void;

    constructor() {
        this.state = {
            players: [],
            bullets: [],
            platforms: [
                // Middle High
                { x: 300, y: 350, width: 200, height: 20, color: '#00ff88' },
                // Left Low
                { x: 50, y: 430, width: 150, height: 20, color: '#ff00ff' },
                // Right Low
                { x: 600, y: 430, width: 150, height: 20, color: '#00f3ff' },
                // Top Center (Red)
                { x: 200, y: 150, width: 400, height: 20, color: '#ff3333' },
                // Top Left
                { x: 100, y: 250, width: 100, height: 20, color: '#ffff33' },
                // Top Right
                { x: 600, y: 250, width: 100, height: 20, color: '#ffff33' }
            ],
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
        this.aiPlayers.delete(peerId);
        if (this.state.players.length < 2 && this.state.status === 'PLAYING') {
            this.state.status = 'WAITING';
        }
    }

    // 加入 AI 玩家
    addAI(): string {
        const aiId = AI_PEER_ID + '_' + Date.now();
        const playerId = this.addPlayer(aiId);
        if (playerId) {
            this.aiPlayers.add(aiId);
        }
        return playerId;
    }

    // AI 決策邏輯
    private updateAI() {
        this.aiPlayers.forEach(aiPeerId => {
            const aiPlayer = this.state.players.find(p => p.peerId === aiPeerId);
            const opponent = this.state.players.find(p => p.peerId !== aiPeerId);
            if (!aiPlayer || !opponent) return;

            const input = this.inputs.get(aiPeerId);
            if (!input) return;

            // 重置所有輸入
            input.LEFT = false;
            input.RIGHT = false;
            input.UP = false;
            input.A = false;
            input.B = false;

            const dx = opponent.x - aiPlayer.x;
            const distance = Math.abs(dx);

            // 移動向對手
            if (distance > 100) {
                if (dx > 0) {
                    input.RIGHT = true;
                } else {
                    input.LEFT = true;
                }
            } else if (distance < 50) {
                // 太近就後退
                if (dx > 0) {
                    input.LEFT = true;
                } else {
                    input.RIGHT = true;
                }
            }

            // 閃避子彈
            const incomingBullet = this.state.bullets.find(b =>
                b.ownerId !== aiPeerId &&
                Math.abs(b.y - (aiPlayer.y + aiPlayer.height / 2)) < 60 &&
                ((b.vx > 0 && b.x < aiPlayer.x && b.x > aiPlayer.x - 200) ||
                    (b.vx < 0 && b.x > aiPlayer.x && b.x < aiPlayer.x + 200))
            );
            if (incomingBullet && aiPlayer.isGrounded && Math.random() > 0.3) {
                input.UP = true;
            }

            // 攻擊邏輯
            if (distance < 80 && aiPlayer.attackCooldown <= 0 && Math.random() > 0.5) {
                input.A = true;
            }

            // 射擊邏輯
            if (distance > 80 && distance < 400 && aiPlayer.shootCooldown <= 0 && Math.random() > 0.7) {
                input.B = true;
            }

            // 隨機跳躍
            if (aiPlayer.isGrounded && Math.random() > 0.98) {
                input.UP = true;
            }
        });
    }

    handleInput(peerId: string, input: string, pressed: boolean) {
        const playerInputs = this.inputs.get(peerId);
        if (playerInputs) {
            const key = input as keyof InputState;
            playerInputs[key] = pressed;

            // 記錄按下的輸入歷史 (只記錄方向鍵)
            if (pressed && (input === 'LEFT' || input === 'RIGHT' || input === 'DOWN')) {
                this.recordInput(peerId, input);
            }
        }
    }

    // 記錄輸入歷史
    private recordInput(peerId: string, input: string) {
        if (!this.inputHistory.has(peerId)) {
            this.inputHistory.set(peerId, []);
        }

        const history = this.inputHistory.get(peerId)!;
        history.push({ input, time: Date.now() });

        // 只保留最近 10 個輸入
        if (history.length > 10) {
            history.shift();
        }
    }

    // 檢查是否輸入了必殺技指令 (後下前 + B)
    private checkSpecialCommand(peerId: string): boolean {
        const history = this.inputHistory.get(peerId);
        if (!history || history.length < 3) return false;

        const player = this.state.players.find(p => p.peerId === peerId);
        if (!player) return false;

        const now = Date.now();
        const recentInputs = history.filter(h => now - h.time < this.COMMAND_TIMEOUT);

        if (recentInputs.length < 3) return false;

        // 根據玩家方向決定「後」和「前」
        const back = player.direction === 1 ? 'LEFT' : 'RIGHT';
        const forward = player.direction === 1 ? 'RIGHT' : 'LEFT';

        // 檢查最近三個輸入是否為 後下前
        const last3 = recentInputs.slice(-3);
        if (last3[0].input === back &&
            last3[1].input === 'DOWN' &&
            last3[2].input === forward) {
            // 清除歷史，避免重複觸發
            this.inputHistory.set(peerId, []);
            return true;
        }

        return false;
    }

    update() {
        if (this.state.status !== 'PLAYING') return;

        // 更新 AI 輸入
        this.updateAI();

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
                // 檢查是否觸發必殺技
                if (this.checkSpecialCommand(player.peerId)) {
                    this.shootBullet(player, 2); // 大子彈
                    this.onSpecialShoot?.();
                } else {
                    this.shootBullet(player, 1); // 普通子彈
                    this.onShoot?.();
                }
                player.shootCooldown = SHOOT_COOLDOWN;
            }

            // Physics Application
            player.vy += GRAVITY;
            player.x += player.vx;
            player.y += player.vy;

            // Platform Collision
            if (player.vy >= 0) { // Only check when falling
                this.state.platforms.forEach(platform => {
                    if (
                        player.y + player.height >= platform.y &&
                        player.y + player.height <= platform.y + player.vy + 10 && // Check if passing through from above
                        player.x + player.width > platform.x &&
                        player.x < platform.x + platform.width
                    ) {
                        player.y = platform.y - player.height;
                        player.vy = 0;
                        player.isGrounded = true;
                        if (player.state === 'JUMP') player.state = 'IDLE';
                    }
                });
            }

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
    shootBullet(player: Player, size: number = 1) {
        const bulletSize = size * 6; // 子彈實際大小
        const bullet: Bullet = {
            id: this.bulletIdCounter++,
            ownerId: player.peerId,
            x: player.direction === 1 ? player.x + player.width : player.x - bulletSize,
            y: player.y + player.height / 2 - bulletSize / 2,
            vx: player.direction * BULLET_SPEED * (size === 2 ? 0.8 : 1), // 大子彈稍慢
            color: player.color,
            size: size,
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
                // 根據子彈大小決定傷害
                const damage = bullet.size === 2 ? BIG_BULLET_DAMAGE : BULLET_DAMAGE;
                hitPlayer.hp -= damage;
                bulletsToRemove.push(bullet.id);
                this.onHit?.();
            }
        });

        // 移除已處理的子彈
        this.state.bullets = this.state.bullets.filter(b => !bulletsToRemove.includes(b.id));
    }
}
