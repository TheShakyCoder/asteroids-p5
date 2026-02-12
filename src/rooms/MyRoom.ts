import { Room, Client, CloseCode, matchMaker } from "colyseus";
import { MyRoomState } from "./schema/MyRoomState.js";
import { Player } from "./schema/Player.js";
import { Ship } from "./schema/Ship.js";
import { Station } from "./schema/Station.js";
import { Projectile } from "./schema/Projectile.js";
import { Asteroid } from "./schema/Asteroid.js";
import { Faction as FactionSchema } from "./schema/Faction.js";
import { factions } from "../data/factions.js";
import { ships } from "../data/ships.js";
import { weapons } from "../data/weapons.js";
import { calculateHit, rollHitChance } from "../utils/combat.js";
import { generateGuestName, generateRoomName } from "../utils/names.js";
import { sendVerificationEmail } from "../utils/mail.js";
import jwt from "jsonwebtoken";

export class MyRoom extends Room {
  maxClients = 4;
  state = new MyRoomState();

  messages = {
    yourMessageType: (client: Client, message: any) => {
      /**
       * Handle "yourMessageType" message.
       */
      // console.log(client.sessionId, "sent a message:", message);
    }
  }

  onCreate(options: any) {
    // console.log("Room created with dimensions:", this.state.width, "x", this.state.height);
    this.setMetadata({ 
      name: options.name || `Sector ${generateRoomName()}`,
      factionCounts: {} 
    });

    // Persistent sector management
    this.autoDispose = false;

    // Initialize Factions and Bases
    factions.forEach(f => {
      // 1. Create the Faction state
      const faction = new FactionSchema();
      faction.id = f.id;
      faction.name = f.name;
      faction.color = f.color;
      faction.description = f.description;
      faction.spawnX = f.spawn.x;
      faction.spawnY = f.spawn.y;
      this.state.factions.set(faction.id, faction);

      // 2. Create the associated base station if configured
      if (f.hasStation) {
        const station = new Station();
        station.id = `station_${f.id}`;
        station.faction = f.id;
        station.x = f.spawn.x;
        station.y = f.spawn.y;
        station.radius = 300;
        station.maxHull = 40000;
        station.hull = 40000;
        station.armor = 100;
        station.droneNextWaveTime = Date.now(); // Start first wave immediately
        this.state.stations.set(station.id, station);
      }
    });

    // Procedural Asteroid Generation
    const asteroidCount = this.state.asteroids || 10;
    // console.log(`Generating ${asteroidCount} asteroids...`);
    
    for (let i = 0; i < asteroidCount; i++) {
        const asteroid = new Asteroid();
        asteroid.id = `ast_${i}`;
        
        // Random position within map bounds
        asteroid.x = (Math.random() - 0.5) * this.state.width;
        asteroid.y = (Math.random() - 0.5) * this.state.height;
        
        // Random size between 50 and 500
        asteroid.radius = 50 + Math.random() * 450;
        asteroid.maxHull = asteroid.radius * 2;
        asteroid.hull = asteroid.maxHull;
        asteroid.armor = asteroid.radius / 10;
        
        // Avoid spawning too close to bases (within 3000 units)
        let tooClose = false;
        this.state.stations.forEach(s => {
            const dist = Math.sqrt((s.x - asteroid.x)**2 + (s.y - asteroid.y)**2);
            if (dist < 3000) tooClose = true;
        });
        
        if (tooClose) {
            i--; // Retry
            continue;
        }
        
        this.state.asteroidObjects.set(asteroid.id, asteroid);
    }

    this.onMessage("toggle-weapon", (client, index: number) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const ship = this.state.ships.get(player.shipId);
      if (ship && ship.weaponSlots[index] !== undefined) {
        ship.weaponSlots[index] = !ship.weaponSlots[index];
      }
    });

