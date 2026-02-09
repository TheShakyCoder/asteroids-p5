<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { Client } from '@colyseus/sdk';
import p5 from 'p5';
import { Ship } from '../entities/Ship.js';
import { Station } from '../entities/Station.js';
import { Projectile } from '../entities/Projectile.js';
import { Asteroid } from '../entities/Asteroid.js';

const props = defineProps({
  roomId: String,
  faction: String,
  ship: String,
  factions: Array,
  token: String
});

const emit = defineEmits(['leave']);

const gameContainer = ref(null);
const connectionStatus = ref('CONNECTING...');
let p5Instance = null;
let room = null;
const shipConfigs = ref([]);
let client = null;
const allWeapons = ref([]);
// Entity instance maps for persistent client-side state
const shipsCache = new Map();
const stationsCache = new Map();
const projectilesCache = new Map();
const asteroidsCache = new Map();
// No global client here to avoid HMR issues

let currentZoomIndex = 0;
let moveKeys = { w: false, a: false, s: false, d: false };
const zoomLevels = ref([1.0, 0.1]); // Fallback until p5 sets them
const isDead = ref(false);
const cameraRotationActive = ref(false);
const isDocked = ref(false);
const activeDockTab = ref('ships');
const myPlayer = ref(null);

const buyWeapon = (slotIndex, weaponId) => room?.send("buy-weapon", { slotIndex, weaponId });
const upgradeWeapon = (slotIndex) => room?.send("upgrade-weapon", { slotIndex });
const changeShip = (shipId) => room?.send("change-ship", { shipId });
const undock = () => room?.send("undock");

const sendRespawn = () => {
  if (room) {
    room.send("respawn");
    isDead.value = false;
  }
};

const onKeyDown = (e) => {
  const key = e.key.toLowerCase();
  if (moveKeys.hasOwnProperty(key)) moveKeys[key] = true;
  if (key === 'v') currentZoomIndex = (currentZoomIndex + 1) % zoomLevels.value.length;
  
  // Weapon Toggling (Keys 1-9)
  if (key >= '1' && key <= '9' && room) {
    const weaponIdx = parseInt(key) - 1;
    room.send("toggle-weapon", weaponIdx);
  }

  if (key === 't' && room) {
    room.send("target-enemy");
  }

  if (key === 'y' && room) {
    room.send("target-object");
  }

  if (key === 'c') {
    cameraRotationActive.value = !cameraRotationActive.value;
  }

  if (key === 'l' && room) {
    room.send("dock");
  }
};

const onKeyUp = (e) => {
  const key = e.key.toLowerCase();
  if (moveKeys.hasOwnProperty(key)) moveKeys[key] = false;
};

