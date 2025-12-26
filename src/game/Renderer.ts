import type { GameState } from './GameState';

export class Renderer {
    private ctx: CanvasRenderingContext2D;
    private width: number;
    private height: number;

    constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
    }

    draw(state: GameState) {
        // Clear screen
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw Ground
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(0, 500, this.width, 100);

        // Draw Status
        this.drawUI(state);

        // Draw Players
        state.players.forEach(player => {
            this.ctx.fillStyle = player.color;

            // Hit effect blink
            if (player.attackCooldown > 0 && player.state === 'hit') { // hit state not fully implemented in engine yet, just defensive coding
                this.ctx.fillStyle = 'white';
            }

            this.ctx.fillRect(player.x, player.y, player.width, player.height);

            // Direction Indicator (Eyes)
            this.ctx.fillStyle = 'white';
            const eyeX = player.direction === 1 ? player.x + 35 : player.x + 5;
            this.ctx.fillRect(eyeX, player.y + 20, 10, 10);

            // Attack Visual
            if (player.state === 'ATTACK') {
                this.ctx.fillStyle = 'yellow';
                const attackX = player.direction === 1 ? player.x + player.width : player.x - 30;
                this.ctx.fillRect(attackX, player.y + 40, 30, 20);
            }
        });

        // Draw Bullets
        if (state.bullets) {
            state.bullets.forEach(bullet => {
                this.ctx.fillStyle = bullet.color;
                this.ctx.beginPath();
                this.ctx.arc(bullet.x, bullet.y, 6, 0, Math.PI * 2);
                this.ctx.fill();

                // 發光效果
                this.ctx.shadowColor = bullet.color;
                this.ctx.shadowBlur = 10;
                this.ctx.beginPath();
                this.ctx.arc(bullet.x, bullet.y, 4, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
            });
        }

        if (state.status === 'GAME_OVER') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.fillStyle = 'white';
            this.ctx.font = '40px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`GAME OVER - ${state.winner} WINS`, this.width / 2, this.height / 2);
        }
    }

    drawUI(state: GameState) {
        // HP Bars
        const barWidth = 300;
        const barHeight = 30;

        state.players.forEach(player => {
            const x = player.id === 'P1' ? 50 : this.width - 50 - barWidth;
            const y = 30;

            // Background
            this.ctx.fillStyle = '#555';
            this.ctx.fillRect(x, y, barWidth, barHeight);

            // HP
            const hpPercent = Math.max(0, player.hp / player.maxHp);
            this.ctx.fillStyle = player.hp > 30 ? player.color : 'red';
            this.ctx.fillRect(x, y, barWidth * hpPercent, barHeight);

            // Border
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x, y, barWidth, barHeight);

            // Text
            this.ctx.fillStyle = 'white';
            this.ctx.font = '20px monospace';
            this.ctx.textAlign = player.id === 'P1' ? 'left' : 'right';
            this.ctx.fillText(player.id, player.id === 'P1' ? x : x + barWidth, y - 10);
        });

        if (state.status === 'WAITING') {
            this.ctx.fillStyle = 'white';
            this.ctx.font = '30px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('WAITING FOR PLAYERS...', this.width / 2, 200);
        }
    }
}
