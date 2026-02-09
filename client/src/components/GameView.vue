<script setup>
import { onMounted, onUnmounted, ref, computed, reactive } from 'vue';
import { Client } from '@colyseus/sdk';
import p5 from 'p5';
import { Ship } from '../entities/Ship.js';
import { Station } from '../entities/Station.js';
import { Projectile } from '../entities/Projectile.js';
import { Asteroid } from '../entities/Asteroid.js';

import DockingMenu from './DockingMenu.vue';

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

const currentZoomIndex = ref(0);
const moveKeys = reactive({ w: false, a: false, s: false, d: false });
const zoomLevels = ref([1.0, 0.1]); // Fallback until p5 sets them
const isDead = ref(false);
const cameraRotationActive = ref(false);
const isDocked = ref(false);
const myPlayer = ref(null);

const targetEntity = computed(() => {
  if (!myPlayer.value || !room || !room.state) return 'NONE';
  const targetId = myPlayer.value.targetId;
  if (!targetId) return 'NONE';

  const entity = room.state.players.get(targetId) ||
    room.state.stations.get(targetId) ||
    room.state.projectiles.get(targetId);

  return entity ? (entity.name || targetId) : 'UNKNOWN';
});

const shipStats = computed(() => {
  if (!myPlayer.value) return { hull: 100, armor: 0 };
  const spec = shipConfigs.value.find(s => s.id === myPlayer.value.shipClass);
  return spec ? spec.stats : { hull: 100, armor: 0 };
});

const hullPct = computed(() => {
  if (!myPlayer.value) return 0;
  return Math.max(0, myPlayer.value.hull / (shipStats.value.hull || 100));
});

const armorPct = computed(() => {
  if (!myPlayer.value) return 0;
  return Math.max(0, myPlayer.value.armor / (shipStats.value.armor || 1));
});