    this.onMessage("target-enemy", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const ship = this.state.ships.get(player.shipId);
      if (!ship) return;

      let nearest: any = null;
      let minDist = Infinity;

      this.state.ships.forEach((other) => {
        if (other.ownerId === client.sessionId) return;
        if (other.faction === ship.faction || other.isDead || other.isDocked) return;

        const dist = Math.sqrt((other.x - ship.x) ** 2 + (other.y - ship.y) ** 2);
        if (dist < minDist) {
          minDist = dist;
          nearest = other;
        }
      });

      // Include targetable projectiles (drones/missiles)
      this.state.projectiles.forEach((proj) => {
        if (proj.faction === ship.faction) return;
        // Only target drones or missiles (standard bullets/beams aren't targetable)
        if (proj.type !== "drone" && proj.type !== "missile") return;
        
        const dist = Math.sqrt((proj.x - ship.x) ** 2 + (proj.y - ship.y) ** 2);
        if (dist < minDist) {
          minDist = dist;
          nearest = proj;
        }
      });

      ship.targetId = nearest ? (nearest as any).id : "";
      // console.log(`Player ${client.sessionId} targeting enemy ${ship.targetId || 'NOTHING'}`);
    });

    this.onMessage("target-object", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const ship = this.state.ships.get(player.shipId);
      if (!ship) return;

      let nearest: any = null;
      let minDist = Infinity;

      // Scan both ships and stations
      this.state.ships.forEach((other) => {
        if (other.ownerId === client.sessionId || other.isDead || other.isDocked) return;
        const dist = Math.sqrt((other.x - ship.x) ** 2 + (other.y - ship.y) ** 2);
        if (dist < minDist) {
          minDist = dist;
          nearest = other;
        }
      });

      this.state.stations.forEach((station) => {
        const dist = Math.sqrt((station.x - ship.x) ** 2 + (station.y - ship.y) ** 2);
        if (dist < minDist) {
          minDist = dist;
          nearest = station;
        }
      });

      this.state.projectiles.forEach((proj) => {
        // Targetable objects include drones and missiles
        if (proj.type !== "drone" && proj.type !== "missile") return;
        const dist = Math.sqrt((proj.x - ship.x) ** 2 + (proj.y - ship.y) ** 2);
        if (dist < minDist) {
          minDist = dist;
          nearest = proj;
        }
      });

      ship.targetId = nearest ? (nearest as any).id : "";
      // console.log(`Player ${client.sessionId} targeting object ${ship.targetId || 'NOTHING'}`);
    });

    this.onMessage("dock", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const ship = this.state.ships.get(player.shipId);
      if (!ship || ship.isDead || ship.isDocked || ship.isDocking) return;

      const stationId = `station_${ship.faction}`;
      const station = this.state.stations.get(stationId);
      if (!station) {
        // console.log(`Ship ${ship.id} tried to dock, but faction ${ship.faction} has no station.`);
        return;
      }

      const dist = Math.sqrt((station.x - ship.x) ** 2 + (station.y - ship.y) ** 2);
      if (dist <= 1500) {
        ship.isDocking = true;
        ship.dockingStartTime = Date.now();
        // console.log(`Player ${player.id} STARTING DOCKING`);
      }
    });

    this.onMessage("undock", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
         const ship = this.state.ships.get(player.shipId);
         if (ship && ship.isDocked) {
            ship.isDocked = false;
            // console.log(`Player ${player.id} UNDOCKED`);
         }
      }
    });

    this.onMessage("buy-weapon", (client, data: { slotIndex: number, weaponId: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const ship = this.state.ships.get(player.shipId);
      if (!ship || !ship.isDocked) return;

      const weaponDef = weapons.find(w => w.id === data.weaponId);
      if (!weaponDef) return;

      const isOwned = player.ownedWeapons.has(data.weaponId);
      const level = isOwned ? player.ownedWeapons.get(data.weaponId) : 1;
      const cost = isOwned ? 0 : (weaponDef.tylium || 0);

      if (player.tylium >= cost) {
        player.tylium -= cost;
        ship.equippedWeapons[data.slotIndex] = data.weaponId;
        ship.weaponLevels[data.slotIndex] = level;
        
        if (!isOwned) {
          player.ownedWeapons.set(data.weaponId, 1);
          // console.log(`Player ${player.id} BOUGHT ${data.weaponId} for slot ${data.slotIndex}`);
        } else {
          // console.log(`Player ${player.id} EQUIPPED owned ${data.weaponId} (Level ${level}) in slot ${data.slotIndex}`);
        }
      }
    });

    this.onMessage("upgrade-weapon", (client, data: { slotIndex: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const ship = this.state.ships.get(player.shipId);
      if (!ship || !ship.isDocked) return;

      const wId = ship.equippedWeapons[data.slotIndex];
      const currentLevel = ship.weaponLevels[data.slotIndex] || 1;
      if (currentLevel >= 10) return; // Max level 10

      const weaponDef = weapons.find(w => w.id === wId);
      if (!weaponDef) return;

      // Cost to upgrade: 50% of base price * level
      const cost = Math.floor((weaponDef.tylium || 10000) * 0.5 * currentLevel);

      if (player.tylium >= cost) {
        player.tylium -= cost;
        const newLevel = currentLevel + 1;
        ship.weaponLevels[data.slotIndex] = newLevel;
        player.ownedWeapons.set(wId, newLevel);
        // console.log(`Player ${player.id} UPGRADED weapon in slot ${data.slotIndex} to level ${newLevel}`);
      }
    });

    this.onMessage("change-ship", (client, data: { shipId: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const ship = this.state.ships.get(player.shipId);
      if (!ship || !ship.isDocked) return;

      const shipSpec = ships.find(s => s.id === data.shipId);
      if (!shipSpec) return;

      ship.shipClass = shipSpec.id;
      ship.hull = shipSpec.stats.hull;
      ship.armor = shipSpec.stats.armor;

      // Reset weapons to default for the new ship (but use owned levels if available)
      ship.equippedWeapons = [];
      ship.weaponLevels = [];
      ship.weaponSlots = [];
      
      if (shipSpec.weapons) {
        shipSpec.weapons.forEach((w, i) => {
          ship.weaponSlots.push(true);
          ship.equippedWeapons.push(w.weapon.id);
          
          // Use owned level if available, otherwise default to starting level
          const ownedLevel = player.ownedWeapons.get(w.weapon.id);
          const startLevel = ownedLevel || w.weapon.level || 1;
          ship.weaponLevels.push(startLevel);
          
          if (!ownedLevel) {
            player.ownedWeapons.set(w.weapon.id, startLevel);
          }
        });
      }
      
      // console.log(`Player ${player.id} CHANGED SHIP TO ${data.shipId}`);
    });

    this.onMessage("input", (client, input) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        const ship = this.state.ships.get(player.shipId);
        if (ship && !ship.isDead) {
          // Explicitly map inputs to ensure reference stays valid
          player.input.w = !!input.w;
          player.input.a = !!input.a;
          player.input.s = !!input.s;
          player.input.d = !!input.d;
        }
      }
    });

    this.onMessage("respawn", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        const ship = this.state.ships.get(player.shipId);
        if (ship && ship.isDead) {
          this.respawnPlayer(player);
        }
      }
    });

    this.setSimulationInterval((deltaTime) => this.update(deltaTime));
  }

  update(deltaTime: number) {
    try {
      this._update(deltaTime);
    } catch (e) {
      console.error("CRITICAL ERROR IN UPDATE LOOP:", e);
    }
  }

  private _update(deltaTime: number) {
    const worldHalfWidth = this.state.width / 2;
    const worldHalfHeight = this.state.height / 2;

    this.state.serverTime = Date.now();
    this.state.ships.forEach((ship) => {
      const player = this.state.players.get(ship.ownerId);
      if (player) {
        player.heartbeat++;
      }
      
      if (ship.isDead) {
        ship.vx = 0;
        ship.vy = 0;
        return;
      }

      // --- DOCKING LOGIC ---
      if (ship.isDocking) {
        const stationId = `station_${ship.faction}`;
        const station = this.state.stations.get(stationId);
        if (station) {
          const dist = Math.sqrt((station.x - ship.x) ** 2 + (station.y - ship.y) ** 2);
          if (dist > 1500) {
            ship.isDocking = false;
            // console.log(`Ship ${ship.id} DOCKING CANCELLED (Too far)`);
          } else if (Date.now() - ship.dockingStartTime >= 5000) {
            ship.isDocking = false;
            ship.isDocked = true;
            ship.vx = 0;
            ship.vy = 0;
            ship.hull = ships.find(s => s.id === ship.shipClass)?.stats.hull || ship.hull;
            ship.armor = ships.find(s => s.id === ship.shipClass)?.stats.armor || ship.armor;
            // console.log(`Ship ${ship.id} DOCKING COMPLETE`);

            // Clear any projectile locks on this ship
            this.state.projectiles.forEach(proj => {
              if (proj.targetId === ship.id) {
                proj.targetId = "";
                // console.log(`Projectile ${proj.id} lost lock on docked ship ${ship.id}`);
              }
            });
          }
        } else {
          ship.isDocking = false;
        }
      }

      if (ship.isDocked) {
        ship.vx = 0;
        ship.vy = 0;
        // If they try to move, undock them
        if (player && (player.input.w || player.input.a || player.input.s || player.input.d)) {
          ship.isDocked = false;
          // console.log(`Ship ${ship.id} UNDOCKED (Input detected)`);
        }
        return;
      }

      // Find ship stats
      const shipSpec = ships.find(s => s.id === ship.shipClass) || ships[0];
      const maxSpeed = (shipSpec.stats.maxVelocity) / 60;
      const acceleration = (shipSpec.stats.acceleration) / 60;
      // Convert deg/sec to rad/tick: (degrees * PI/180) * (deltaTime in seconds)
      const rotationSpeed = (shipSpec.stats.angularVelocity) * (Math.PI / 180) * (deltaTime / 1000);
      const friction = 1.0; // Space is a vacuum; no passive friction. Only S (brakes) will slow you down.

      // Update angle
      if (player) {
          if (player.input.a) ship.angle -= rotationSpeed;
          if (player.input.d) ship.angle += rotationSpeed;
      }

      const facingX = Math.sin(ship.angle);
      const facingY = -Math.cos(ship.angle);

      // Update velocity
      if (player && player.input.w) {
        ship.vx += facingX * acceleration;
        ship.vy += facingY * acceleration;
      }

      // 1. Sideways (Lateral) Damping: reduces "icy" sliding.
      // High-speed interceptors feel this drift most when turning.
      const lateralDamping = shipSpec.stats.lateralDamping || 0.05;
      const rightX = -facingY;
      const rightY = facingX;
      const lateralVel = ship.vx * rightX + ship.vy * rightY;
      ship.vx -= rightX * lateralVel * lateralDamping;
      ship.vy -= rightY * lateralVel * lateralDamping;

      // 2. Braking (S key)
      if (player && player.input.s) {
        // Brake all momentum, not just forward.
        const brakingForce = acceleration * 1.5; // Reduced from 3x to 1.5x
        const currentSpeed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
        if (currentSpeed > 0) {
          const reduction = Math.min(brakingForce, currentSpeed);
          const ratio = (currentSpeed - reduction) / currentSpeed;
          ship.vx *= ratio;
          ship.vy *= ratio;
        }
      }

      // Apply friction
      ship.vx *= friction;
      ship.vy *= friction;

      // Cap speed
      const currentSpeed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
      if (currentSpeed > maxSpeed) {
        ship.vx = (ship.vx / currentSpeed) * maxSpeed;
        ship.vy = (ship.vy / currentSpeed) * maxSpeed;
      }

      // Update position
      ship.x += ship.vx;
      ship.y += ship.vy;

      // World wrapping (center at 0,0)
      if (ship.x < -worldHalfWidth) ship.x = worldHalfWidth;
      if (ship.x > worldHalfWidth) ship.x = -worldHalfWidth;
      if (ship.y < -worldHalfHeight) ship.y = worldHalfHeight;
      if (ship.y > worldHalfHeight) ship.y = -worldHalfHeight;

      if (player && ship.targetId && shipSpec.weapons && !ship.isDead) {
        const target = this.state.ships.get(ship.targetId) || 
                       this.state.stations.get(ship.targetId) ||
                       this.state.projectiles.get(ship.targetId);
        
        if (!target) {
            // Target is dead or gone, clear it
            ship.targetId = "";
        }

        if (target && !(target instanceof Ship && target.isDead)) {
          shipSpec.weapons.forEach((sw, i) => {
            if (!ship.weaponSlots[i]) return;

            // Use ship's specific weapon and level
            const wId = ship.equippedWeapons[i];
            const wLevel = ship.weaponLevels[i] || 1;
            
            if (!wId) return;

            const weaponDef = weapons.find(w => w.id === wId);
            if (!weaponDef) return;

            const lIdx = Math.max(0, wLevel - 1);
            const now = this.state.serverTime;
            const lastFire = ship.weaponLastFire.get(i.toString()) || 0;

            // Extract leveled stats
            const reload = Array.isArray(weaponDef.reload) ? weaponDef.reload[lIdx] : (weaponDef.reload as any || 1);
            const reloadMs = reload * 1000;

            if (now - lastFire >= reloadMs) {
              // Calculate world muzzle position
              const shipAngle = ship.angle || 0;
              const cosA = Math.cos(shipAngle);
              const sinA = Math.sin(shipAngle);
              const mX = -sw.mount.left;
              const mY = -sw.mount.front;
              const muzzleWorldX = ship.x + (mX * cosA - mY * sinA);
              const muzzleWorldY = ship.y + (mX * sinA + mY * cosA);

              // Distance check
              const dx = target.x - muzzleWorldX;
              const dy = target.y - muzzleWorldY;
              const distance = Math.sqrt(dx * dx + dy * dy);

              // Extract stats based on level
              const optRange = Array.isArray(weaponDef.optimalRange) ? weaponDef.optimalRange[lIdx] : (weaponDef.optimalRange || 500);
              const maxRange = Array.isArray(weaponDef.maxRange) ? weaponDef.maxRange[lIdx] : (weaponDef.maxRange || 1000);
              const minRange = Array.isArray(weaponDef.minRange) ? weaponDef.minRange[lIdx] : (weaponDef.minRange || 0);
              const minDmg = Array.isArray(weaponDef.minDamage) ? weaponDef.minDamage[lIdx] : 10;
              const maxDmg = Array.isArray(weaponDef.maxDamage) ? weaponDef.maxDamage[lIdx] : 10;
              const accuracy = Array.isArray(weaponDef.accuracy) ? weaponDef.accuracy[lIdx] : (weaponDef.accuracy || 400);
              const armorPiercing = Array.isArray(weaponDef.armorPiercing) ? weaponDef.armorPiercing[lIdx] : (weaponDef.armorPiercing || 0);
              const fov = Array.isArray(weaponDef.firingArc) ? weaponDef.firingArc[lIdx] : (weaponDef.firingArc || 45);

              if (distance >= minRange && distance <= maxRange) {
                // Angle check
                const weaponWorldAngle = shipAngle + (sw.mount.rotation * Math.PI / 180) - (Math.PI / 2);
                const angleToTarget = Math.atan2(dy, dx);

                let angleDiff = Math.atan2(Math.sin(angleToTarget - weaponWorldAngle), Math.cos(angleToTarget - weaponWorldAngle));

                const halfFovRad = (fov / 2) * Math.PI / 180;
                if (Math.abs(angleDiff) <= halfFovRad) {
                  // FIRE!
                  ship.weaponLastFire.set(i.toString(), now);

                  // 1. ROLL TO HIT (Autocannons only)
                  if (weaponDef.type === "Autocannon") {
                    const didHit = rollHitChance({
                      accuracy,
                      optimalRange: optRange,
                      maxRange,
                      distance,
                      evasion: 0
                    });

                    if (!didHit) {
                      return;
                    }

                    // console.log(`Ship ${ship.id} HIT ${target.id}`);
                    // 2. APPLY DAMAGE (randomize between min and max)
                    const baseDmg = minDmg + Math.random() * (maxDmg - minDmg);
                    const hitResult = calculateHit({
                      baseDamage: baseDmg,
                      armor: (target as any).armor || 0,
                      armorPiercing: armorPiercing
                    });

                    target.hull -= hitResult.finalHullDamage;
                    if (target.hull <= 0) {
                      if (this.state.ships.has(target.id)) {
                        this.handleShipDeath(target as Ship);
                        player.tylium += 1500;
                        // console.log(`Player ${player.id} awarded 1500 Tylium for destroying Ship ${target.id}`);
                      } else if (this.state.projectiles.has(target.id)) {
                        this.state.projectiles.delete(target.id);
                        player.tylium += 100;
                        // console.log(`Player ${player.id} awarded 100 Tylium for destroying Projectile ${target.id}`);
                      } else if (this.state.stations.has(target.id)) {
                        // STATION DESTROYED! 
                        const stationTarget = target as Station;
                        // console.log(`STATION ${target.id} DESTROYED!`);
                        this.state.winner = (stationTarget.faction === 'humans') ? 'martians' : 'humans';
                        player.tylium += 10000;
                        // console.log(`Player ${player.id} awarded 10000 Tylium for destroying Station ${target.id}`);
                        stationTarget.hull = stationTarget.maxHull;
                      }
                    }
                  } else if(weaponDef.type === "Missile") {
                    // SPAWN MISSILE
                    const projectile = new Projectile();
                    projectile.id = `M_${Math.random().toString(8).substring(2, 9)}`;
                    projectile.type = "missile";
                    projectile.faction = ship.faction;
                    projectile.ownerId = ship.id;
                    projectile.targetId = ship.targetId;
                    projectile.x = muzzleWorldX;
                    projectile.y = muzzleWorldY;
                    // Start with ship's heading + mount rotation
                    projectile.angle = shipAngle + (sw.mount.rotation * Math.PI / 180);

                    // Initialize physics stats from weapon definition
                    projectile.speed = Array.isArray(weaponDef.projectileSpeed) ? weaponDef.projectileSpeed[lIdx] : (weaponDef.projectileSpeed || 10);
                    projectile.acceleration = Array.isArray(weaponDef.projectileAcceleration) ? weaponDef.projectileAcceleration[lIdx] : (weaponDef.projectileAcceleration || 0.2);
                    projectile.maxSpeed = Array.isArray(weaponDef.projectileMaxSpeed) ? weaponDef.projectileMaxSpeed[lIdx] : (weaponDef.projectileMaxSpeed || 15);
                    projectile.turnSpeed = Array.isArray(weaponDef.projectileAngularVelocity) ? weaponDef.projectileAngularVelocity[lIdx] : (weaponDef.projectileAngularVelocity || 0.1);

                    projectile.damage = minDmg + Math.random() * (maxDmg - minDmg);
                    projectile.armorPiercing = armorPiercing;
                    projectile.hull = 30; // Missiles are fragile
                    projectile.maxHull = 30;
                    projectile.createdAt = now;
                    
                    const ticksToTarget = (maxRange / projectile.maxSpeed) * 1.5;
                    projectile.lifespan = Math.max(5000, ticksToTarget * 50);

                    this.state.projectiles.set(projectile.id, projectile);
                    // console.log(`Ship ${ship.id} launched missile at ${target.id}`);
                  }
                }
              }
            }
          });
        }
      }
    });

    // 4. PROJECTILE UPDATE LOGIC
    this.state.projectiles.forEach((proj, id) => {
      const now = this.state.serverTime;
      const age = now - proj.createdAt;

      if (age > proj.lifespan) {
        this.state.projectiles.delete(id);
        return;
      }

      // Seeking logic
      if ((proj.type === "missile" || proj.type === "drone") && proj.targetId) {
        const target = this.state.ships.get(proj.targetId) || this.state.stations.get(proj.targetId) || this.state.projectiles.get(proj.targetId);
        if (target) {
          const dx = (target as any).x - proj.x;
          const dy = (target as any).y - proj.y;
          const targetAngle = Math.atan2(dy, dx);

          // Projectile angle is in radians, facing direction.
          // Move forwards based on proj.angle

          // Smoother turning towards target
          let angleDiff = Math.atan2(Math.sin(targetAngle - (proj.angle - Math.PI / 2)), Math.cos(targetAngle - (proj.angle - Math.PI / 2)));

          // Use turnSpeed from schema
          proj.angle += Math.max(-proj.turnSpeed, Math.min(proj.turnSpeed, angleDiff));

          // Lost lock if target docked
          if (target instanceof Ship && target.isDocked) {
            proj.targetId = "";
            // console.log(`Projectile ${proj.id} lost lock - target docked`);
          }
        } else {
          // Target no longer exists
          proj.targetId = "";
        }
      }

      // 4b. ACCELERATION & MOVEMENT
      if (proj.speed < proj.maxSpeed) {
        proj.speed = Math.min(proj.maxSpeed, proj.speed + proj.acceleration);
      }

      // Movement (Independent of whether it is seeking or not)
      proj.x += Math.sin(proj.angle) * proj.speed;
      proj.y -= Math.cos(proj.angle) * proj.speed;

      // Collision check
      // --- BROAD COLLISION CHECK ---
      // Drones and Missiles explode on contact with any enemy player or station
      if (proj.type === "drone" || proj.type === "missile") {
        let hitDetected = false;

        // Check ships
        this.state.ships.forEach((ship) => {
          if (hitDetected || ship.isDead || ship.faction === proj.faction || ship.isDocked) return;
          
          const dx = ship.x - proj.x;
          const dy = ship.y - proj.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          
          if (dist < 40) { // Impact radius for ships
            this.processProjectileHit(proj, ship);
            hitDetected = true;
          }
        });

        // Check stations
        if (!hitDetected) {
          this.state.stations.forEach((s) => {
            if (hitDetected || s.faction === proj.faction) return;
            
            const dx = s.x - proj.x;
            const dy = s.y - proj.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < 300) { // Large impact radius for stations
              this.processProjectileHit(proj, s);
              hitDetected = true;
            }
          });
        }

        // If it had a targetId that was a projectile, check that too
        if (!hitDetected && proj.targetId) {
            const potentialTarget = this.state.projectiles.get(proj.targetId);
            if (potentialTarget) {
                const dx = potentialTarget.x - proj.x;
                const dy = potentialTarget.y - proj.y;
                if (Math.sqrt(dx*dx + dy*dy) < 30) {
                    const attacker = this.state.players.get(proj.ownerId);
                    if (attacker) {
                        attacker.tylium += 100;
                        // console.log(`Player ${attacker.id} awarded 100 Tylium for intercepting Projectile ${potentialTarget.id}`);
                    }
                    this.state.projectiles.delete(potentialTarget.id);
                    this.state.projectiles.delete(proj.id);
                    hitDetected = true;
                    // console.log(`Projectile ${proj.id} intercepted ${potentialTarget.id}`);
                }
            }
        }
      }
    });

    // 5. STATION AUTONOMOUS LOGIC
    this.state.stations.forEach((station) => {
      const now = this.state.serverTime;
      
      // Centralized Targeting Logic
      let currentTarget: any = null;
      if (station.targetId) {
        currentTarget = this.state.ships.get(station.targetId) || this.state.projectiles.get(station.targetId);
        // Validate target
        if (currentTarget) {
           const dist = Math.sqrt((currentTarget.x - station.x) ** 2 + (currentTarget.y - station.y) ** 2);
           if (currentTarget.isDead || currentTarget.isDocked || dist > 2500) {
             station.targetId = "";
             currentTarget = null;
           }
        } else {
          station.targetId = "";
        }
      }

      if (!currentTarget) {
        let nearest: any = null;
        let minDist = 2500; // Search range from center

        this.state.ships.forEach((ship) => {
          if (ship.faction === station.faction || ship.isDead || ship.isDocked) return;
          const dist = Math.sqrt((ship.x - station.x) ** 2 + (ship.y - station.y) ** 2);
          if (dist < minDist) {
            minDist = dist;
            nearest = ship;
          }
        });

        this.state.projectiles.forEach((proj) => {
          if ((proj.type !== "drone" && proj.type !== "missile") || proj.faction === station.faction) return;
          const dist = Math.sqrt((proj.x - station.x) ** 2 + (proj.y - station.y) ** 2);
          if (dist < minDist) {
            minDist = dist;
            nearest = proj;
          }
        });
        
        if (nearest) {
          station.targetId = nearest.id;
          currentTarget = nearest;
        }
      }

      // Firing logic for corner turrets
      const turretWeapons = [
        { type: "sta-b1-sentinel", x: -station.width / 2, y: -station.height / 2 },
        { type: "sta-m1-goliath", x: -station.width / 2, y: -station.height / 2 },
        { type: "sta-b1-sentinel", x: station.width / 2, y: -station.height / 2 },
        { type: "sta-m1-goliath", x: station.width / 2, y: -station.height / 2 },
        { type: "sta-b1-sentinel", x: -station.width / 4, y: station.height / 2 },
        { type: "sta-m1-goliath", x: -station.width / 4, y: station.height / 2 },
        { type: "sta-b1-sentinel", x: station.width / 4, y: station.height / 2 },
        { type: "sta-m1-goliath", x: station.width / 4, y: station.height / 2 }
      ];

      if (currentTarget) {
        turretWeapons.forEach((tw, idx) => {
          const weaponDef = weapons.find(w => w.id === tw.type);
          if (!weaponDef) return;

          const turretId = `${station.id}_t${idx}`;
          const lastFire = station.weaponLastFire.get(turretId) || 0;
          const reload = Array.isArray(weaponDef.reload) ? weaponDef.reload[0] : (weaponDef.reload as any || 1);
          const reloadMs = reload * 1000;

          if (now - lastFire >= reloadMs) {
            const distToTarget = Math.sqrt((currentTarget.x - station.x) ** 2 + (currentTarget.y - station.y) ** 2);
            const dx = currentTarget.x - station.x;
            const dy = currentTarget.y - station.y;
            const angle = Math.atan2(dy, dx) + Math.PI / 2;

            // FIRE!
            station.weaponLastFire.set(turretId, now);

            if (weaponDef.type === "Autocannon") {
              const optRange = Array.isArray(weaponDef.optimalRange) ? weaponDef.optimalRange[0] : (weaponDef.optimalRange as any || 500);
              const maxRange = Array.isArray(weaponDef.maxRange) ? weaponDef.maxRange[0] : (weaponDef.maxRange as any || 1000);
              const accuracy = Array.isArray(weaponDef.accuracy) ? weaponDef.accuracy[0] : (weaponDef.accuracy as any || 400);
              const didHit = rollHitChance({
                accuracy,
                optimalRange: optRange,
                maxRange,
                distance: distToTarget,
                evasion: 0
              });

              if (didHit) {
                const minDmg = Array.isArray(weaponDef.minDamage) ? weaponDef.minDamage[0] : (weaponDef.minDamage as any || 10);
                const maxDmg = Array.isArray(weaponDef.maxDamage) ? weaponDef.maxDamage[0] : (weaponDef.maxDamage as any || 20);
                const armorPiercing = Array.isArray(weaponDef.armorPiercing) ? weaponDef.armorPiercing[0] : (weaponDef.armorPiercing as any || 0);
                const baseDmg = minDmg + Math.random() * (maxDmg - minDmg);
                const hitResult = calculateHit({
                  baseDamage: baseDmg,
                  armor: (currentTarget as any).armor || 0,
                  armorPiercing: armorPiercing
                });
                currentTarget.hull -= hitResult.finalHullDamage;
                if (currentTarget.hull <= 0) {
                  if (this.state.ships.has(currentTarget.id)) {
                    this.handleShipDeath(currentTarget as Ship);
                  } else {
                    this.state.projectiles.delete(currentTarget.id);
                  }
                  station.targetId = "";
                }
              }
            } else if (weaponDef.type === "Missile") {
              const maxRange = Array.isArray(weaponDef.maxRange) ? weaponDef.maxRange[0] : (weaponDef.maxRange as any || 1000);
              const armorPiercing = Array.isArray(weaponDef.armorPiercing) ? weaponDef.armorPiercing[0] : (weaponDef.armorPiercing as any || 0);
              const minDmg = Array.isArray(weaponDef.minDamage) ? weaponDef.minDamage[0] : (weaponDef.minDamage as any || 10);
              const maxDmg = Array.isArray(weaponDef.maxDamage) ? weaponDef.maxDamage[0] : (weaponDef.maxDamage as any || 20);

              const projectile = new Projectile();
              projectile.id = `M_${Math.random().toString(8).substring(2, 9)}`;
              projectile.type = "missile";
              projectile.faction = station.faction;
              projectile.ownerId = station.id;
              projectile.targetId = currentTarget.id;
              projectile.x = station.x;
              projectile.y = station.y;
              projectile.angle = angle;

              projectile.speed = Array.isArray(weaponDef.projectileSpeed) ? weaponDef.projectileSpeed[0] : (weaponDef.projectileSpeed as any || 4);
              projectile.acceleration = Array.isArray(weaponDef.projectileAcceleration) ? weaponDef.projectileAcceleration[0] : (weaponDef.projectileAcceleration as any || 0.15);
              projectile.maxSpeed = Array.isArray(weaponDef.projectileMaxSpeed) ? weaponDef.projectileMaxSpeed[0] : (weaponDef.projectileMaxSpeed as any || 12);
              projectile.turnSpeed = Array.isArray(weaponDef.projectileAngularVelocity) ? weaponDef.projectileAngularVelocity[0] : (weaponDef.projectileAngularVelocity as any || 0.1);
              
              projectile.damage = minDmg + Math.random() * (maxDmg - minDmg);
              projectile.armorPiercing = armorPiercing;
              projectile.hull = 30; 
              projectile.maxHull = 30;
              projectile.createdAt = now;

              const ticksToTarget = (maxRange / projectile.maxSpeed) * 1.5;
              projectile.lifespan = Math.max(5000, ticksToTarget * 50);

              this.state.projectiles.set(projectile.id, projectile);
            }
          }
        });
      }

      // --- DRONE SWARM LOGIC ---
      if (now >= station.droneNextWaveTime) {
        station.droneSpawnsRemaining = 6;
        station.droneNextWaveTime = now + 30000; // Next wave in 1 minute
        station.droneNextSpawnTime = now;
      }

      if (station.droneSpawnsRemaining > 0 && now >= station.droneNextSpawnTime) {
        // Find opposite station
        let targetStation: Station | null = null;
        this.state.stations.forEach((other) => {
          if (other.faction !== station.faction) {
            targetStation = other;
          }
        });

        if (targetStation) {
          station.droneSpawnsRemaining--;
          station.droneNextSpawnTime = now + 1000; // 1 second apart

          const drone = new Projectile();

          drone.id = `D_${Date.now() % 3600000}_${station.droneSpawnsRemaining}`;

          drone.type = "drone";
          drone.faction = station.faction;
          drone.ownerId = station.id;
          drone.targetId = (targetStation as any).id;
          
          // Spawn at random edge of station
          const side = Math.random() > 0.5 ? 1 : -1;
          drone.x = station.x + (side * (station.width / 2 + 50));
          drone.y = station.y + (Math.random() - 0.5) * station.height;
          
          // Face target
          const dx = targetStation.x - drone.x;
          const dy = targetStation.y - drone.y;
          drone.angle = Math.atan2(dy, dx) + Math.PI / 2;
          
          drone.speed = 2; // Slow travel
          drone.acceleration = 0;
          drone.maxSpeed = 2;
          drone.turnSpeed = 0.05; // Gentle seeking
          
          drone.damage = 600; // Reduced power but many drones
          drone.armorPiercing = 40;
          drone.hull = 60; // Destructible
          drone.maxHull = 60;
          drone.armor = 5;
          drone.createdAt = now;
          drone.lifespan = 3600000; // 1 hour (plenty of time to travel)

          this.state.projectiles.set(drone.id, drone);
          // console.log(`STATION ${station.id} launched DRONE at ${drone.targetId}`);
        }
      }
    });
  }

  private processProjectileHit(proj: Projectile, target: any) {
    const hitResult = calculateHit({
      baseDamage: proj.damage,
      armor: target.armor || 0,
      armorPiercing: proj.armorPiercing || 0
    });

    target.hull -= hitResult.finalHullDamage;
    // console.log(`${proj.type} hit ${target.id} for ${hitResult.finalHullDamage.toFixed(1)}`);

    if (target.hull <= 0) {
      if (this.state.ships.has(target.id)) {
        const targetShip = target as Ship;
        this.handleShipDeath(targetShip);
        
        const attackerShip = this.state.ships.get(proj.ownerId);
        if (attackerShip) {
            const attackerPlayer = this.state.players.get(attackerShip.ownerId);
            if (attackerPlayer) {
              attackerPlayer.tylium += 1500;
              // console.log(`Player ${attackerPlayer.id} awarded 1500 Tylium for destroying Ship ${target.id} with ${proj.type}`);
            }
        }
      } else if (this.state.stations.has(target.id)) {
        const station = target as Station;
        // console.log(`STATION ${target.id} DESTROYED by ${proj.ownerId}!`);
        this.triggerGameOver((station.faction === 'humans') ? 'martians' : 'humans');
        
        const attackerShip = this.state.ships.get(proj.ownerId);
        if (attackerShip) {
            const attackerPlayer = this.state.players.get(attackerShip.ownerId);
            if (attackerPlayer) {
              attackerPlayer.tylium += 10000;
              // console.log(`Player ${attackerPlayer.id} awarded 10000 Tylium for destroying Station ${target.id}`);
            }
        }
      }
    }
    
    this.state.projectiles.delete(proj.id);
  }

  private triggerGameOver(winner: string) {
    if (this.state.gameStatus === "gameover") return;
    
    // Lock the room so no one else can join
    this.lock();

    this.state.winner = winner;
    this.state.gameStatus = "gameover";
    this.state.gameOverTime = this.state.serverTime + 60000; // 60s from now

    // console.log(`GAME OVER! Winner: ${winner}. Room will be disposed in 60s.`);

    // Immediately create a new Sector 1
    matchMaker.create("my_room", { name: "Sector 1" }).then(room => {
        // console.log("Replacement Sector 1 created:", room.roomId);
    }).catch(e => {
        console.error("Failed to create replacement Sector 1:", e);
    });

    this.clock.setTimeout(() => {
      // console.log("60 seconds elapsed. Disconnecting all clients and disposing room.");
      this.disconnect();
    }, 60000);
  }

  handleShipDeath(ship: Ship) {
    if (ship.isDead) return;
    // console.log(`Ship ${ship.id} destroyed!`);
    ship.isDead = true;
    ship.hull = 0;
    ship.vx = 0;
    ship.vy = 0;

    const owner = this.state.players.get(ship.ownerId);
    ship.targetId = ""; // No longer on owner

    // Retarget or clear projectiles targeting this ship
    this.state.projectiles.forEach(proj => {
      if (proj.targetId === ship.id) {
        proj.targetId = ""; // Fly straight
      }
    });
  }

  respawnPlayer(player: Player) {
    // console.log(`Respawning player ${player.id}...`);
    const ship = this.state.ships.get(player.shipId);
    if (!ship) return;

    const shipSpec = ships.find(s => s.id === ship.shipClass) || ships[0];
    const stationId = `station_${ship.faction}`;
    const station = this.state.stations.get(stationId);

    if (station) {
      ship.x = station.x;
      ship.y = station.y;
      ship.isDocked = true;
    } else {
      const faction = this.state.factions.get(ship.faction);
      const angle = Math.random() * Math.PI * 2;
      const spawnRadius = 500;
      const spawnX = faction ? faction.spawnX : 0;
      const spawnY = faction ? faction.spawnY : 0;
      ship.x = spawnX + Math.cos(angle) * spawnRadius;
      ship.y = spawnY + Math.sin(angle) * spawnRadius;
      ship.isDocked = false;
    }

    ship.vx = 0;
    ship.vy = 0;
    ship.angle = 0;
    ship.hull = shipSpec.stats.hull;
    ship.armor = shipSpec.stats.armor;
    ship.isDead = false;
    ship.targetId = "";
    
    // Maintain weapons on respawn
    if (ship.equippedWeapons.length === 0 && shipSpec.weapons) {
      shipSpec.weapons.forEach((w, i) => {
        ship.equippedWeapons.push(w.weapon.id);
        ship.weaponLevels.push(w.weapon.level || 1);
        if (ship.weaponSlots.length <= i) ship.weaponSlots.push(true);
      });
    }
  }

  async onAuth(client: Client, options: any) {
    if (!options.token) return { username: `Guest-${client.sessionId}` }; 
    
    try {
      const decoded = jwt.verify(options.token, process.env.JWT_SECRET || "secret");
      return decoded;
    } catch (e) {
      console.error("Auth failed:", e);
      return false;
    }
  }

  onJoin(client: Client, options: any, auth: any) {
    const factionId = options.faction || "humans";
    const factionObj = this.state.factions.get(factionId);
    const shipSpecObj = ships.find(s => s.id === options.ship) || ships[0];
    // console.log(client.sessionId, "joined!");
    const player = new Player();
    player.id = client.sessionId;
    player.name = auth?.name || options.name || `Pilot ${client.sessionId.substring(0, 4)}`;
    
    // Choose faction (respect requested, fallback to balance)
    let assignedFaction = options.faction;
    const isValidFaction = assignedFaction && this.state.factions.has(assignedFaction);

    if (!isValidFaction) {
      let humanCount = 0;
      let martianCount = 0;
      this.state.players.forEach(p => {
          const pShip = this.state.ships.get(p.shipId);
          if (pShip) {
              if (pShip.faction === 'humans') humanCount++;
              else if (pShip.faction === 'martians') martianCount++;
          }
      });
      assignedFaction = (humanCount <= martianCount) ? 'humans' : 'martians';
    }
    
    // Create Ship
    const ship = new Ship();
    ship.id = `ship_${client.sessionId}`;
    ship.ownerId = client.sessionId;
    ship.faction = assignedFaction;
    ship.shipClass = shipSpecObj.id;

    const station = this.state.stations.get(`station_${assignedFaction}`);
    const spawnAngle = Math.random() * Math.PI * 2;
    ship.x = (station?.x || 0) + Math.cos(spawnAngle) * 1000;
    ship.y = (station?.y || 0) + Math.sin(spawnAngle) * 1000;

    ship.angle = (assignedFaction === 'humans') ? Math.PI / 2 : -Math.PI / 2;
    ship.vx = 0;
    ship.vy = 0;
    ship.hull = shipSpecObj.stats.hull;
    ship.armor = shipSpecObj.stats.armor;
    
    if (shipSpecObj.weapons) {
      shipSpecObj.weapons.forEach((w, i) => {
        ship.weaponSlots.push(true);
        ship.equippedWeapons.push(w.weapon.id);
        ship.weaponLevels.push(w.weapon.level || 1);
        player.ownedWeapons.set(w.weapon.id, w.weapon.level || 1);
      });
    }

    player.shipId = ship.id;

    this.state.ships.set(ship.id, ship);
    this.state.players.set(client.sessionId, player);
    
    this.updateMetadata();
  }

  async onLeave(client: Client, code: number) {
    // console.log(client.sessionId, "left!");
    const player = this.state.players.get(client.sessionId);
    if (player) {
      player.input.d = false;
      const ship = this.state.ships.get(player.shipId);
      if (ship) ship.targetId = ""; // Optional: stop firing
    }
    
    try {
      // Leave the ship ingame for 10 seconds to allow for reconnection or grace period
      await this.allowReconnection(client, 10);
      // console.log(`Player ${client.sessionId} reconnected!`);
      if (player) player.connected = true;
      
    } catch (e) {
      // console.log(`Player ${client.sessionId} cleanup after 10s grace period.`);
      const p = this.state.players.get(client.sessionId);
      if (p) {
        this.state.ships.delete(p.shipId);
        this.state.players.delete(client.sessionId);
      }
      this.updateMetadata();
    }
  }

  onDispose() {
    /**
     * Called when the room is disposed.
     */
    // console.log("room", this.roomId, "disposing...");
  }

  updateMetadata() {
    const counts: any = {};
    this.state.ships.forEach(s => {
      counts[s.faction] = (counts[s.faction] || 0) + 1;
    });
    this.setMetadata({ factionCounts: counts });
  }

}
