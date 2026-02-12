<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, reactive, watch, inject } from 'vue';

import p5 from 'p5';
import { Ship } from '../entities/Ship.js';
import { Station } from '../entities/Station.js';
import { Projectile } from '../entities/Projectile.js';
import { Asteroid } from '../entities/Asteroid.js';

import DockingMenu from './DockingMenu.vue';
import DebugHud from './DebugHud.vue';
import { connect } from '../scripts/server.ts';

const props = defineProps({
  roomId: String,
  faction: String,
  ship: String,
  token: String,
  isLeaving: Boolean
});

const factions = inject('factions', ref([]));

const emit = defineEmits(['leave']);

const gameContainer = ref(null);
const connectionStatus = ref('CONNECTING...');
let p5Instance = null;
let room = null;
const shipConfigs = ref([]);
const allWeapons = ref([]);
// Entity instance maps for persistent client-side state
const shipsCache = new Map();
const stationsCache = new Map();
const projectilesCache = new Map();
const asteroidsCache = new Map();
const moveKeys = reactive({ w: false, a: false, s: false, d: false });
// No global client here to avoid HMR issues

const zoomLevels = [0.4]; // Default zoom 0.5x
const isDead = ref(false);
const cameraRotationActive = ref(false);
const isDocked = ref(false);
const myPlayer = ref(null);
const gameOverTimeLeft = ref(0);
const gameStatus = ref("active");
const winner = ref("");
const gameVersion = ref("0.0.0");
const leavingCountdown = ref(0);
let leavingInterval: any = null;

const myShip = computed(() => {
  if (!myPlayer.value?.shipId || !room || !room.state) return null;
  return room.state.ships.get(myPlayer.value?.shipId);
});

const targetEntity = computed(() => {
  if (!myShip.value || !room || !room.state) return 'NONE';
  const targetId = myShip.value.targetId;
  if (!targetId) return 'NONE';

  const entity = room.state.ships.get(targetId) ||
    room.state.stations.get(targetId) ||
    room.state.projectiles.get(targetId);

  return entity ? (entity.name || targetId) : 'UNKNOWN';
});

const shipStats = computed(() => {
  if (!myShip.value) return { hull: 100, armor: 0 };
  const spec = shipConfigs.value.find(s => s.id === myShip.value.shipClass);
  return spec ? spec.stats : { hull: 100, armor: 0 };
});

const hullPct = computed(() => {
  if (!myShip.value) return 0;
  return Math.max(0, myShip.value.hull / (shipStats.value.hull || 100));
});

const armorPct = computed(() => {
  if (!myShip.value) return 0;
  return Math.max(0, myShip.value.armor / (shipStats.value.armor || 1));
});

