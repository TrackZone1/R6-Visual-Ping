import Peer, { type DataConnection } from 'peerjs';

export class PeerService {
  private peer: Peer | null = null;
  public isHost = false;
  
  public connections: Map<string, DataConnection> = new Map();
  public playersList: string[] = [];

  public onConnectionUpdate?: (players: string[]) => void;
  public onImageReceived?: (peerId: string, imageBase64: string) => void;

  hostSession(hostId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.isHost = true;
      this.peer = new Peer(hostId, {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });
      
      this.peer.on('open', (id) => resolve(id));
      this.peer.on('error', (err) => reject(err));
      
      this.peer.on('connection', (conn) => {
        this.addConnection(conn);
      });
    });
  }

  joinSession(hostId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.isHost = false;
      this.peer = new Peer({
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });
      
      this.peer.on('open', (myId) => {
        const conn = this.peer!.connect(hostId);
        
        conn.on('open', () => {
          this.addConnection(conn);
          resolve(myId);
        });
        
        conn.on('error', (err) => reject(err));
      });
    });
  }
  
  private addConnection(conn: DataConnection) {
    this.connections.set(conn.peer, conn);
    this.updatePlayerList();

    conn.on('data', (data: any) => {
      if (data.type === 'players_update' && !this.isHost) {
        // Host broadcasts the list to peers so everyone knows everyone
        this.playersList = data.players;
        if (this.onConnectionUpdate) this.onConnectionUpdate(this.playersList);
      }
      if (data.type === 'image') {
        if (this.onImageReceived) this.onImageReceived(data.sender, data.image);
        // If I am host, I relay it to other peers
        if (this.isHost) {
          this.broadcastToOthers(data, conn.peer);
        }
      }
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      this.updatePlayerList();
    });
  }

  private updatePlayerList() {
    this.playersList = Array.from(this.connections.keys());
    if (this.peer?.id) this.playersList.push(this.peer.id);
    
    if (this.onConnectionUpdate) this.onConnectionUpdate(this.playersList);

    // If I'm the host, broadcast the updated list
    if (this.isHost) {
      this.broadcastToOthers({ type: 'players_update', players: this.playersList });
    }
  }

  // Called by UI when hotkey is pressed
  broadcastPing(imageBase64: string) {
    const data = { type: 'image', sender: this.peer?.id, image: imageBase64 };
    this.broadcastToOthers(data);
    
    // Dispatch locally as well so I see my own ping
    if (this.onImageReceived && this.peer?.id) {
       this.onImageReceived(this.peer.id, imageBase64);
    }
  }

  private broadcastToOthers(data: any, ignorePeerId?: string) {
    this.connections.forEach(conn => {
      if (conn.peer !== ignorePeerId) {
         conn.send(data);
      }
    });
  }

  disconnect() {
    this.connections.forEach(c => c.close());
    this.connections.clear();
    if (this.peer) this.peer.destroy();
    this.peer = null;
  }
}

export const peerService = new PeerService();
