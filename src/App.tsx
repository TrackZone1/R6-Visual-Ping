import { useEffect, useState, useRef } from 'react'
import { Target, MonitorPlay, Users, Zap } from 'lucide-react'
import { captureService } from './services/CaptureService'
import { peerService } from './services/PeerService'

function App() {
  const [sources, setSources] = useState<any[]>([])
  const [selectedSource, setSelectedSource] = useState<string>('')
  
  const [sessionId, setSessionId] = useState<string>('')
  const [joinId, setJoinId] = useState<string>('')
  
  const [isConnected, setIsConnected] = useState(false)
  const [isHost, setIsHost] = useState(false)
  
  const [players, setPlayers] = useState<string[]>([])
  const [pings, setPings] = useState<Record<string, { image: string, time: number }>>({})
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [])

  const formatAgo = (timestamp: number) => {
    const seconds = Math.floor((now - timestamp) / 1000);
    if (seconds < 5) return 'À l\'instant - REC';
    if (seconds < 60) return `Il y a ${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `Il y a ${minutes} m`;
  };
  
  const [hotkey, setHotkey] = useState<number>(44) // 44 is Z on typical uiohook, 30 is A, 57 is Space. We just give a default.

  // Reference for the animation class
  const activePings = useRef<Set<string>>(new Set())
  const [, forceRender] = useState(0)

  useEffect(() => {
    // Load sources
    if (window.electronAPI) {
      window.electronAPI.getDesktopSources().then((srcs) => {
        setSources(srcs)
        if (srcs.length > 0) setSelectedSource(srcs[0].id)
      })
    }
  }, [])

  useEffect(() => {
    // Register global keydown
    if (window.electronAPI && isConnected) {
      window.electronAPI.onGlobalKeyDown((code) => {
        // If it's our hotkey
        if (code === hotkey) {
          triggerPing()
        }
      })
    }
    return () => {
      if (window.electronAPI) window.electronAPI.offGlobalKeyDown()
    }
  }, [isConnected, hotkey])

  const triggerPing = () => {
    const frame = captureService.captureFrame();
    if (frame) {
      peerService.broadcastPing(frame);
    } else {
      console.warn("Could not capture frame. Is capture running?");
    }
  }

  useEffect(() => {
    peerService.onConnectionUpdate = (playersList) => {
      setPlayers([...playersList]);
    }

    peerService.onImageReceived = (peerId, imageBase64) => {
      setPings(prev => ({ ...prev, [peerId]: { image: imageBase64, time: Date.now() } }));
      
      // Trigger animation
      activePings.current.add(peerId);
      forceRender(v => v + 1);
      setTimeout(() => {
        activePings.current.delete(peerId);
        forceRender(v => v + 1);
      }, 500);
    }
  }, [])

  const handleHost = async () => {
    if (!selectedSource) return;
    
    // Start capture first
    const captureOk = await captureService.startCapture(selectedSource);
    if (!captureOk) return alert("Failed to start capture");

    // Generate random 5-char ID
    const randomId = Math.random().toString(36).substring(2, 7).toUpperCase();
    try {
      const id = await peerService.hostSession(randomId);
      setSessionId(id);
      setIsConnected(true);
      setIsHost(true);
      setPlayers([id]); // Host is alone initially
    } catch (e) {
      alert("Failed to host session.");
    }
  }

  const handleJoin = async () => {
    if (!selectedSource || !joinId) return;
    
    // Start capture first
    const captureOk = await captureService.startCapture(selectedSource);
    if (!captureOk) return alert("Failed to start capture");

    try {
      const id = await peerService.joinSession(joinId.toUpperCase());
      setSessionId(id);
      setIsConnected(true);
      setIsHost(false);
      setPlayers([id]);
    } catch (e) {
      alert("Failed to join session. Does the host exist?");
    }
  }

  const handleDisconnect = () => {
    peerService.disconnect();
    captureService.stopCapture();
    setIsConnected(false);
    setPlayers([]);
    setPings({});
  }

  // Very basic key listener to pick hotkey
  const listenForHotkey = () => {
    alert("Please press your ping key just once, then click OK on the next popup");
    const tempListener = (code: number) => {
      setHotkey(code);
      window.electronAPI.offGlobalKeyDown();
      alert("Hotkey set to code: " + code);
    };
    window.electronAPI.onGlobalKeyDown(tempListener);
  }

  return (
    <div className="app-container">
      <h1><Target size={40} style={{ verticalAlign: 'middle', marginRight: '10px' }}/>R6 Visual Ping</h1>

      {!isConnected ? (
        <div className="glass-panel">
          
          <div className="input-group">
            <label><MonitorPlay size={16} style={{verticalAlign:'text-bottom', marginRight:'5px'}}/> Source de Capture (Ton jeu)</label>
            <select value={selectedSource} onChange={e => setSelectedSource(e.target.value)}>
              {sources.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label><Zap size={16} style={{verticalAlign:'text-bottom', marginRight:'5px'}}/> Touche du Ping</label>
            <button className="secondary-button" onClick={listenForHotkey}>
              Assigner la touche (Actuel: {hotkey})
            </button>
            <small style={{color:'#777'}}>Clique sur le bouton puis presse ta touche de ping R6.</small>
          </div>

          <div className="divider">Créer une session</div>
          <button onClick={handleHost}>Héberger la session</button>

          <div className="divider">Rejoindre</div>
          <div className="action-row">
            <input 
              placeholder="Ex: AB12C" 
              value={joinId} 
              onChange={e => setJoinId(e.target.value)}
              maxLength={5}
            />
            <button className="secondary-button" onClick={handleJoin} disabled={!joinId}>
              <Users size={18}/> Rejoindre
            </button>
          </div>

        </div>
      ) : (
        <>
          <div className="status-badge {isHost ? 'host' : 'connected'}">
            {isHost ? `Session HOST : ${sessionId}` : `Dans la session hébergée`}
          </div>
          
          <button className="secondary-button" onClick={handleDisconnect} style={{marginBottom: '2rem'}}>
            Se Déconnecter
          </button>
          
          <div className="ping-grid">
            {players.map((pId) => {
              const pingData = pings[pId];
              const imgData = pingData?.image;
              const timeText = pingData ? formatAgo(pingData.time) : 'En attente...';
              const isActive = activePings.current.has(pId);
              
              return (
                <div className="ping-card" key={pId}>
                   <div className="ping-image-container">
                      <img 
                        src={imgData || "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="} 
                        className={`ping-image ${isActive ? 'active' : ''}`}
                        alt="ping" 
                      />
                      <div className={`time-badge ${!pingData ? 'waiting' : ''} ${isActive ? 'rec' : ''}`}>
                        {isActive && <span className="rec-dot"></span>}
                        {timeText}
                      </div>
                   </div>
                   <div className="player-name">
                     {pId === sessionId ? 'Moi' : pId.substring(0, 5)}
                   </div>
                </div>
              )
            })}
          </div>
        </>
      )}

    </div>
  )
}

export default App
