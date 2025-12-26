import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';

export type PeerMessageType = 'INPUT' | 'STATUS' | 'RESTART' | 'GAME_OVER';

export interface PeerMessage {
    type: PeerMessageType;
    payload: any;
}

// 產生 4 碼數字 Room ID
function generateRoomId(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

class PeerService {
    private peer: Peer | null = null;
    private connections: DataConnection[] = [];

    // Callbacks
    private onConnectionHandlers: ((conn: DataConnection) => void)[] = [];
    private onDataHandlers: ((data: any, conn: DataConnection) => void)[] = [];

    constructor() { }

    initialize(): Promise<string> {
        return new Promise((resolve, reject) => {
            const roomId = generateRoomId();
            // Use public peerjs server or local if needed. Public is easiest for now.
            this.peer = new Peer(roomId, {
                debug: 2
            });

            this.peer.on('open', (id) => {
                console.log('My Peer ID is: ' + id);
                resolve(id);
            });

            this.peer.on('connection', (conn) => {
                this.handleConnection(conn);
            });

            this.peer.on('error', (err) => {
                console.error('Peer error:', err);
                reject(err);
            });
        });
    }

    connect(peerId: string): Promise<DataConnection> {
        return new Promise((resolve, reject) => {
            if (!this.peer) {
                reject('Peer not initialized');
                return;
            }

            const conn = this.peer.connect(peerId);

            conn.on('open', () => {
                this.handleConnection(conn);
                resolve(conn);
            });

            conn.on('error', (err) => {
                reject(err);
            });
        });
    }

    private handleConnection(conn: DataConnection) {
        this.connections.push(conn);
        console.log(`Connected to: ${conn.peer}`);

        // Trigger handlers
        this.onConnectionHandlers.forEach(handler => handler(conn));

        conn.on('data', (data) => {
            this.onDataHandlers.forEach(handler => handler(data, conn));
        });

        conn.on('close', () => {
            console.log(`Connection closed: ${conn.peer}`);
            this.connections = this.connections.filter(c => c !== conn);
        });
    }

    send(data: PeerMessage) {
        this.connections.forEach(conn => {
            if (conn.open) {
                conn.send(data);
            }
        });
    }

    // 設定連線 callback（覆蓋而非累加）
    onConnection(callback: (conn: DataConnection) => void) {
        this.onConnectionHandlers = [callback];
    }

    // 設定資料 callback（覆蓋而非累加）
    onData(callback: (data: any, conn: DataConnection) => void) {
        this.onDataHandlers = [callback];
    }

    // 清除所有 handlers
    clearHandlers() {
        this.onConnectionHandlers = [];
        this.onDataHandlers = [];
    }

    getPeerId() {
        return this.peer?.id;
    }
}

export const peerService = new PeerService();