const targetData = computed(() => {
  if (!myShip.value || !room || !room.state) return null;
  const targetId = myShip.value.targetId;
  if (!targetId) return null;

  const entity = room.state.ships.get(targetId) ||
    room.state.stations.get(targetId) ||
    room.state.projectiles.get(targetId);

  if (!entity) return null;

  let maxHull = 100;
  let maxArmor = 1;

  if (room.state.ships.has(targetId)) {
    const spec = shipConfigs.value.find(s => s.id === (entity as any).shipClass);
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
    armorPct: Math.max(0, (entity.armor || 0) / (maxArmor || 1)),
    connected: true
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

const fetchVersion = async () => {
  try {
    const baseUrl = import.meta.env.VITE_SERVER_URL || '';
    const response = await fetch(`${baseUrl}/api/version`);
    gameVersion.value = await response.text();
  } catch (e) {
    console.error("Error fetching version", e);
  }
};



const getFactionColor = (factionId) => {
  const faction = (factions.value || []).find(f => f.id === factionId);
  return faction ? faction.color : '#ffffff';
};

const sketch = (p) => {
  p.disableFriendlyErrors = true; // Prevents FES from crashing in instance mode

  p.setup = () => {
    const canvas = p.createCanvas(p.windowWidth, p.windowHeight - 80);
    canvas.parent(gameContainer.value);
    p.rectMode(p.CENTER);
  };


  const handleInputs = () => {
    if (!room || props.isLeaving) return;
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

    const me = room.state.players.get(room.sessionId);
    if (!me) return;

    const meShip = room.state.ships.get(me.shipId);
    if (!meShip) return;

    handleInputs();

    const factionColor = getFactionColor(meShip.faction);

    // --- APPLY CAMERA ---
    p.push();
    p.translate(p.width / 2, p.height / 2);

    // NEW: Rotate world so my ship always faces up
    if (cameraRotationActive.value) {
      p.rotate(-meShip.angle);
    }

    const zoom = zoomLevels[0];
    p.scale(zoom);

    // Everything from here is in World Coordinates (translated so meShip is at screen center)
    // We need to offset by -meShip position so meShip appears at (0,0) in our local camera space
    p.translate(-meShip.x, -meShip.y);

    // DRAW GRID
    const gridSpacing = 1000;
    const gridColor = p.color(255, 255, 255, 20);
    p.stroke(gridColor);
    p.strokeWeight(1); // Actual size 1px

    // Calculate visible grid range in world coordinates
    const viewHalfWidth = (p.width / 2) / zoom;
    const viewHalfHeight = (p.height / 2) / zoom;

    const startX = Math.floor((meShip.x - viewHalfWidth) / gridSpacing) * gridSpacing;
    const endX = Math.ceil((meShip.x + viewHalfWidth) / gridSpacing) * gridSpacing;
    const startY = Math.floor((meShip.y - viewHalfHeight) / gridSpacing) * gridSpacing;
    const endY = Math.ceil((meShip.y + viewHalfHeight) / gridSpacing) * gridSpacing;

    // Vertical lines
    for (let x = startX; x <= endX; x += gridSpacing) {
      p.line(x, meShip.y - viewHalfHeight, x, meShip.y + viewHalfHeight);
    }

    // Horizontal lines
    for (let y = startY; y <= endY; y += gridSpacing) {
      p.line(meShip.x - viewHalfWidth, y, meShip.x + viewHalfWidth, y);
    }

    // DRAW ASTEROIDS
    if (room.state.asteroidObjects) {
      room.state.asteroidObjects.forEach((asteroid) => {
        if (asteroid.x + asteroid.radius < meShip.x - viewHalfWidth ||
          asteroid.x - asteroid.radius > meShip.x + viewHalfWidth ||
          asteroid.y + asteroid.radius < meShip.y - viewHalfHeight ||
          asteroid.y - asteroid.radius > meShip.y + viewHalfHeight) {
          return;
        }

        let entity = asteroidsCache.get(asteroid.id);
        if (!entity) {
          entity = new Asteroid(asteroid);
          asteroidsCache.set(asteroid.id, entity);
        } else {
          entity.update(asteroid);
        }
        entity.draw(p);
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

      const camAngle = cameraRotationActive.value ? -meShip.angle : 0;
      entity.draw(p, factionColor, myShip.value.targetId === station.id, room.state, camAngle);
    });

    // DRAW ALL SHIPS
    room.state.ships.forEach((ship) => {
      let entity = shipsCache.get(ship.id);
      if (!entity) {
        entity = new Ship(ship);
        shipsCache.set(ship.id, entity);
      } else {
        entity.update(ship);
      }

      const pColor = getFactionColor(ship.faction);
      const camAngle = cameraRotationActive.value ? -meShip.angle : 0;
      entity.draw(p, pColor, shipConfigs.value, allWeapons.value, room.state, camAngle);

      if (meShip.targetId === ship.id) {
        p.push();
        p.translate(ship.x, ship.y);
        p.stroke('#ff3b30');
        p.strokeWeight(2);
        p.noFill();
        p.rect(0, 0, 80, 80);
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
      entity.draw(p, pColor);

      if (myShip.value.targetId === proj.id) {
        p.push();
        p.translate(proj.x, proj.y);
        p.stroke('#ff3b30');
        p.strokeWeight(2);
        p.noFill();
        p.ellipse(0, 0, 30);
        p.pop();
      }
    });

    // Cleanup Cache
    if (shipsCache.size > room.state.ships.size) {
      for (const [id] of shipsCache) if (!room.state.ships.has(id)) shipsCache.delete(id);
    }
    if (projectilesCache.size > room.state.projectiles.size) {
      for (const [id] of projectilesCache) if (!room.state.projectiles.has(id)) projectilesCache.delete(id);
    }

    // --- UI HUD (Immersive Overlay) ---
    p.pop(); // Exit World/Camera space

    const shipSpec = shipConfigs.value.find(s => s.id === myShip.value.shipClass);

    // DOCKING PROMPT
    const homeStationId = `station_${myShip.value.faction}`;
    const homeStation = room.state.stations.get(homeStationId);
    if (homeStation) {
      const distToHome = Math.sqrt((homeStation.x - myShip.value.x) ** 2 + (homeStation.y - myShip.value.y) ** 2);
      if (distToHome <= 1500 && !myShip.value.isDocked && !myShip.value.isDocking) {
        p.push();
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(20);
        p.fill(255, 255, 255, 200 + Math.sin(p.frameCount * 0.1) * 55);
        p.text("READY FOR DOCKING [L]", p.width / 2, p.height - 150);
        p.pop();
      }
    }

    if (myShip.value.isDocking) {
      const elapsed = Date.now() - myShip.value.dockingStartTime;
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

    if (myShip.value.isDocked) {
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
        const dx = asteroid.x - myShip.value.x;
        const dy = asteroid.y - myShip.value.y;
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

    // Draw Blips for all ships
    room.state.ships.forEach((ship) => {
      if (ship.isDead || ship.isDocked) return;
      const dx = ship.x - myShip.value.x;
      const dy = ship.y - myShip.value.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= radarRadius) {
        const blipX = dx * radarScale;
        const blipY = dy * radarScale;
        const isSelf = ship.id === myShip.value.id;
        const pColor = getFactionColor(ship.faction);

        p.push();
        if (isSelf) {
          // Self indicator - Clearly visible triangle pointing in facing direction
          p.rotate(myShip.value.angle || 0);
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
          if (myShip.value.targetId === ship.id) {
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

      const dx = proj.x - myShip.value.x;
      const dy = proj.y - myShip.value.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= radarRadius) {
        const blipX = dx * radarScale;
        const blipY = dy * radarScale;
        const pColor = getFactionColor(proj.faction);

        p.push();
        p.fill(pColor);
        p.noStroke();
        p.ellipse(blipX, blipY, 3); // Smaller than players

        if (myShip.value.targetId === proj.id) {
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
      const dx = station.x - myShip.value.x;
      const dy = station.y - myShip.value.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      const isBase = station.id.startsWith('station_');
      const isHome = station.faction === myShip.value.faction;
      const sColor = getFactionColor(station.faction);

      if (distance <= radarRadius) {
        const blipX = dx * radarScale;
        const blipY = dy * radarScale;

        p.push();
        p.fill(sColor);
        p.noStroke();
        p.ellipse(blipX, blipY, Math.max(8, station.radius * radarScale * 2)); // Circular blip for station

        // Label for bases
        if (isBase) {
          p.fill(255);
          p.textSize(8);
          p.textAlign(p.CENTER, p.BOTTOM);
          p.text(isHome ? 'HOME' : 'BASE', blipX, blipY - 6);
        }

        if (myShip.value.targetId === station.id) {
          p.noFill();
          p.stroke(sColor);
          p.strokeWeight(1);
          p.ellipse(blipX, blipY, Math.max(14, station.radius * radarScale * 2 + 6));
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

      const isWinner = room.state.winner === myShip.value.faction;
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
  };
};

watch(() => props.isLeaving, (newVal) => {
  if (newVal && leavingCountdown.value === 0) {
    leavingCountdown.value = 5;
    leavingInterval = setInterval(() => {
      leavingCountdown.value--;
      if (leavingCountdown.value <= 0) {
        clearInterval(leavingInterval);
        if (room) room.leave();
        emit('leave');
      }
    }, 1000);
  }
});

onMounted(async () => {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  await Promise.all([
    fetchShipConfigs(),
    fetchWeapons(),
    fetchVersion()
  ]);


  try {
    room = await connect(props.roomId, props.faction, props.ship, props.token);
  } catch (e) {
    console.error("Neural Link Error:", e);
    // Small delay so user can see the error status before being kicked back
    setTimeout(() => {
      emit('leave');
    }, 1500);
  }
  room ? connectionStatus.value = 'CONNECTED' : connectionStatus.value = 'OFFLINE';
  room?.onLeave((code) => {
    console.log("Left sector with code:", code);
    emit('leave');
  });
  room?.onStateChange((state) => {
    const me = state.players.get(room.sessionId);
    if (me) {
      myPlayer.value = { ...me };
      const myShipData = state.ships.get(me.shipId);
      if (myShipData) {
        isDead.value = myShipData.isDead;
        isDocked.value = myShipData.isDocked;
      }
    }
    gameStatus.value = state.gameStatus;
    winner.value = state.winner;
    if (state.gameOverTime > 0) {
      gameOverTimeLeft.value = Math.max(0, state.gameOverTime - state.serverTime);
    }
  });

  p5Instance = new p5(sketch, gameContainer.value);

});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
  if (p5Instance) p5Instance.remove();
  if (room) room.leave();
});
</script>

<template>

  <div class="game-view">
    <div class="game-header">
      <span>Sector: {{ roomId }}</span>
      <button @click="emit('leave')" class="btn-back">Main Menu</button>
    </div>
    <div id="game-canvas-container">

      <div class="game-client-wrapper">
        <!-- Main Game Canvas Container -->
        <div ref="gameContainer" class="p5-canvas-container"></div>

        <DebugHud :my-player="myPlayer" :my-ship="myShip" :connection-status="connectionStatus"
          :game-version="gameVersion"
          :camera-rotation-active="cameraRotationActive" :target-data="targetData" :hull-pct="hullPct"
          :armor-pct="armorPct" :move-keys="moveKeys" />

        <!-- UI Overlays -->
        <div class="game-ui-overlay">
          <!-- Status Badge -->
          <div v-if="connectionStatus !== 'CONNECTED'" class="status-overlay">
            <div class="status-box">
              <div class="status-spinner"></div>
              {{ connectionStatus }}
            </div>
          </div>

          <!-- Game Over UI -->
          <transition name="fade">
            <div v-if="gameStatus === 'gameover'" class="gameover-overlay">
              <div class="gameover-card" :class="winner === props.faction ? 'victory' : 'defeat'">
                <h1 v-if="winner === props.faction">VICTORY</h1>
                <h1 v-else>DEFEAT</h1>
                <p v-if="winner === props.faction">The station has been destroyed. Your faction is victorious!</p>
                <p v-else>Your station has fallen. The sector is lost.</p>

                <div class="countdown-section">
                  <div class="countdown-label">RETURNING TO LOBBY IN</div>
                  <div class="countdown-value">{{ Math.ceil(gameOverTimeLeft / 1000) }}s</div>
                </div>

                <button @click="emit('leave')" class="lobby-btn">RETURN TO LOBBY NOW</button>
              </div>
            </div>
          </transition>

          <!-- Death/Respawn UI -->
          <transition name="fade">
            <div v-if="isDead && gameStatus !== 'gameover'" class="respawn-overlay">
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

          <!-- Leaving Countdown UI -->
          <transition name="fade">
            <div v-if="isLeaving" class="leaving-overlay">
              <div class="leaving-card">
                <h2>RETURNING TO BASE</h2>
                <p>Your vessel is engaging warp drive for extraction.</p>
                <div class="countdown-value">{{ leavingCountdown }}s</div>
                <p class="warning">Neural link will terminate upon arrival.</p>
              </div>
            </div>
          </transition>

          <!-- Docking Menu (Abstracted) -->
          <DockingMenu :is-docked="isDocked" :my-player="myPlayer" :ship-configs="shipConfigs" :all-weapons="allWeapons"
            @undock="undock" @change-ship="changeShip" @buy-weapon="buyWeapon" @upgrade-weapon="upgradeWeapon" />
        </div>
      </div>
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

.leaving-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 150;
  pointer-events: auto;
}

.leaving-card {
  text-align: center;
  padding: 40px;
  background: rgba(15, 15, 25, 0.9);
  border: 1px solid rgba(79, 172, 254, 0.5);
  box-shadow: 0 0 30px rgba(79, 172, 254, 0.2);
  border-radius: 20px;
  max-width: 400px;
}

.leaving-card h2 {
  color: #4facfe;
  font-size: 1.8rem;
  margin-bottom: 15px;
  letter-spacing: 2px;
}

.leaving-card .countdown-value {
  font-size: 4rem;
  font-weight: bold;
  color: #fff;
  margin: 20px 0;
  font-family: monospace;
}

.leaving-card .warning {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9rem;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.gameover-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  backdrop-filter: blur(10px);
}

.gameover-card {
  text-align: center;
  padding: 60px;
  border: 4px solid #fff;
  background: rgba(20, 20, 20, 0.95);
  box-shadow: 0 0 50px rgba(255, 255, 255, 0.2);
  max-width: 600px;
  width: 100%;
}

.gameover-card.victory {
  border-color: #4ade80;
  box-shadow: 0 0 50px rgba(74, 222, 128, 0.3);
}

.gameover-card.defeat {
  border-color: #ef4444;
  box-shadow: 0 0 50px rgba(239, 68, 68, 0.3);
}

.gameover-card h1 {
  font-size: 5rem;
  font-weight: 900;
  margin-bottom: 10px;
  letter-spacing: 0.5rem;
}

.victory h1 {
  color: #4ade80;
  text-shadow: 0 0 20px rgba(74, 222, 128, 0.5);
}

.defeat h1 {
  color: #ef4444;
  text-shadow: 0 0 20px rgba(239, 68, 68, 0.5);
}

.gameover-card p {
  color: #ccc;
  font-size: 1.4rem;
  margin-bottom: 40px;
}

.countdown-section {
  margin-bottom: 40px;
}

.countdown-label {
  font-size: 0.9rem;
  color: #888;
  letter-spacing: 0.2rem;
  margin-bottom: 10px;
}

.countdown-value {
  font-size: 3rem;
  font-family: monospace;
  font-weight: bold;
  color: #fff;
}

.lobby-btn {
  background: #fff;
  color: #000;
  border: none;
  padding: 15px 40px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 0.1rem;
}

.lobby-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.4);
}
</style>