const targetData = computed(() => {
  if (!myPlayer.value || !room || !room.state) return null;
  const targetId = myPlayer.value.targetId;
  if (!targetId) return null;

  const entity = room.state.players.get(targetId) ||
    room.state.stations.get(targetId) ||
    room.state.projectiles.get(targetId);

  if (!entity) return null;

  let maxHull = 100;
  let maxArmor = 1;

  if (room.state.players.has(targetId)) {
    const spec = shipConfigs.value.find(s => s.id === entity.shipClass);
    maxHull = spec?.stats.hull || 100;
    maxArmor = spec?.stats.armor || 1;
  } else if (room.state.stations.has(targetId)) {
    maxHull = entity.maxHull || 40000;
    maxArmor = entity.armor || 100;
  } else if (room.state.projectiles.has(targetId)) {
    maxHull = entity.maxHull || 30;
    maxArmor = 1;
  }

  return {
    id: targetId,
    name: entity.name || targetId,
    hull: entity.hull || 0,
    maxHull: maxHull,
    armor: entity.armor || 0,
    maxArmor: maxArmor,
    hullPct: Math.max(0, (entity.hull || 0) / (maxHull || 1)),
    armorPct: Math.max(0, (entity.armor || 0) / (maxArmor || 1))
  };
});


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
  if (key === 'v') currentZoomIndex.value = (currentZoomIndex.value + 1) % zoomLevels.value.length;

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
      const me = state.players.get(room.sessionId);
      if (me) {
        // Trigger Vue reactivity by creating a new reference
        myPlayer.value = { ...me };
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
      p.text(`NEURAL LINK: ${connectionStatus.value}`, p.width / 2, p.height / 2);
      return;
    }

    const myPlayer = room.state.players.get(room.sessionId);
    if (!myPlayer) return;

    handleInputs();

    const zoom = zoomLevels.value[currentZoomIndex.value];
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

    const shipSpec = shipConfigs.value.find(s => s.id === myPlayer.shipClass);

    // DOCKING PROMPT
    const homeStationId = `base_${myPlayer.faction}`;
    const homeStation = room.state.stations.get(homeStationId);
    if (homeStation) {
      const distToHome = Math.sqrt((homeStation.x - myPlayer.x) ** 2 + (homeStation.y - myPlayer.y) ** 2);
      if (distToHome <= 1500 && !myPlayer.isDocked && !myPlayer.isDocking) {
        p.push();
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(20);
        p.fill(255, 255, 255, 200 + Math.sin(p.frameCount * 0.1) * 55);
        p.text("READY FOR DOCKING [L]", p.width / 2, p.height - 150);
        p.pop();
      }
    }

    if (myPlayer.isDocking) {
      const elapsed = Date.now() - myPlayer.dockingStartTime;
      const progress = Math.min(1, elapsed / 5000);

      p.push();
      p.translate(p.width / 2, p.height - 150);
      p.fill(0, 0, 0, 150);
      p.rect(0, 0, 200, 20);
      p.fill(factionColor);
      p.rect(-100 + (200 * progress) / 2, 0, 200 * progress, 20);
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
      p.text("DOCKED - SYSTEMS RECHARGED", p.width / 2, p.height / 2);
      p.textSize(16);
      p.fill(255);
      p.text("PRESS ANY MOVE KEY TO UNDOCK", p.width / 2, p.height / 2 + 40);
      p.pop();
    }

    // HULL & ARMOR BARS
    const barWidth = 120;
    const barHeight = 8;
    const barX = 30;


    // Weapon Stats in HUD
    // if (shipSpec && shipSpec.weapons) {
    //   let weaponStr = "WEAPONS: ";
    //   shipSpec.weapons.forEach((w, i) => {
    //     const active = myPlayer.weaponSlots[i];
    //     weaponStr += `[${i + 1}:${active ? 'ON' : 'OFF'}] `;
    //   });
    //   p.fill(factionColor);
    //   p.text(weaponStr, 30, 185);
    // }


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
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= radarRadius) {
          p.ellipse(dx * radarScale, dy * radarScale, Math.max(1, asteroid.radius * radarScale * 2));
        }
      });
    }

    // Radar Rings & Crosshair
    p.stroke(`${factionColor}33`);
    p.noFill();
    p.ellipse(0, 0, radarSize * 0.5);
    p.line(-radarSize / 2, 0, radarSize / 2, 0);
    p.line(0, -radarSize / 2, 0, radarSize / 2);

    // Radar Header
    p.noStroke();
    p.fill(factionColor);
    p.textSize(9);
    p.textAlign(p.CENTER, p.BOTTOM);
    p.text("LR-SENSOR [5000m]", 0, -radarSize / 2 - 5);

    // Draw Blips for all players
    room.state.players.forEach((player) => {
      if (player.isDead || player.isDocked) return;
      const dx = player.x - myPlayer.x;
      const dy = player.y - myPlayer.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

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
      const distance = Math.sqrt(dx * dx + dy * dy);

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
      const distance = Math.sqrt(dx * dx + dy * dy);
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
      p.rect(p.width / 2, p.height / 2, p.width, p.height);

      const isWinner = room.state.winner === myPlayer.faction;
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(80);
      p.textStyle(p.BOLD);

      if (isWinner) {
        p.fill('#4ade80');
        p.text("VICTORY", p.width / 2, p.height / 2 - 50);
        p.textSize(20);
        p.fill(255);
        p.text("The opposing station has been neutralized.", p.width / 2, p.height / 2 + 20);
      } else {
        p.fill('#ef4444');
        p.text("DEFEAT", p.width / 2, p.height / 2 - 50);
        p.textSize(20);
        p.fill(255);
        p.text("Our headquarters has fallen.", p.width / 2, p.height / 2 + 20);
      }

      p.textSize(16);
      p.text("MISSION COMPLETE", p.width / 2, p.height / 2 + 80);
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
  <div class="game-client-wrapper">
    <!-- Main Game Canvas Container -->
    <div ref="gameContainer" class="p5-canvas-container"></div>

    <div v-if="myPlayer"
      style="position: absolute; font-size: 2rem; color: white; z-index: 100; top: 10px; left: 20px;">
      <h2>Player Debug</h2>
      <dl>
        <dt>Link:</dt>
        <dd>{{ connectionStatus }}</dd>
        <dt>Position:</dt>
        <dd>{{ Math.round(myPlayer.x || 0) }}, {{ Math.round(myPlayer.y || 0) }}</dd>
        <dt>Vector:</dt>
        <dd>{{ Math.round(myPlayer.vx || 0) }}, {{ Math.round(myPlayer.vy || 0) }}</dd>
        <dt>Zoom [v]</dt>
        <dd>{{ currentZoomIndex === 0 ? 'CLOSEUP' : 'LONG-RANGE' }}</dd>
        <dt>Camera [c]</dt>
        <dd>{{ cameraRotationActive ? 'SHIP ALIGNED' : 'WORLD ALIGNED' }}</dd>
        <dt>Target [t]:</dt>
        <dd>{{ targetData ? targetData.name : 'NONE' }}</dd>
        <template v-if="targetData">
          <dt>T-Hull:</dt>
          <dd class="status-bar-container">
            <div class="status-bar hull-bar" :class="{ low: targetData.hullPct < 0.3 }"
              :style="{ width: (targetData.hullPct * 100) + '%' }"></div>
            <span class="status-val">{{ Math.round(targetData.hull) }} / {{ Math.round(targetData.maxHull) }}</span>
          </dd>
          <dt v-if="targetData.maxArmor > 0">T-Armor:</dt>
          <dd v-if="targetData.maxArmor > 0" class="status-bar-container">
            <div class="status-bar armor-bar" :style="{ width: (targetData.armorPct * 100) + '%' }"></div>
            <span class="status-val">{{ Math.round(targetData.armor) }} / {{ Math.round(targetData.maxArmor) }}</span>
          </dd>
        </template>
        <dt>Hull:</dt>
        <dd class="status-bar-container">
          <div class="status-bar hull-bar" :class="{ low: hullPct < 0.3 }" :style="{ width: (hullPct * 100) + '%' }"></div>
          <span class="status-val">{{ Math.round(myPlayer.hull) }}</span>
        </dd>
        <dt>Armor:</dt>
        <dd class="status-bar-container">
          <div class="status-bar armor-bar" :style="{ width: (armorPct * 100) + '%' }"></div>
          <span class="status-val">{{ Math.round(myPlayer.armor) }}</span>
        </dd>
        <dt>Controls:</dt>
        <dd class="controls-grid">
          <span :class="{ active: moveKeys.w }">THRUST</span>
          <span :class="{ active: moveKeys.a }">L-PBT</span>
          <span :class="{ active: moveKeys.d }">R-PBT</span>
          <span :class="{ active: moveKeys.s }">RETRO</span>
        </dd>
      </dl>
    </div>

    <!-- UI Overlays -->
    <div class="game-ui-overlay">
      <!-- Status Badge -->
      <div v-if="connectionStatus !== 'CONNECTED'" class="status-overlay">
        <div class="status-box">
          <div class="status-spinner"></div>
          {{ connectionStatus }}
        </div>
      </div>

      <!-- Death/Respawn UI -->
      <transition name="fade">
        <div v-if="isDead" class="respawn-overlay">
          <div class="respawn-card">
            <h2>SHIP DESTROYED</h2>
            <p>Your vessel has been lost in action.</p>
            <div class="respawn-stats">
              <!-- Optional: show session stats here -->
            </div>
            <button @click="sendRespawn" class="respawn-btn">CLONE & RESUPPLY</button>
          </div>
        </div>
      </transition>

      <!-- Docking Menu (Abstracted) -->
      <DockingMenu :is-docked="isDocked" :my-player="myPlayer" :ship-configs="shipConfigs" :all-weapons="allWeapons"
        @undock="undock" @change-ship="changeShip" @buy-weapon="buyWeapon" @upgrade-weapon="upgradeWeapon" />
    </div>
  </div>
</template>

<style scoped>
.game-client-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #000;
}

.p5-canvas-container {
  width: 100%;
  height: 100%;
}

.game-ui-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  /* Allow clicks to pass through to canvas by default */
  z-index: 10;
}

