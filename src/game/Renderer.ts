import type { GameState } from './GameState';

// 粒子類型
interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    color: string;
    size: number;
    type: 'spark' | 'dust' | 'energy';
}

export class Renderer {
    private ctx: CanvasRenderingContext2D;
    private width: number;
    private height: number;

    // 畫面震動
    private shakeIntensity: number = 0;
    private shakeDecay: number = 0.9;

    // 粒子系統
    private particles: Particle[] = [];

    // 背景元素
    private stars: { x: number; y: number; size: number; brightness: number }[] = [];
    private cityLights: { x: number; y: number; width: number; height: number; color: string; windows: { x: number; y: number; brightness: number }[] }[] = [];

    constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.initBackground();
    }

    // 初始化背景元素
    private initBackground() {
        // 生成星星
        for (let i = 0; i < 50; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * 300,
                size: Math.random() * 2 + 0.5,
                brightness: Math.random()
            });
        }

        // 生成城市建築
        for (let i = 0; i < 15; i++) {
            const bx = i * 60 + Math.random() * 20;
            const by = 350 + Math.random() * 100;
            const bw = 30 + Math.random() * 40;

            // 預先生成窗戶燈光
            const windows: { x: number; y: number; brightness: number }[] = [];
            for (let wy = by + 10; wy < 490; wy += 15) {
                for (let wx = bx + 5; wx < bx + bw - 10; wx += 12) {
                    if (Math.random() > 0.3) {
                        windows.push({
                            x: wx,
                            y: wy,
                            brightness: 0.3 + Math.random() * 0.7
                        });
                    }
                }
            }

            this.cityLights.push({
                x: bx,
                y: by,
                width: bw,
                height: 50 + Math.random() * 100,
                color: `hsl(${200 + Math.random() * 60}, 70%, ${20 + Math.random() * 20}%)`,
                windows
            });
        }
    }

    // 觸發畫面震動
    shake(intensity: number) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    }

    // 生成命中粒子
    spawnHitParticles(x: number, y: number, color: string) {
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 5;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 20 + Math.random() * 15,
                maxLife: 35,
                color,
                size: 3 + Math.random() * 4,
                type: 'spark'
            });
        }
    }

    // 生成必殺技粒子
    spawnSpecialParticles(x: number, y: number, color: string) {
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            this.particles.push({
                x: x + (Math.random() - 0.5) * 40,
                y: y + (Math.random() - 0.5) * 40,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 30 + Math.random() * 20,
                maxLife: 50,
                color,
                size: 5 + Math.random() * 8,
                type: 'energy'
            });
        }
    }

    // 生成跳躍塵土
    spawnDustParticles(x: number, y: number) {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: x + Math.random() * 50,
                y,
                vx: (Math.random() - 0.5) * 3,
                vy: -Math.random() * 2,
                life: 15 + Math.random() * 10,
                maxLife: 25,
                color: '#888',
                size: 4 + Math.random() * 4,
                type: 'dust'
            });
        }
    }

    // 更新粒子
    private updateParticles() {
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1; // 重力
            p.life--;
            return p.life > 0;
        });
    }

    draw(state: GameState) {
        // 計算畫面震動偏移
        let offsetX = 0, offsetY = 0;
        if (this.shakeIntensity > 0.5) {
            offsetX = (Math.random() - 0.5) * this.shakeIntensity * 2;
            offsetY = (Math.random() - 0.5) * this.shakeIntensity * 2;
            this.shakeIntensity *= this.shakeDecay;
        } else {
            this.shakeIntensity = 0;
        }

        this.ctx.save();
        this.ctx.translate(offsetX, offsetY);

        // 繪製漸層背景
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#0a0015');
        gradient.addColorStop(0.5, '#1a0530');
        gradient.addColorStop(1, '#0d0d1a');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 繪製星星 (閃爍效果)
        this.stars.forEach(star => {
            const flicker = 0.5 + Math.sin(Date.now() * 0.005 + star.brightness * 10) * 0.5;
            this.ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness * flicker})`;
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // 繪製城市輪廓
        this.cityLights.forEach(building => {
            this.ctx.fillStyle = building.color;
            this.ctx.fillRect(building.x, building.y, building.width, 500 - building.y);

            // 窗戶燈光 (使用預先生成的資訊)
            building.windows.forEach(window => {
                this.ctx.fillStyle = `rgba(255, 220, 150, ${window.brightness})`;
                this.ctx.fillRect(window.x, window.y, 6, 8);
            });
        });

        // 繪製平台
        // 繪製平台
        this.drawPlatforms(state);

        // 繪製道具
        this.drawItems(state);

        // 繪製地面
        const groundGradient = this.ctx.createLinearGradient(0, 500, 0, 600);
        groundGradient.addColorStop(0, '#2a2a40');
        groundGradient.addColorStop(1, '#1a1a2e');
        this.ctx.fillStyle = groundGradient;
        this.ctx.fillRect(0, 500, this.width, 100);

        // 地面線條
        this.ctx.strokeStyle = '#4a4a6a';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, 500);
        this.ctx.lineTo(this.width, 500);
        this.ctx.stroke();

        // 繪製 UI
        this.drawUI(state);

        // 繪製玩家
        state.players.forEach(player => {
            // 玩家陰影
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.beginPath();
            this.ctx.ellipse(player.x + player.width / 2, 500, player.width / 2, 10, 0, 0, Math.PI * 2);
            this.ctx.fill();

            // 玩家身體 (漸層)
            const playerGradient = this.ctx.createLinearGradient(player.x, player.y, player.x + player.width, player.y + player.height);
            playerGradient.addColorStop(0, player.color);
            playerGradient.addColorStop(1, this.darkenColor(player.color, 0.5));
            this.ctx.fillStyle = playerGradient;

            // 圓角矩形身體
            this.roundRect(player.x, player.y, player.width, player.height, 8);

            // 眼睛
            this.ctx.fillStyle = 'white';
            const eyeX = player.direction === 1 ? player.x + 32 : player.x + 8;
            this.ctx.beginPath();
            this.ctx.arc(eyeX, player.y + 25, 8, 0, Math.PI * 2);
            this.ctx.fill();

            // 瞳孔
            this.ctx.fillStyle = '#111';
            this.ctx.beginPath();
            this.ctx.arc(eyeX + player.direction * 2, player.y + 26, 4, 0, Math.PI * 2);
            this.ctx.fill();

            // 攻擊特效
            if (player.state === 'ATTACK') {
                const attackX = player.direction === 1 ? player.x + player.width : player.x - 40;

                // 攻擊光暈
                this.ctx.shadowColor = 'yellow';
                this.ctx.shadowBlur = 20;
                this.ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
                this.ctx.beginPath();
                this.ctx.moveTo(attackX, player.y + 35);
                this.ctx.lineTo(attackX + player.direction * 40, player.y + 50);
                this.ctx.lineTo(attackX, player.y + 65);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
            }
        });

        // 繪製子彈
        if (state.bullets) {
            state.bullets.forEach(bullet => {
                const radius = (bullet.size || 1) * 6;

                // 子彈拖尾
                for (let i = 1; i <= 5; i++) {
                    const alpha = 0.3 - i * 0.05;
                    const tailX = bullet.x - bullet.vx * i * 0.5;
                    this.ctx.fillStyle = `${bullet.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
                    this.ctx.beginPath();
                    this.ctx.arc(tailX, bullet.y, radius * (1 - i * 0.1), 0, Math.PI * 2);
                    this.ctx.fill();
                }

                // 子彈本體
                this.ctx.shadowColor = bullet.color;
                this.ctx.shadowBlur = bullet.size === 2 ? 30 : 15;
                this.ctx.fillStyle = bullet.color;
                this.ctx.beginPath();
                this.ctx.arc(bullet.x, bullet.y, radius, 0, Math.PI * 2);
                this.ctx.fill();

                // 子彈核心亮點
                this.ctx.fillStyle = 'white';
                this.ctx.beginPath();
                this.ctx.arc(bullet.x, bullet.y, radius * 0.4, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
            });
        }

        // 繪製粒子
        this.updateParticles();
        this.particles.forEach(p => {
            const alpha = p.life / p.maxLife;
            this.ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');

            if (p.type === 'energy') {
                this.ctx.shadowColor = p.color;
                this.ctx.shadowBlur = 10;
            }

            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        });

        // 遊戲結束畫面
        if (state.status === 'GAME_OVER') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.width, this.height);

            // 勝利文字發光效果
            this.ctx.shadowColor = '#ff00ff';
            this.ctx.shadowBlur = 30;
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 50px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 30);

            this.ctx.shadowColor = '#00f3ff';
            this.ctx.font = 'bold 40px monospace';
            this.ctx.fillText(`${state.winner} WINS!`, this.width / 2, this.height / 2 + 30);
            this.ctx.shadowBlur = 0;
        }

        this.ctx.restore();
    }

    // 輔助函數：繪製圓角矩形
    private roundRect(x: number, y: number, w: number, h: number, r: number) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + r, y);
        this.ctx.lineTo(x + w - r, y);
        this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        this.ctx.lineTo(x + w, y + h - r);
        this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        this.ctx.lineTo(x + r, y + h);
        this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        this.ctx.lineTo(x, y + r);
        this.ctx.quadraticCurveTo(x, y, x + r, y);
        this.ctx.closePath();
        this.ctx.fill();
    }

    private drawPlatforms(state: GameState) {
        if (!state.platforms) return;

        state.platforms.forEach(platform => {
            this.ctx.shadowColor = platform.color;
            this.ctx.shadowBlur = 15;
            this.ctx.fillStyle = platform.color;

            // Draw platform with rounded corners
            this.roundRect(platform.x, platform.y, platform.width, platform.height, 5);

            // Add a lighter top border for 3D effect
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.fillRect(platform.x + 5, platform.y, platform.width - 10, 2);

            this.ctx.shadowBlur = 0;
        });
    }

    // 輔助函數：加深顏色
    private darkenColor(color: string, factor: number): string {
        const hex = color.replace('#', '');
        const r = Math.floor(parseInt(hex.substring(0, 2), 16) * factor);
        const g = Math.floor(parseInt(hex.substring(2, 4), 16) * factor);
        const b = Math.floor(parseInt(hex.substring(4, 6), 16) * factor);
        return `rgb(${r}, ${g}, ${b})`;
    }

    private drawItems(state: GameState) {
        if (!state.items) return;

        state.items.forEach(item => {
            let color = 'white';
            let label = '?';

            switch (item.type) {
                case 'HEAL': color = '#ff3333'; label = '❤'; break;
                case 'SPEED': color = '#ffff33'; label = '⚡'; break;
                case 'RAPID': color = '#aa33ff'; label = '🔫'; break;
                case 'JUMP': color = '#33ff33'; label = '⏫'; break;
            }

            // Bobbing animation
            const offsetY = Math.sin(Date.now() * 0.005) * 5;

            this.ctx.shadowColor = color;
            this.ctx.shadowBlur = 20;
            this.ctx.fillStyle = color;
            this.roundRect(item.x, item.y + offsetY, item.width, item.height, 5);

            // Icon/Label
            this.ctx.fillStyle = 'white';
            this.ctx.font = '20px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(label, item.x + item.width / 2, item.y + item.height / 2 + offsetY);

            this.ctx.shadowBlur = 0;
            this.ctx.textBaseline = 'alphabetic'; // Reset baseline
        });
    }

    private drawBuffs(player: Player, x: number, y: number) {
        let buffX = x;
        const iconSize = 25; // Slightly larger for clarity
        const gap = 30; // More space between icons

        if (player.speedBuffTimer > 0) {
            this.ctx.font = '20px sans-serif';
            this.ctx.fillStyle = '#ffff33';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('⚡', buffX, y);
            buffX += gap;
        }
        if (player.rapidBuffTimer > 0) {
            this.ctx.font = '20px sans-serif';
            this.ctx.fillStyle = '#aa33ff';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('🔫', buffX, y);
            buffX += gap;
        }
        if (player.jumpBuffTimer > 0) {
            this.ctx.font = '20px sans-serif';
            this.ctx.fillStyle = '#33ff33';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('⏫', buffX, y);
            buffX += gap;
        }
    }

    drawUI(state: GameState) {
        const barWidth = 300;
        const barHeight = 25;

        state.players.forEach(player => {
            const x = player.id === 'P1' ? 50 : this.width - 50 - barWidth;
            const y = 30;

            // 血條背景 (帶邊框)
            this.ctx.fillStyle = '#222';
            this.roundRect(x - 2, y - 2, barWidth + 4, barHeight + 4, 5);

            // 血條背景
            this.ctx.fillStyle = '#444';
            this.roundRect(x, y, barWidth, barHeight, 3);

            // HP 條 (漸層)
            const hpPercent = Math.max(0, player.hp / player.maxHp);
            const hpGradient = this.ctx.createLinearGradient(x, y, x, y + barHeight);
            if (player.hp > 30) {
                hpGradient.addColorStop(0, player.color);
                hpGradient.addColorStop(1, this.darkenColor(player.color, 0.6));
            } else {
                hpGradient.addColorStop(0, '#ff4444');
                hpGradient.addColorStop(1, '#aa0000');
            }
            this.ctx.fillStyle = hpGradient;
            this.roundRect(x, y, barWidth * hpPercent, barHeight, 3);

            // 玩家名稱
            this.ctx.fillStyle = player.color;
            this.ctx.font = 'bold 18px monospace';
            this.ctx.textAlign = player.id === 'P1' ? 'left' : 'right';
            this.ctx.fillText(player.id, player.id === 'P1' ? x : x + barWidth, y - 8);

            // HP 數值
            this.ctx.fillStyle = 'white';
            this.ctx.font = '14px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${Math.max(0, player.hp)}`, x + barWidth / 2, y + 17);

            // 繪製 Buff 狀態 (血條下方)
            this.drawBuffs(player, player.id === 'P1' ? x + 20 : x + barWidth - 20, y + barHeight + 25);
        });

        if (state.status === 'WAITING') {
            // 等待文字動畫
            const pulse = 0.7 + Math.sin(Date.now() * 0.005) * 0.3;
            this.ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
            this.ctx.font = 'bold 30px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('WAITING FOR PLAYERS...', this.width / 2, 200);
        }
    }
}

