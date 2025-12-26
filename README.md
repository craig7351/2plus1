# 2+1 對戰遊戲 🎮

一款基於 WebRTC 的即時多人對戰遊戲，支援 PC 和手機連線對戰！

## 功能特色

- 🌐 **P2P 連線** - 使用 PeerJS 實現低延遲的點對點連線
- 📱 **跨平台** - PC 鍵盤 + 手機觸控都能玩
- 🤖 **AI 對手** - 內建 AI 玩家方便測試
- 🎨 **炫酷特效** - 粒子系統、畫面震動、城市夜景背景
- 🔊 **音效系統** - 跳躍、攻擊、命中等音效

## 操作方式

### PC 控制
| 動作 | 按鍵 |
|------|------|
| 移動 | `W A S D` 或 `方向鍵` |
| 攻擊 | `空白鍵` 或 `J` |
| 射擊 | `K` |
| 必殺技 | `後 → 下 → 前 → K` (0.5秒內) |

### 手機控制
使用虛擬搖桿和按鈕

## 快速開始

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev
# 或直接執行
start.bat

# 停止伺服器
stop.bat
```

## 遊戲流程

1. 開啟遊戲後會顯示 Room ID
2. 選擇其一：
   - 點擊「🎮 PC 加入遊戲」用鍵盤操作
   - 點擊「🤖 加入 AI」和 AI 對戰
   - 分享 Room ID 給朋友連線
3. 兩位玩家加入後自動開始
4. 打倒對手！Game Over 後可點擊 Restart 重新開始

## 技術棧

- **前端框架**: React 19 + TypeScript
- **建置工具**: Vite 7
- **P2P 連線**: PeerJS
- **路由**: React Router DOM

## 專案結構

```
src/
├── components/     # React 元件
│   ├── GameScreen.tsx   # 主遊戲畫面
│   └── Lobby.tsx        # 大廳/連線頁面
├── game/           # 遊戲邏輯
│   ├── GameEngine.ts    # 遊戲引擎 (物理、碰撞、AI)
│   ├── GameState.ts     # 狀態定義
│   └── Renderer.ts      # Canvas 渲染器
└── services/       # 服務
    ├── PeerService.ts   # WebRTC 連線
    └── SoundService.ts  # 音效播放
```

## License

MIT