.game-ui-overlay>* {
  pointer-events: auto;
  /* Re-enable clicks for UI elements */
}

.status-overlay {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.7);
  padding: 10px 20px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  gap: 10px;
  color: #4facfe;
  font-family: monospace;
}

.status-bar-container {
  width: 150px;
  height: 12px;
  background: rgba(40, 40, 40, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  display: flex;
  align-items: center;
  margin-top: 5px;
}

.status-bar {
  height: 100%;
  transition: width 0.3s ease-out;
}

.hull-bar {
  background: #4ade80;
}

.hull-bar.low {
  background: #ef4444;
}

.armor-bar {
  background: #fbbf24;
}

.status-val {
  position: absolute;
  right: 5px;
  font-size: 0.8rem;
  color: white;
  text-shadow: 1px 1px 2px black;
  font-family: monospace;
}

.controls-grid {
  display: flex;
  gap: 10px;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.3);
  font-family: monospace;
  margin-top: 5px;
}

.controls-grid .active {
  color: #4facfe;
  text-shadow: 0 0 5px rgba(79, 172, 254, 0.5);
  font-weight: bold;
}

.status-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(79, 172, 254, 0.3);
  border-top-color: #4facfe;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.respawn-overlay {
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

.respawn-card {
  text-align: center;
  padding: 40px;
  border: 2px solid #ef4444;
  background: rgba(20, 0, 0, 0.9);
  box-shadow: 0 0 30px rgba(239, 68, 68, 0.3);
  max-width: 500px;
}

.respawn-card h2 {
  color: #ef4444;
  font-size: 3rem;
  font-weight: 800;
  margin-bottom: 20px;
  letter-spacing: 0.2rem;
  text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
}

.respawn-card p {
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>