import { onMounted, onUnmounted, ref, computed, reactive, watch } from 'vue';
import { Client } from '@colyseus/sdk';
import p5 from 'p5';
import { Ship } from '../entities/Ship.js';
import { Station } from '../entities/Station.js';
import { Projectile } from '../entities/Projectile.js';
import { Asteroid } from '../entities/Asteroid.js';
import DockingMenu from './DockingMenu.vue';
import DebugHud from './DebugHud.vue';
const props = defineProps({
    roomId: String,
    faction: String,
    ship: String,
    factions: Array,
    token: String,
    isLeaving: Boolean
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
const gameOverTimeLeft = ref(0);
const gameStatus = ref("active");
const winner = ref("");
const serverVersion = ref("0.0.0");
const clientVersion = ref(import.meta.env.VITE_CLIENT_VERSION || "0.0.0");
const leavingCountdown = ref(0);
let leavingInterval = null;
const targetEntity = computed(() => {
    if (!myPlayer.value || !room || !room.state)
        return 'NONE';
    const targetId = myPlayer.value.targetId;
    if (!targetId)
        return 'NONE';
    const entity = room.state.players.get(targetId) ||
        room.state.stations.get(targetId) ||
        room.state.projectiles.get(targetId);
    return entity ? (entity.name || targetId) : 'UNKNOWN';
});
const shipStats = computed(() => {
    if (!myPlayer.value)
        return { hull: 100, armor: 0 };
    const spec = shipConfigs.value.find(s => s.id === myPlayer.value.shipClass);
    return spec ? spec.stats : { hull: 100, armor: 0 };
});
const hullPct = computed(() => {
    if (!myPlayer.value)
        return 0;
    return Math.max(0, myPlayer.value.hull / (shipStats.value.hull || 100));
});
const armorPct = computed(() => {
    if (!myPlayer.value)
        return 0;
    return Math.max(0, myPlayer.value.armor / (shipStats.value.armor || 1));
});
const targetData = computed(() => {
    if (!myPlayer.value || !room || !room.state)
        return null;
    const targetId = myPlayer.value.targetId;
    if (!targetId)
        return null;
    const entity = room.state.players.get(targetId) ||
        room.state.stations.get(targetId) ||
        room.state.projectiles.get(targetId);
    if (!entity)
        return null;
    let maxHull = 100;
    let maxArmor = 1;
    if (room.state.players.has(targetId)) {
        const spec = shipConfigs.value.find(s => s.id === entity.shipClass);
        maxHull = spec?.stats.hull || 100;
        maxArmor = spec?.stats.armor || 1;
    }
    else if (room.state.stations.has(targetId)) {
        maxHull = entity.maxHull || 40000;
        maxArmor = entity.armor || 100;
    }
    else if (room.state.projectiles.has(targetId)) {
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
        connected: entity.connected !== undefined ? entity.connected : true
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
    if (moveKeys.hasOwnProperty(key))
        moveKeys[key] = true;
    if (key === 'v')
        currentZoomIndex.value = (currentZoomIndex.value + 1) % zoomLevels.value.length;
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
    if (moveKeys.hasOwnProperty(key))
        moveKeys[key] = false;
};
const fetchShipConfigs = async () => {
    try {
        const baseUrl = import.meta.env.VITE_SERVER_URL || '';
        const response = await fetch(`${baseUrl}/api/ships`.replace(/^\/\//, '/'));
        shipConfigs.value = await response.json();
    }
    catch (e) {
        console.error("Error fetching ship configs", e);
    }
};
const fetchWeapons = async () => {
    try {
        const baseUrl = import.meta.env.VITE_SERVER_URL || '';
        const response = await fetch(`${baseUrl}/api/weapons`.replace(/^\/\//, '/'));
        allWeapons.value = await response.json();
    }
    catch (e) {
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
            if (wsUrlEnv.startsWith('wss://'))
                protocol = 'wss';
            else if (wsUrlEnv.startsWith('ws://'))
                protocol = 'ws';
        }
        else if (serverUrlEnv) {
            host = serverUrlEnv.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '');
            if (serverUrlEnv.startsWith('https'))
                protocol = 'wss';
            else if (serverUrlEnv.startsWith('http'))
                protocol = 'ws';
        }
        console.log(`Neural Link: connecting to ${protocol}://${host}`);
        client = new Client(`${protocol}://${host}`);
        const targetRoomId = String(props.roomId);
        // Give the server a tiny moment to finalize room creation/setup
        // Critical for DDEV/Multi-container setups
        await new Promise(resolve => setTimeout(resolve, 300));
        const lastSessionId = localStorage.getItem(`session_${targetRoomId}`);
        if (lastSessionId) {
            console.log(`Attempting to reconnect to sector ${targetRoomId} with session ${lastSessionId}...`);
            try {
                room = await client.reconnect(targetRoomId, lastSessionId);
                console.log("Reconnected successfully:", room.sessionId);
            }
            catch (e) {
                console.warn("Reconnection failed, starting fresh deployment...", e);
                room = await client.joinById(targetRoomId, {
                    faction: props.faction,
                    ship: props.ship,
                    token: props.token
                });
            }
        }
        else {
            console.log(`Connecting to sector ${targetRoomId}...`);
            room = await client.joinById(targetRoomId, {
                faction: props.faction,
                ship: props.ship,
                token: props.token
            });
        }
        localStorage.setItem(`session_${targetRoomId}`, room.sessionId);
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
            gameStatus.value = state.gameStatus;
            winner.value = state.winner;
            serverVersion.value = state.serverVersion || "N/A";
            if (state.gameOverTime > 0) {
                gameOverTimeLeft.value = Math.max(0, state.gameOverTime - state.serverTime);
            }
        });
        room.onLeave((code) => {
            console.log("Left sector with code:", code);
            emit('leave');
        });
    }
    catch (e) {
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
        const h = p.height || 600;
        zoomLevels.value = [
            h / 500,
            h / 5000
        ];
    };
    const handleInputs = () => {
        if (!room || props.isLeaving)
            return;
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
        if (!myPlayer)
            return;
        handleInputs();
        const zoom = zoomLevels.value[currentZoomIndex.value] || 0.1;
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
                }
                else {
                    entity.update(asteroid);
                }
                entity.draw(p, zoom);
            });
            if (asteroidsCache.size > room.state.asteroidObjects.size) {
                for (const [id] of asteroidsCache)
                    if (!room.state.asteroidObjects.has(id))
                        asteroidsCache.delete(id);
            }
        }
        // DRAW STATIONS
        room.state.stations.forEach((station) => {
            let entity = stationsCache.get(station.id);
            if (!entity) {
                entity = new Station(station);
                stationsCache.set(station.id, entity);
            }
            else {
                entity.update(station);
            }
            const sColor = getFactionColor(station.faction);
            const camAngle = cameraRotationActive.value ? -myPlayer.angle : 0;
            entity.draw(p, zoom, sColor, myPlayer.targetId === station.id, room.state, camAngle);
        });
        // DRAW ALL PLAYERS
        room.state.players.forEach((player) => {
            let entity = shipsCache.get(player.id);
            if (!entity) {
                entity = new Ship(player);
                shipsCache.set(player.id, entity);
            }
            else {
                entity.update(player);
            }
            const pColor = getFactionColor(player.faction);
            const camAngle = cameraRotationActive.value ? -myPlayer.angle : 0;
            entity.draw(p, zoom, pColor, shipConfigs.value, allWeapons.value, room.state, camAngle);
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
            }
            else {
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
            for (const [id] of shipsCache)
                if (!room.state.players.has(id))
                    shipsCache.delete(id);
        }
        if (projectilesCache.size > room.state.projectiles.size) {
            for (const [id] of projectilesCache)
                if (!room.state.projectiles.has(id))
                    projectilesCache.delete(id);
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
            if (player.isDead || player.isDocked)
                return;
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
                }
                else {
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
            if (proj.type !== 'drone' && proj.type !== 'missile')
                return;
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
            }
            else if (isBase) {
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
            }
            else {
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
watch(() => props.isLeaving, (newVal) => {
    if (newVal && leavingCountdown.value === 0) {
        leavingCountdown.value = 10;
        leavingInterval = setInterval(() => {
            leavingCountdown.value--;
            if (leavingCountdown.value <= 0) {
                clearInterval(leavingInterval);
                if (room)
                    room.leave();
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
    if (p5Instance)
        p5Instance.remove();
    if (room)
        room.leave();
});
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['game-ui-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['respawn-card']} */ ;
/** @type {__VLS_StyleScopedClasses['respawn-card']} */ ;
/** @type {__VLS_StyleScopedClasses['respawn-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['respawn-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['respawn-card']} */ ;
/** @type {__VLS_StyleScopedClasses['respawn-card']} */ ;
/** @type {__VLS_StyleScopedClasses['respawn-card']} */ ;
/** @type {__VLS_StyleScopedClasses['respawn-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['leaving-card']} */ ;
/** @type {__VLS_StyleScopedClasses['leaving-card']} */ ;
/** @type {__VLS_StyleScopedClasses['leaving-card']} */ ;
/** @type {__VLS_StyleScopedClasses['gameover-card']} */ ;
/** @type {__VLS_StyleScopedClasses['gameover-card']} */ ;
/** @type {__VLS_StyleScopedClasses['gameover-card']} */ ;
/** @type {__VLS_StyleScopedClasses['victory']} */ ;
/** @type {__VLS_StyleScopedClasses['defeat']} */ ;
/** @type {__VLS_StyleScopedClasses['gameover-card']} */ ;
/** @type {__VLS_StyleScopedClasses['countdown-value']} */ ;
/** @type {__VLS_StyleScopedClasses['lobby-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "game-client-wrapper" },
});
/** @type {__VLS_StyleScopedClasses['game-client-wrapper']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ref: "gameContainer",
    ...{ class: "p5-canvas-container" },
});
/** @type {__VLS_StyleScopedClasses['p5-canvas-container']} */ ;
const __VLS_0 = DebugHud;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    myPlayer: (__VLS_ctx.myPlayer),
    connectionStatus: (__VLS_ctx.connectionStatus),
    serverVersion: (__VLS_ctx.serverVersion),
    clientVersion: (__VLS_ctx.clientVersion),
    currentZoomIndex: (__VLS_ctx.currentZoomIndex),
    cameraRotationActive: (__VLS_ctx.cameraRotationActive),
    targetData: (__VLS_ctx.targetData),
    hullPct: (__VLS_ctx.hullPct),
    armorPct: (__VLS_ctx.armorPct),
    moveKeys: (__VLS_ctx.moveKeys),
}));
const __VLS_2 = __VLS_1({
    myPlayer: (__VLS_ctx.myPlayer),
    connectionStatus: (__VLS_ctx.connectionStatus),
    serverVersion: (__VLS_ctx.serverVersion),
    clientVersion: (__VLS_ctx.clientVersion),
    currentZoomIndex: (__VLS_ctx.currentZoomIndex),
    cameraRotationActive: (__VLS_ctx.cameraRotationActive),
    targetData: (__VLS_ctx.targetData),
    hullPct: (__VLS_ctx.hullPct),
    armorPct: (__VLS_ctx.armorPct),
    moveKeys: (__VLS_ctx.moveKeys),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "game-ui-overlay" },
});
/** @type {__VLS_StyleScopedClasses['game-ui-overlay']} */ ;
if (__VLS_ctx.connectionStatus !== 'CONNECTED') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "status-overlay" },
    });
    /** @type {__VLS_StyleScopedClasses['status-overlay']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "status-box" },
    });
    /** @type {__VLS_StyleScopedClasses['status-box']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "status-spinner" },
    });
    /** @type {__VLS_StyleScopedClasses['status-spinner']} */ ;
    (__VLS_ctx.connectionStatus);
}
let __VLS_5;
/** @ts-ignore @type {typeof __VLS_components.transition | typeof __VLS_components.Transition | typeof __VLS_components.transition | typeof __VLS_components.Transition} */
transition;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
    name: "fade",
}));
const __VLS_7 = __VLS_6({
    name: "fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
const { default: __VLS_10 } = __VLS_8.slots;
if (__VLS_ctx.gameStatus === 'gameover') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "gameover-overlay" },
    });
    /** @type {__VLS_StyleScopedClasses['gameover-overlay']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "gameover-card" },
        ...{ class: (__VLS_ctx.winner === props.faction ? 'victory' : 'defeat') },
    });
    /** @type {__VLS_StyleScopedClasses['gameover-card']} */ ;
    if (__VLS_ctx.winner === props.faction) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({});
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({});
    }
    if (__VLS_ctx.winner === props.faction) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "countdown-section" },
    });
    /** @type {__VLS_StyleScopedClasses['countdown-section']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "countdown-label" },
    });
    /** @type {__VLS_StyleScopedClasses['countdown-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "countdown-value" },
    });
    /** @type {__VLS_StyleScopedClasses['countdown-value']} */ ;
    (Math.ceil(__VLS_ctx.gameOverTimeLeft / 1000));
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.gameStatus === 'gameover'))
                    return;
                __VLS_ctx.emit('leave');
                // @ts-ignore
                [myPlayer, connectionStatus, connectionStatus, connectionStatus, serverVersion, clientVersion, currentZoomIndex, cameraRotationActive, targetData, hullPct, armorPct, moveKeys, gameStatus, winner, winner, winner, gameOverTimeLeft, emit,];
            } },
        ...{ class: "lobby-btn" },
    });
    /** @type {__VLS_StyleScopedClasses['lobby-btn']} */ ;
}
// @ts-ignore
[];
var __VLS_8;
let __VLS_11;
/** @ts-ignore @type {typeof __VLS_components.transition | typeof __VLS_components.Transition | typeof __VLS_components.transition | typeof __VLS_components.Transition} */
transition;
// @ts-ignore
const __VLS_12 = __VLS_asFunctionalComponent1(__VLS_11, new __VLS_11({
    name: "fade",
}));
const __VLS_13 = __VLS_12({
    name: "fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_12));
const { default: __VLS_16 } = __VLS_14.slots;
if (__VLS_ctx.isDead && __VLS_ctx.gameStatus !== 'gameover') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "respawn-overlay" },
    });
    /** @type {__VLS_StyleScopedClasses['respawn-overlay']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "respawn-card" },
    });
    /** @type {__VLS_StyleScopedClasses['respawn-card']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "respawn-stats" },
    });
    /** @type {__VLS_StyleScopedClasses['respawn-stats']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.sendRespawn) },
        ...{ class: "respawn-btn" },
    });
    /** @type {__VLS_StyleScopedClasses['respawn-btn']} */ ;
}
// @ts-ignore
[gameStatus, isDead, sendRespawn,];
var __VLS_14;
let __VLS_17;
/** @ts-ignore @type {typeof __VLS_components.transition | typeof __VLS_components.Transition | typeof __VLS_components.transition | typeof __VLS_components.Transition} */
transition;
// @ts-ignore
const __VLS_18 = __VLS_asFunctionalComponent1(__VLS_17, new __VLS_17({
    name: "fade",
}));
const __VLS_19 = __VLS_18({
    name: "fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_18));
const { default: __VLS_22 } = __VLS_20.slots;
if (__VLS_ctx.isLeaving) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "leaving-overlay" },
    });
    /** @type {__VLS_StyleScopedClasses['leaving-overlay']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "leaving-card" },
    });
    /** @type {__VLS_StyleScopedClasses['leaving-card']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "countdown-value" },
    });
    /** @type {__VLS_StyleScopedClasses['countdown-value']} */ ;
    (__VLS_ctx.leavingCountdown);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "warning" },
    });
    /** @type {__VLS_StyleScopedClasses['warning']} */ ;
}
// @ts-ignore
[isLeaving, leavingCountdown,];
var __VLS_20;
const __VLS_23 = DockingMenu;
// @ts-ignore
const __VLS_24 = __VLS_asFunctionalComponent1(__VLS_23, new __VLS_23({
    ...{ 'onUndock': {} },
    ...{ 'onChangeShip': {} },
    ...{ 'onBuyWeapon': {} },
    ...{ 'onUpgradeWeapon': {} },
    isDocked: (__VLS_ctx.isDocked),
    myPlayer: (__VLS_ctx.myPlayer),
    shipConfigs: (__VLS_ctx.shipConfigs),
    allWeapons: (__VLS_ctx.allWeapons),
}));
const __VLS_25 = __VLS_24({
    ...{ 'onUndock': {} },
    ...{ 'onChangeShip': {} },
    ...{ 'onBuyWeapon': {} },
    ...{ 'onUpgradeWeapon': {} },
    isDocked: (__VLS_ctx.isDocked),
    myPlayer: (__VLS_ctx.myPlayer),
    shipConfigs: (__VLS_ctx.shipConfigs),
    allWeapons: (__VLS_ctx.allWeapons),
}, ...__VLS_functionalComponentArgsRest(__VLS_24));
let __VLS_28;
const __VLS_29 = ({ undock: {} },
    { onUndock: (__VLS_ctx.undock) });
const __VLS_30 = ({ changeShip: {} },
    { onChangeShip: (__VLS_ctx.changeShip) });
const __VLS_31 = ({ buyWeapon: {} },
    { onBuyWeapon: (__VLS_ctx.buyWeapon) });
const __VLS_32 = ({ upgradeWeapon: {} },
    { onUpgradeWeapon: (__VLS_ctx.upgradeWeapon) });
var __VLS_26;
var __VLS_27;
// @ts-ignore
[myPlayer, isDocked, shipConfigs, allWeapons, undock, changeShip, buyWeapon, upgradeWeapon,];
const __VLS_export = (await import('vue')).defineComponent({
    emits: {},
    props: {
        roomId: String,
        faction: String,
        ship: String,
        factions: Array,
        token: String,
        isLeaving: Boolean
    },
});
export default {};
//# sourceMappingURL=GameView.vue.js.map