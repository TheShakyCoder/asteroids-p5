import { Room, Client, CloseCode } from "colyseus";
import { MyRoomState } from "./schema/MyRoomState.js";
import { Player } from "./schema/Player.js";
import { Station } from "./schema/Station.js";
import { factions } from "../data/factions.js";
import { ships } from "../data/ships.js";
import { weapons } from "../data/weapons.js";
import { calculateHit, rollHitChance } from "../utils/combat.js";

export class MyRoom extends Room {
  maxClients = 4;
  state = new MyRoomState();

  messages = {
    yourMessageType: (client: Client, message: any) => {
      /**
       * Handle "yourMessageType" message.
       */
      console.log(client.sessionId, "sent a message:", message);
    }
  }

  onCreate (options: any) {
    console.log("Room created with dimensions:", this.state.width, "x", this.state.height);
    this.setMetadata({ factionCounts: {} });

    // Initialize Faction Bases
    factions.forEach(f => {
      const station = new Station();
      station.id = `base_${f.id}`;
      station.faction = f.id;
      station.x = f.spawn.x;
      station.y = f.spawn.y;
      station.width = 500;
      station.height = 70;
      station.angle = 0; // Stationary for now
      this.state.stations.set(station.id, station);
    });
    
    this.onMessage("toggle-weapon", (client, index: number) => {
      const player = this.state.players.get(client.sessionId);
      if (player && player.weaponSlots[index] !== undefined) {
        player.weaponSlots[index] = !player.weaponSlots[index];
      }
    });

    this.onMessage("target-enemy", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      let nearest: Player | null = null;
      let minDist = Infinity;

      this.state.players.forEach((other) => {
        if (other.id === client.sessionId) return;
        if (other.faction === player.faction) return;

        const dist = Math.sqrt((other.x - player.x) ** 2 + (other.y - player.y) ** 2);
        if (dist < minDist) {
          minDist = dist;
          nearest = other;
        }
      });

      player.targetId = nearest ? nearest.id : "";
      console.log(`Player ${client.sessionId} targeting ${player.targetId || 'NOTHING'}`);
    });