const fetchShipConfigs = async () => {
  try {
    const baseUrl = import.meta.env.VITE_SERVER_URL || '';
    const response = await fetch(`${baseUrl}/api/ships`.replace(/^\/\//, '/'));
    shipConfigs.value = await response.json();
  } catch (e) {
    console.error("Error fetching ship configs", e);
  }
};

const fetchWeapons = async () => {
  try {
    const baseUrl = import.meta.env.VITE_SERVER_URL || '';
    const response = await fetch(`${baseUrl}/api/weapons`.replace(/^\/\//, '/'));
    allWeapons.value = await response.json();
  } catch (e) {
    console.error("Error fetching weapons", e);
  }
};



const getFactionColor = (factionId) => {
  const faction = (props.factions || []).find(f => f.id === factionId);
  return faction ? faction.color : '#ffffff';
};

const connect = async () => {
  try {
    const wsUrlEnv = import.meta.env.VITE_WS_URL;
    const serverUrlEnv = import.meta.env.VITE_SERVER_URL;
    
    let protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    let host = window.location.host;

    // Smart host/protocol resolution for DDEV/Tauri
    if (wsUrlEnv) {
      host = wsUrlEnv.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '');
      if (wsUrlEnv.startsWith('wss://')) protocol = 'wss';
      else if (wsUrlEnv.startsWith('ws://')) protocol = 'ws';
    } else if (serverUrlEnv) {
      host = serverUrlEnv.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '');
      if (serverUrlEnv.startsWith('https')) protocol = 'wss';
      else if (serverUrlEnv.startsWith('http')) protocol = 'ws';
    }

    console.log(`Neural Link: connecting to ${protocol}://${host}`);
    client = new Client(`${protocol}://${host}`);

    const targetRoomId = String(props.roomId);
    
    // Give the server a tiny moment to finalize room creation/setup
    // Critical for DDEV/Multi-container setups
    await new Promise(resolve => setTimeout(resolve, 300));
    
    console.log(`Connecting to sector ${targetRoomId}...`);
    
    room = await client.joinById(targetRoomId, {
      faction: props.faction,
      ship: props.ship,
      token: props.token
    });
    
    connectionStatus.value = 'STABLE';
    console.log("Joined successfully:", room.sessionId);
    
    room.onStateChange((state) => {
      // Logic for internal state sync if needed
      const me = state.players.get(room.sessionId);
      if (me) {
        myPlayer.value = me;
        isDead.value = me.isDead;
        isDocked.value = me.isDocked;
      }
    });

  } catch (e) {
    console.error("Neural Link Error:", e);
    connectionStatus.value = 'OFFLINE';
    // Small delay so user can see the error status before being kicked back
    setTimeout(() => {
      emit('leave');
    }, 1500); 
  }
};

const sketch = (p) => {
  p.disableFriendlyErrors = true; // Prevents FES from crashing in instance mode

  p.setup = () => {
    const canvas = p.createCanvas(p.windowWidth, p.windowHeight - 80);
    canvas.parent(gameContainer.value);
    p.rectMode(p.CENTER);
    updateZoomLevels(p);
  };

  const updateZoomLevels = (p) => {
    zoomLevels.value = [
      p.height / 500, 
      p.height / 5000 
    ];
  };

  const handleInputs = () => {
    if (!room) return;
    room.send("input", moveKeys);
  };

    p.draw = () => {
      if (isDocked.value) {
        p.background(5, 5, 20);
        return; 
      }
      p.background(5, 5, 16); 
      
      if (!room || !room.state || !room.state.players) {
      // Draw basic status while connecting
      p.fill(255);
      p.textAlign(p.CENTER, p.CENTER);
      p.text(`NEURAL LINK: ${connectionStatus.value}`, p.width/2, p.height/2);
      return;
    }

    const myPlayer = room.state.players.get(room.sessionId);
    if (!myPlayer) return;

    handleInputs();

    const zoom = zoomLevels.value[currentZoomIndex];
    const factionColor = getFactionColor(myPlayer.faction);

    // --- APPLY CAMERA ---
    p.push();
    p.translate(p.width / 2, p.height / 2);
    
    // NEW: Rotate world so my ship always faces up
    if (cameraRotationActive.value) {
      p.rotate(-myPlayer.angle);
    }
    
    p.scale(zoom);
    
    // Everything from here is in World Coordinates (translated so myPlayer is at screen center)
    // We need to offset by -myPlayer position so myPlayer appears at (0,0) in our local camera space
    p.translate(-myPlayer.x, -myPlayer.y);

    // DRAW GRID
    const gridSpacing = 1000;
    const gridColor = p.color(255, 255, 255, 20);
    p.stroke(gridColor);
    p.strokeWeight(1 / zoom); // Keep lines thin regardless of zoom

    // Calculate visible grid range in world coordinates
    const viewHalfWidth = (p.width / 2) / zoom;
    const viewHalfHeight = (p.height / 2) / zoom;
    
    const startX = Math.floor((myPlayer.x - viewHalfWidth) / gridSpacing) * gridSpacing;
    const endX = Math.ceil((myPlayer.x + viewHalfWidth) / gridSpacing) * gridSpacing;
    const startY = Math.floor((myPlayer.y - viewHalfHeight) / gridSpacing) * gridSpacing;
    const endY = Math.ceil((myPlayer.y + viewHalfHeight) / gridSpacing) * gridSpacing;

    // Vertical lines
    for (let x = startX; x <= endX; x += gridSpacing) {
      p.line(x, myPlayer.y - viewHalfHeight, x, myPlayer.y + viewHalfHeight);
    }

    // Horizontal lines
    for (let y = startY; y <= endY; y += gridSpacing) {
      p.line(myPlayer.x - viewHalfWidth, y, myPlayer.x + viewHalfWidth, y);
    }

    // DRAW ASTEROIDS
    if (room.state.asteroidObjects) {
      room.state.asteroidObjects.forEach((asteroid) => {
        if (asteroid.x + asteroid.radius < myPlayer.x - viewHalfWidth || 
            asteroid.x - asteroid.radius > myPlayer.x + viewHalfWidth ||
            asteroid.y + asteroid.radius < myPlayer.y - viewHalfHeight || 
            asteroid.y - asteroid.radius > myPlayer.y + viewHalfHeight) {
          return;
        }

        let entity = asteroidsCache.get(asteroid.id);
        if (!entity) {
          entity = new Asteroid(asteroid);
          asteroidsCache.set(asteroid.id, entity);
        } else {
          entity.update(asteroid);
        }
        entity.draw(p, zoom);
      });
      if (asteroidsCache.size > room.state.asteroidObjects.size) {
        for (const [id] of asteroidsCache) if (!room.state.asteroidObjects.has(id)) asteroidsCache.delete(id);
      }
    }

    // DRAW STATIONS
    room.state.stations.forEach((station) => {
      let entity = stationsCache.get(station.id);
      if (!entity) {
        entity = new Station(station);
        stationsCache.set(station.id, entity);
      } else {
        entity.update(station);
      }
      
      const sColor = getFactionColor(station.faction);
      entity.draw(p, zoom, sColor, myPlayer.targetId === station.id, room.state);
    });

    // DRAW ALL PLAYERS
    room.state.players.forEach((player) => {
      let entity = shipsCache.get(player.id);
      if (!entity) {
        entity = new Ship(player);
        shipsCache.set(player.id, entity);
      } else {
        entity.update(player);
      }
      
      const pColor = getFactionColor(player.faction);
      entity.draw(p, zoom, pColor, shipConfigs.value, allWeapons.value, room.state);

      if (myPlayer.targetId === player.id) {
        p.push();
        p.translate(player.x, player.y);
        p.stroke('#ff3b30');
        p.strokeWeight(2 / zoom);
        p.noFill();
        p.rect(0, 0, 80 / zoom, 80 / zoom);
        p.pop();
      }
    });

    // DRAW PROJECTILES
    room.state.projectiles.forEach((proj) => {
      let entity = projectilesCache.get(proj.id);
      if (!entity) {
        entity = new Projectile(proj);
        projectilesCache.set(proj.id, entity);
      } else {
        entity.update(proj);
      }
      
      const pColor = getFactionColor(proj.faction);
      entity.draw(p, zoom, pColor);
      
      if (myPlayer.targetId === proj.id) {
        p.push();
        p.translate(proj.x, proj.y);
        p.stroke('#ff3b30');
        p.strokeWeight(2 / zoom);
        p.noFill();
        p.ellipse(0, 0, 30 / zoom);
        p.pop();
      }
    });

    // Cleanup Cache
    if (shipsCache.size > room.state.players.size) {
      for (const [id] of shipsCache) if (!room.state.players.has(id)) shipsCache.delete(id);
    }
    if (projectilesCache.size > room.state.projectiles.size) {
      for (const [id] of projectilesCache) if (!room.state.projectiles.has(id)) projectilesCache.delete(id);
    }

    // --- UI HUD (Immersive Overlay) ---
    p.pop(); // Exit World/Camera space
    
    // Gradient dark overlay for HUD readability
    p.noStroke();
    p.fill(0, 0, 0, 100);
    p.rect(100, 105, 180, 190, 10);
    
    p.fill(factionColor);
    p.textAlign(p.LEFT, p.TOP);
    p.textFont('Outfit');

    const shipSpec = shipConfigs.value.find(s => s.id === myPlayer.shipClass);
    
    // Header
    p.textSize(12);
    p.text(`LINK: ${connectionStatus.value}`, 25, 25);
    p.text(`CAMERA: ${cameraRotationActive.value ? 'SHIP ALIGNED' : 'WORLD ALIGNED'} [C]`, 25, 45);
    p.stroke(factionColor);
    p.strokeWeight(1);
    p.line(25, 42, 180, 42);
    p.noStroke();

    // Data
    p.textSize(11);
    p.fill(255, 255, 255, 200);
    p.text(`COORD: ${Math.round(myPlayer.x)}, ${Math.round(myPlayer.y)}`, 30, 55);
    p.text(`VELOCITY: ${(Math.sqrt(myPlayer.vx**2 + myPlayer.vy**2)*10).toFixed(1)} km/s`, 30, 75);
    p.text(`ZOOM: ${['CLOSEUP', 'MEDIUM', 'LONG-RANGE'][currentZoomIndex]}`, 30, 95);
    const targetEntity = room.state.players.get(myPlayer.targetId) || 
                         room.state.stations.get(myPlayer.targetId) || 
                         room.state.projectiles.get(myPlayer.targetId);
    const targetDisplay = targetEntity ? (targetEntity.name || targetEntity.id) : 'NONE';
    p.text(`TARGET: ${targetDisplay}`, 30, 115);

    // DOCKING PROMPT
    const homeStationId = `base_${myPlayer.faction}`;
    const homeStation = room.state.stations.get(homeStationId);
    if (homeStation) {
      const distToHome = Math.sqrt((homeStation.x - myPlayer.x)**2 + (homeStation.y - myPlayer.y)**2);
      if (distToHome <= 1500 && !myPlayer.isDocked && !myPlayer.isDocking) {
        p.push();
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(20);
        p.fill(255, 255, 255, 200 + Math.sin(p.frameCount * 0.1) * 55);
        p.text("READY FOR DOCKING [L]", p.width/2, p.height - 150);
        p.pop();
      }
    }

    if (myPlayer.isDocking) {
      const elapsed = Date.now() - myPlayer.dockingStartTime;
      const progress = Math.min(1, elapsed / 5000);
      
      p.push();
      p.translate(p.width/2, p.height - 150);
      p.fill(0, 0, 0, 150);
      p.rect(0, 0, 200, 20);
      p.fill(factionColor);
      p.rect(-100 + (200 * progress)/2, 0, 200 * progress, 20);
      p.fill(255);
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(14);
      p.text("DOCKING IN PROGRESS...", 0, -20);
      p.pop();
    }

    if (myPlayer.isDocked) {
      p.push();
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(30);
      p.fill(factionColor);
      p.text("DOCKED - SYSTEMS RECHARGED", p.width/2, p.height/2);
      p.textSize(16);
      p.fill(255);
      p.text("PRESS ANY MOVE KEY TO UNDOCK", p.width/2, p.height/2 + 40);
      p.pop();
    }

    // HULL & ARMOR BARS
    const barWidth = 120;
    const barHeight = 8;
    const barX = 30;
    
    // Hull
    p.fill(40);
    p.rect(barX + barWidth/2, 140, barWidth, barHeight);
    const shipStats = shipSpec ? shipSpec.stats : { hull: 100, armor: 0 };
    const hullPct = Math.max(0, myPlayer.hull / (shipStats.hull || 100));
    p.fill(hullPct > 0.3 ? '#4ade80' : '#ef4444');
    p.rect(barX + (barWidth * hullPct) / 2, 140, barWidth * hullPct, barHeight);
    p.fill(255);
    p.textSize(9);
    p.text(`HULL: ${Math.round(myPlayer.hull)}`, barX, 131);

    // Armor
    p.fill(40);
    p.rect(barX + barWidth/2, 165, barWidth, barHeight);
    const armorPct = Math.max(0, myPlayer.armor / (shipStats.armor || 1));
    p.fill('#fbbf24');
    p.rect(barX + (barWidth * armorPct) / 2, 165, barWidth * armorPct, barHeight);
    p.fill(255);
    p.text(`ARMOR: ${Math.round(myPlayer.armor)}`, barX, 156);
    
    // Weapon Stats in HUD
    if (shipSpec && shipSpec.weapons) {
       let weaponStr = "WEAPONS: ";
       shipSpec.weapons.forEach((w, i) => {
         const active = myPlayer.weaponSlots[i];
         weaponStr += `[${i+1}:${active ? 'ON' : 'OFF'}] `;
       });
       p.fill(factionColor);
       p.text(weaponStr, 30, 185);
    }
    
    // Key Status Symbols
    p.textSize(10);
    const keySymbol = (k, l) => moveKeys[k] ? p.fill(factionColor) : p.fill(255, 255, 255, 50);
    
    keySymbol('w'); p.text('THRUST', 30, 160);
    keySymbol('a'); p.text('L-PBT', 80, 160);
    keySymbol('d'); p.text('R-PBT', 120, 160);
    keySymbol('s'); p.text('RETRO', 160, 160);

    // --- RADAR SYSTEM ---
    const radarSize = 180;
    const radarPadding = 20;
    const radarX = p.width - radarSize - radarPadding;
    const radarY = p.height - radarSize - radarPadding;
    const radarRadius = 5000;
    const radarScale = (radarSize / 2) / radarRadius;

    p.push();
    p.translate(radarX + radarSize / 2, radarY + radarSize / 2);

    // Radar Background
    p.fill(0, 0, 0, 150);
    p.stroke(factionColor);
    p.strokeWeight(1);
    p.ellipse(0, 0, radarSize);

    // Draw Asteroid Blips (Background)
    if (room.state.asteroidObjects) {
      p.noStroke();
      p.fill(255, 255, 255, 30);
      room.state.asteroidObjects.forEach((asteroid) => {
        const dx = asteroid.x - myPlayer.x;
        const dy = asteroid.y - myPlayer.y;
        const distance = Math.sqrt(dx*dx + dy*dy);
        if (distance <= radarRadius) {
          p.ellipse(dx * radarScale, dy * radarScale, Math.max(1, asteroid.radius * radarScale * 2));
        }
      });
    }

    // Radar Rings & Crosshair
    p.stroke(`${factionColor}33`);
    p.noFill();
    p.ellipse(0, 0, radarSize * 0.5);
    p.line(-radarSize/2, 0, radarSize/2, 0);
    p.line(0, -radarSize/2, 0, radarSize/2);

    // Radar Header
    p.noStroke();
    p.fill(factionColor);
    p.textSize(9);
    p.textAlign(p.CENTER, p.BOTTOM);
    p.text("LR-SENSOR [5000m]", 0, -radarSize/2 - 5);

    // Draw Blips for all players
    room.state.players.forEach((player) => {
      if (player.isDead || player.isDocked) return;
      const dx = player.x - myPlayer.x;
      const dy = player.y - myPlayer.y;
      const distance = Math.sqrt(dx*dx + dy*dy);

      if (distance <= radarRadius) {
        const blipX = dx * radarScale;
        const blipY = dy * radarScale;
        const isSelf = player.id === myPlayer.id;
        const pColor = getFactionColor(player.faction);

        p.push();
        if (isSelf) {
          // Self indicator - Clearly visible triangle pointing in facing direction
          p.rotate(myPlayer.angle || 0);
          p.fill(255);
          p.noStroke();
          // Draw a sharp triangle pointing UP (negative Y)
          p.triangle(0, -10, -7, 6, 7, 6);
          
          // Add a small notch for better detail
          p.fill(0);
          p.triangle(0, 2, -3, 6, 3, 6);
        } else {
          // Other blips
          p.fill(pColor);
          p.noStroke();
          p.ellipse(blipX, blipY, 5);

          // Add a faint glow for targets
          if (myPlayer.targetId === player.id) {
            p.noFill();
            p.stroke(pColor);
            p.strokeWeight(1);
            p.ellipse(blipX, blipY, 10);
            
            // Draw small line to the target blip
            p.stroke(`${pColor}66`);
            p.line(0, 0, blipX, blipY);
          }
        }
        p.pop();
      }
    });

    // Draw Blips for targetable projectiles (Drones/Missiles)
    room.state.projectiles.forEach((proj) => {
      if (proj.type !== 'drone' && proj.type !== 'missile') return;
      
      const dx = proj.x - myPlayer.x;
      const dy = proj.y - myPlayer.y;
      const distance = Math.sqrt(dx*dx + dy*dy);

      if (distance <= radarRadius) {
        const blipX = dx * radarScale;
        const blipY = dy * radarScale;
        const pColor = getFactionColor(proj.faction);

        p.push();
        p.fill(pColor);
        p.noStroke();
        p.ellipse(blipX, blipY, 3); // Smaller than players

        if (myPlayer.targetId === proj.id) {
          p.noFill();
          p.stroke(pColor);
          p.strokeWeight(1);
          p.ellipse(blipX, blipY, 8);
          p.stroke(`${pColor}66`);
          p.line(0, 0, blipX, blipY);
        }
        p.pop();
      }
    });

    // Draw Blips for Stations (with directional markers for bases)
    room.state.stations.forEach((station) => {
      const dx = station.x - myPlayer.x;
      const dy = station.y - myPlayer.y;
      const distance = Math.sqrt(dx*dx + dy*dy);
      const angle = Math.atan2(dy, dx);
      const isBase = station.id.startsWith('base_');
      const isHome = station.faction === myPlayer.faction;
      const sColor = getFactionColor(station.faction);

      if (distance <= radarRadius) {
        const blipX = dx * radarScale;
        const blipY = dy * radarScale;

        p.push();
        p.fill(sColor);
        p.noStroke();
        p.rectMode(p.CENTER);
        p.rect(blipX, blipY, 8, 4); // Rectangular blip for station

        // Label for bases
        if (isBase) {
          p.fill(255);
          p.textSize(8);
          p.textAlign(p.CENTER, p.BOTTOM);
          p.text(isHome ? 'HOME' : 'BASE', blipX, blipY - 6);
        }

        if (myPlayer.targetId === station.id) {
          p.noFill();
          p.stroke(sColor);
          p.strokeWeight(1);
          p.rect(blipX, blipY, 14, 10);
          p.stroke(`${sColor}66`);
          p.line(0, 0, blipX, blipY);
        }
        p.pop();
      } else if (isBase) {
        // Show directional arrow at the edge for bases
        const edgeX = Math.cos(angle) * (radarSize / 2);
        const edgeY = Math.sin(angle) * (radarSize / 2);

        p.push();
        p.translate(edgeX, edgeY);
        p.rotate(angle + Math.PI / 2);
        
        p.fill(sColor);
        p.noStroke();
        // Triangle pointing outwards
        p.triangle(-5, 0, 5, 0, 0, -8);
        
        // Marker Label
        p.rotate(-(angle + Math.PI / 2));
        p.fill(255);
        p.textSize(10);
        p.textAlign(p.CENTER, p.CENTER);
        p.text(isHome ? 'H' : 'E', 0, 12);
        p.pop();
      }
    });

    p.pop(); // End Radar
    
    // --- HUD LAYOUTS ---
    if (room.state.winner) {
      p.push();
      // Full screen dim
      p.fill(0, 0, 0, 180);
      p.noStroke();
      p.rectMode(p.CENTER);
      p.rect(p.width/2, p.height/2, p.width, p.height);

      const isWinner = room.state.winner === myPlayer.faction;
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(80);
      p.textStyle(p.BOLD);
      
      if (isWinner) {
        p.fill('#4ade80');
        p.text("VICTORY", p.width/2, p.height/2 - 50);
        p.textSize(20);
        p.fill(255);
        p.text("The opposing station has been neutralized.", p.width/2, p.height/2 + 20);
      } else {
        p.fill('#ef4444');
        p.text("DEFEAT", p.width/2, p.height/2 - 50);
        p.textSize(20);
        p.fill(255);
        p.text("Our headquarters has fallen.", p.width/2, p.height/2 + 20);
      }
      
      p.textSize(16);
      p.text("MISSION COMPLETE", p.width/2, p.height/2 + 80);
      p.pop();
    }
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight - 80);
    updateZoomLevels(p);
  };
};

onMounted(async () => {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  
  await Promise.all([
    fetchShipConfigs(),
    fetchWeapons()
  ]);
  
  await connect();
  
  if (gameContainer.value) {
    p5Instance = new p5(sketch, gameContainer.value);
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
  if (p5Instance) p5Instance.remove();
  if (room) room.leave();
});
</script>

<template>
  <div ref="gameContainer" class="canvas-wrapper"></div>

  <!-- Respawn Modal -->
  <transition name="fade">
    <div v-if="isDead" class="death-overlay">
      <div class="death-modal">
        <h1 class="death-title">SHIP DESTROYED</h1>
        <p class="death-text">Your neural link has been severed. Recalling consciousness to nearest faction hub...</p>
        <button @click="sendRespawn" class="respawn-btn">INITIALIZE CLONE SEQUENCING</button>
      </div>
    </div>
  </transition>

  <!-- Docking Menu -->
  <transition name="fade">
    <div v-if="isDocked" class="dock-overlay">
      <div class="dock-panel">
        <header class="dock-header">
          <div class="station-info">
            <h2>STATION COMMAND HUB</h2>
            <div class="tylium-display">
              <span class="label">TYLIUM RESERVES:</span>
              <span class="value">{{ myPlayer?.tylium?.toLocaleString() }} ⚛</span>
            </div>
          </div>
          <button @click="undock" class="btn-departure">INITIATE DEPARTURE</button>
        </header>

        <nav class="dock-tabs">
          <button 
            :class="{ active: activeDockTab === 'ships' }" 
            @click="activeDockTab = 'ships'"
          >SHIP SELECTION</button>
          <button 
            :class="{ active: activeDockTab === 'shop' }" 
            @click="activeDockTab = 'shop'"
          >WEAPON SHOP</button>
          <button 
            :class="{ active: activeDockTab === 'armory' }" 
            @click="activeDockTab = 'armory'"
          >ARMORY (UPGRADES)</button>
        </nav>

        <div class="dock-content">
          <!-- Ship Selection Tab -->
          <div v-if="activeDockTab === 'ships'" class="tab-panel ships-tab">
            <div class="ship-grid">
              <div 
                v-for="s in shipConfigs" 
                :key="s.id" 
                class="ship-card"
                :class="{ current: myPlayer?.shipClass === s.id }"
              >
                <h3>{{ s.name }}</h3>
                <p class="ship-desc">{{ s.description }}</p>
                <div class="ship-stats">
                  <div class="stat"><span>HULL</span> {{ s.stats.hull }}</div>
                  <div class="stat"><span>ARMOR</span> {{ s.stats.armor }}</div>
                  <div class="stat"><span>SPEED</span> {{ s.stats.maxVelocity }}</div>
                </div>
                <button 
                  @click="changeShip(s.id)" 
                  class="btn-select-ship"
                  :disabled="myPlayer?.shipClass === s.id"
                >
                  {{ myPlayer?.shipClass === s.id ? 'CURRENTLY ASSIGNED' : 'REQUISITION SHIP' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Weapon Shop Tab -->
          <div v-if="activeDockTab === 'shop'" class="tab-panel shop-tab">
            <div class="weapon-grid">
              <div v-for="w in allWeapons.filter(weapon => weapon.tylium)" :key="w.id" class="weapon-card">
                <div class="weapon-header">
                  <h4>{{ w.name }}</h4>
                  <template v-if="myPlayer?.ownedWeapons?.[w.id]">
                    <span class="owned-tag">OWNED [LVL {{ myPlayer.ownedWeapons[w.id] }}]</span>
                  </template>
                  <span v-else class="type">{{ w.type }}</span>
                </div>
                <div class="weapon-stats">
                  <div class="stat">RANGE: {{ w.maxRange }}</div>
                  <div class="stat" v-if="w.reload">RELOAD: {{ w.reload }}s</div>
                  <div class="price">
                    {{ myPlayer?.ownedWeapons?.[w.id] ? 'RE-EQUIP FREE' : `COST: ${w.tylium?.toLocaleString()} ⚛` }}
                  </div>
                </div>
                <div class="slot-selectors">
                  <p>Assign to Slot:</p>
                  <div class="slot-buttons">
                    <button 
                      v-for="(_, idx) in myPlayer?.equippedWeapons" 
                      @click="buyWeapon(idx, w.id)"
                      :disabled="!myPlayer?.ownedWeapons?.[w.id] && (myPlayer?.tylium || 0) < w.tylium"
                    >SLOT {{ idx + 1 }}</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Armory Tab -->
          <div v-if="activeDockTab === 'armory'" class="tab-panel armory-tab">
            <div class="equipped-list">
              <div v-for="(wId, idx) in myPlayer?.equippedWeapons" :key="idx" class="equipped-weapon">
                <div class="info">
                  <span class="slot">SLOT {{ idx + 1 }}</span>
                  <h4>{{ allWeapons.find(w => w.id === wId)?.name || 'NONE' }}</h4>
                  <span class="level">LEVEL {{ myPlayer?.weaponLevels[idx] }}</span>
                </div>
                <div class="action" v-if="wId">
                  <p class="cost">UPGRADE: {{ Math.floor((allWeapons.find(w => w.id === wId)?.tylium || 10000) * 0.5 * (myPlayer?.weaponLevels[idx] || 1)) }} ⚛</p>
                  <button 
                    @click="upgradeWeapon(idx)"
                    :disabled="myPlayer?.weaponLevels[idx] >= 10 || (myPlayer?.tylium || 0) < Math.floor((allWeapons.find(w => w.id === wId)?.tylium || 10000) * 0.5 * (myPlayer?.weaponLevels[idx] || 1))"
                  >
                    {{ myPlayer?.weaponLevels[idx] >= 10 ? 'MAX LEVEL' : 'UPGRADE' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.canvas-wrapper {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #000;
}

.death-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(5px);
}

.death-modal {
  text-align: center;
  padding: 40px;
  border: 2px solid #ef4444;
  background: rgba(20, 0, 0, 0.9);
  box-shadow: 0 0 30px rgba(239, 68, 68, 0.3);
  max-width: 500px;
}

.death-title {
  color: #ef4444;
  font-size: 3rem;
  font-weight: 800;
  margin-bottom: 20px;
  letter-spacing: 0.2rem;
  text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
}

.death-text {
  color: #ccc;
  font-size: 1.1rem;
  margin-bottom: 30px;
  line-height: 1.6;
}

.respawn-btn {
  background: transparent;
  color: #ef4444;
  border: 1px solid #ef4444;
  padding: 12px 30px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 0.1rem;
}

.respawn-btn:hover {
  background: #ef4444;
  color: #fff;
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.6);
}

/* Docking Styles */
.dock-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at center, rgba(10, 10, 30, 0.95) 0%, #050510 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  backdrop-filter: blur(15px);
  padding: 40px;
}

.dock-panel {
  width: 100%;
  max-width: 1000px;
  height: 100%;
  max-height: 800px;
  background: rgba(15, 15, 35, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 0 50px rgba(0, 0, 0, 0.5);
}

.dock-header {
  padding: 30px;
  background: rgba(255, 255, 255, 0.03);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.station-info h2 {
  margin: 0;
  font-size: 1.5rem;
  letter-spacing: 0.2rem;
  color: #4facfe;
}

.tylium-display {
  margin-top: 5px;
  font-family: monospace;
}

.tylium-display .value {
  color: #fbbf24;
  font-weight: bold;
  font-size: 1.2rem;
  margin-left: 10px;
}

.btn-departure {
  background: transparent;
  border: 1px solid #ef4444;
  color: #ef4444;
  padding: 10px 25px;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-departure:hover {
  background: #ef4444;
  color: white;
}

.dock-tabs {
  display: flex;
  background: rgba(0, 0, 0, 0.2);
}

.dock-tabs button {
  flex: 1;
  padding: 20px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  font-weight: bold;
  letter-spacing: 0.1rem;
  transition: all 0.3s;
}

.dock-tabs button.active {
  color: #4facfe;
  border-bottom-color: #4facfe;
  background: rgba(79, 172, 254, 0.05);
}

.dock-content {
  flex: 1;
  overflow-y: auto;
  padding: 30px;
}

/* Ship Tab Styles */
.ship-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.ship-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 25px;
  border-radius: 8px;
  transition: all 0.3s;
}

.ship-card.current {
  border-color: #4facfe;
  background: rgba(79, 172, 254, 0.05);
}

.ship-stats {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  margin: 20px 0;
  gap: 10px;
}

.stat span {
  display: block;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.4);
}

.btn-select-ship {
  width: 100%;
  padding: 12px;
  border: 1px solid #4facfe;
  background: transparent;
  color: #4facfe;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-select-ship:hover:not(:disabled) {
  background: #4facfe;
  color: white;
}

/* Weapon Shop Style */
.weapon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.weapon-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 8px;
}

.weapon-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
}

.weapon-header h4 { margin: 0; color: #fff; }
.weapon-header .type { font-size: 0.8rem; color: #4facfe; }
.weapon-header .owned-tag { font-size: 0.7rem; color: #4ade80; border: 1px solid #4ade80; padding: 2px 5px; border-radius: 3px; font-weight: bold; }

.price { color: #fbbf24; font-weight: bold; margin-top: 10px; }

.slot-selectors {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.slot-buttons {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.slot-buttons button {
  flex: 1;
  padding: 8px;
  font-size: 0.8rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
}

.slot-buttons button:hover:not(:disabled) {
  border-color: #4facfe;
}

/* Armory Styles */
.equipped-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.equipped-weapon {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.03);
  padding: 20px;
  border-radius: 8px;
}

.equipped-weapon .info .slot { color: #4facfe; font-size: 0.8rem; }
.equipped-weapon h4 { margin: 5px 0; }
.equipped-weapon .level { color: #fbbf24; font-weight: bold; }

.equipped-weapon .action { text-align: right; }
.equipped-weapon .cost { font-size: 0.9rem; margin-bottom: 5px; color: #fbbf24; }

.equipped-weapon button {
  padding: 8px 20px;
  background: #4facfe;
  border: none;
  color: white;
  border-radius: 4px;
  cursor: pointer;
}

.equipped-weapon button:disabled {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.3);
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>