    this.onMessage("target-object", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      // Currently only players exist, so target nearest player (enemy or neutral)
      let nearest: Player | null = null;
      let minDist = Infinity;

      this.state.players.forEach((other) => {
        if (other.id === client.sessionId) return;

        const dist = Math.sqrt((other.x - player.x) ** 2 + (other.y - player.y) ** 2);
        if (dist < minDist) {
          minDist = dist;
          nearest = other;
        }
      });

      player.targetId = nearest ? nearest.id : "";
    });

    this.onMessage("input", (client, input) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        // Explicitly map inputs to ensure reference stays valid
        player.input.w = !!input.w;
        player.input.a = !!input.a;
        player.input.s = !!input.s;
        player.input.d = !!input.d;
      }
    });

    this.setSimulationInterval((deltaTime) => this.update(deltaTime));
  }

  update(deltaTime: number) {
    const worldHalfWidth = this.state.width / 2;
    const worldHalfHeight = this.state.height / 2;

    this.state.serverTime = Date.now();
    this.state.players.forEach((player) => {
      player.heartbeat++;
      // Find ship stats for this player
      const shipSpec = ships.find(s => s.id === player.shipClass) || ships[0];
      const maxSpeed = shipSpec.stats.maxVelocity || 10;
      const acceleration = shipSpec.stats.acceleration || 0.5;
      // Convert deg/sec to rad/tick: (degrees * PI/180) * (deltaTime in seconds)
      const rotationSpeed = (shipSpec.stats.angularVelocity || 90) * (Math.PI / 180) * (deltaTime / 1000);
      const friction = 1.0; // Space is a vacuum; no passive friction. Only S (brakes) will slow you down.

      // Update angle
      if (player.input.a) player.angle -= rotationSpeed;
      if (player.input.d) player.angle += rotationSpeed;

      const facingX = Math.sin(player.angle);
      const facingY = -Math.cos(player.angle);

      // Update velocity
      if (player.input.w) {
        player.vx += facingX * acceleration;
        player.vy += facingY * acceleration;
      }
      
      // 1. Sideways (Lateral) Damping: reduces "icy" sliding.
      // High-speed interceptors feel this drift most when turning.
      const lateralDamping = shipSpec.stats.lateralDamping || 0.05; 
      const rightX = -facingY;
      const rightY = facingX;
      const lateralVel = player.vx * rightX + player.vy * rightY;
      player.vx -= rightX * lateralVel * lateralDamping;
      player.vy -= rightY * lateralVel * lateralDamping;

      // 2. Braking (S key)
      if (player.input.s) {
        // Brake all momentum, not just forward.
        const brakingForce = acceleration * 1.5; // Reduced from 3x to 1.5x
        const currentSpeed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
        if (currentSpeed > 0) {
          const reduction = Math.min(brakingForce, currentSpeed);
          const ratio = (currentSpeed - reduction) / currentSpeed;
          player.vx *= ratio;
          player.vy *= ratio;
        }
      }

      // Apply friction
      player.vx *= friction;
      player.vy *= friction;

      // Cap speed
      const currentSpeed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
      if (currentSpeed > maxSpeed) {
        player.vx = (player.vx / currentSpeed) * maxSpeed;
        player.vy = (player.vy / currentSpeed) * maxSpeed;
      }

      // Update position
      player.x += player.vx;
      player.y += player.vy;

      // World wrapping (center at 0,0)
      if (player.x < -worldHalfWidth) player.x = worldHalfWidth;
      if (player.x > worldHalfWidth) player.x = -worldHalfWidth;
      if (player.y < -worldHalfHeight) player.y = worldHalfHeight;
      if (player.y > worldHalfHeight) player.y = -worldHalfHeight;

      // 3. WEAPON FIRING LOGIC
      if (player.targetId && shipSpec.weapons) {
        const target = this.state.players.get(player.targetId);
        if (target) {
          shipSpec.weapons.forEach((sw, i) => {
            if (!player.weaponSlots[i]) return;

            // Normalize weapon ID and level
            const wId = typeof sw.weapon === 'string' ? sw.weapon : sw.weapon.id;
            const wLevel = typeof sw.weapon === 'string' ? 1 : (sw.weapon.level || 1);

            const weaponDef = weapons.find(w => w.id === wId);
            if (!weaponDef) return;

            const now = this.state.serverTime;
            const lastFire = player.weaponLastFire.get(i.toString()) || 0;

            // Use the new reload stat (converting to ms if it's in seconds)
            const reloadMs = (weaponDef.reload || 1) * 1000;

            if (now - lastFire >= reloadMs) {
              // Calculate world muzzle position
              const shipAngle = player.angle || 0;
              const cosA = Math.cos(shipAngle);
              const sinA = Math.sin(shipAngle);
              const mX = -sw.mount.left;
              const mY = -sw.mount.front;
              const muzzleWorldX = player.x + (mX * cosA - mY * sinA);
              const muzzleWorldY = player.y + (mX * sinA + mY * cosA);

              // Distance check
              const dx = target.x - muzzleWorldX;
              const dy = target.y - muzzleWorldY;
              const distance = Math.sqrt(dx * dx + dy * dy);

              // Extract stats based on level
              const lIdx = Math.max(0, wLevel - 1);
              const optRange = Array.isArray(weaponDef.optimalRange) ? weaponDef.optimalRange[lIdx] : (weaponDef.optimalRange || 500);
              const maxRange = Array.isArray(weaponDef.maxRange) ? weaponDef.maxRange[lIdx] : (weaponDef.maxRange || 1000);
              const minDmg = Array.isArray(weaponDef.minDamage) ? weaponDef.minDamage[lIdx] : 10;
              const maxDmg = Array.isArray(weaponDef.maxDamage) ? weaponDef.maxDamage[lIdx] : 10;
              const accuracy = Array.isArray(weaponDef.accuracy) ? weaponDef.accuracy[lIdx] : (weaponDef.accuracy || 400);
              const fov = weaponDef.firingArc || 45;

              if (distance <= maxRange) {
                // Angle check
                const weaponWorldAngle = shipAngle + (sw.mount.rotation * Math.PI / 180) - (Math.PI / 2);
                const angleToTarget = Math.atan2(dy, dx);
                
                let angleDiff = angleToTarget - weaponWorldAngle;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

                const halfFovRad = (fov / 2) * Math.PI / 180;
                if (Math.abs(angleDiff) <= halfFovRad) {
                  // FIRE!
                  player.weaponLastFire.set(i.toString(), now);
                  
                  // 1. ROLL TO HIT
                  const didHit = rollHitChance({
                    accuracy,
                    optimalRange: optRange,
                    maxRange,
                    distance,
                    evasion: 0 // Placeholder until evasion is added to schema
                  });

                  if (!didHit) {
                    console.log(`Player ${player.id} MISSED ${target.id}`);
                    return;
                  }

                  // 2. APPLY DAMAGE (randomize between min and max)
                  const baseDmg = minDmg + Math.random() * (maxDmg - minDmg);
                  const hitResult = calculateHit({
                    baseDamage: baseDmg,
                    armor: target.armor,
                    armorPiercing: weaponDef.armorPiercing || 0
                  });

                  target.hull -= hitResult.finalHullDamage;
                  console.log(`Player ${player.id} hit ${target.id} for ${hitResult.finalHullDamage.toFixed(1)} damage. Target hull: ${target.hull.toFixed(1)}`);

                  if (target.hull <= 0) {
                    this.respawnPlayer(target);
                  }
                }
              }
            }
          });
        }
      }
    });
  }

  respawnPlayer(player: Player) {
    console.log(`Player ${player.id} destroyed! Respawning...`);
    const faction = factions.find(f => f.id === player.faction) || factions[0];
    const shipSpec = ships.find(s => s.id === player.shipClass) || ships[0];

    player.x = faction.spawn.x + (Math.random() * 200 - 100);
    player.y = faction.spawn.y + (Math.random() * 200 - 100);
    player.vx = 0;
    player.vy = 0;
    player.hull = shipSpec.stats.hull;
    player.armor = shipSpec.stats.armor;
    player.targetId = "";
  }

  onJoin (client: Client, options: any) {
    console.log(client.sessionId, "joined with options:", options);
    
    const faction = factions.find(f => f.id === options.faction) || factions[0];
    const shipSpec = ships.find(s => s.id === options.ship) || ships[0];
    
    const player = new Player();
    player.id = client.sessionId;
    player.faction = faction.id;
    player.shipClass = shipSpec.id;
    player.x = faction.spawn.x;
    player.y = faction.spawn.y;
    player.hull = shipSpec.stats.hull;
    player.armor = shipSpec.stats.armor;
    player.weaponRadius = shipSpec.stats.weaponRadius;
    
    // Initialize weapon states
    if (shipSpec.weapons) {
       shipSpec.weapons.forEach((_, i) => {
         player.weaponSlots.push(true);
         player.weaponLastFire.set(i.toString(), 0);
       });
    }
    
    this.state.players.set(client.sessionId, player);
    this.updateMetadata();
  }

  onLeave (client: Client, code: CloseCode) {
    console.log(client.sessionId, "left!", code);
    this.state.players.delete(client.sessionId);
    this.updateMetadata();
  }

  onDispose() {
    /**
     * Called when the room is disposed.
     */
    console.log("room", this.roomId, "disposing...");
  }

  updateMetadata() {
    const counts: any = {};
    this.state.players.forEach(p => {
      counts[p.faction] = (counts[p.faction] || 0) + 1;
    });
    this.setMetadata({ factionCounts: counts });
  }

}
