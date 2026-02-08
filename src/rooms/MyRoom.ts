import { Room, Client, CloseCode } from "colyseus";
import { MyRoomState } from "./schema/MyRoomState.js";
import { Player } from "./schema/Player.js";
import { Station } from "./schema/Station.js";
import { Projectile } from "./schema/Projectile.js";
import { Faction as FactionSchema } from "./schema/Faction.js";
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

  onCreate(options: any) {
    console.log("Room created with dimensions:", this.state.width, "x", this.state.height);
    this.setMetadata({ 
      name: options.name || "Default Sector",
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

      // 2. Create the associated base station
      const station = new Station();
      station.id = `base_${f.id}`;
      station.faction = f.id;
      station.x = f.spawn.x;
      station.y = f.spawn.y;
      station.width = 500;
      station.height = 70;
      station.angle = 0; // Stationary for now
      station.droneNextWaveTime = Date.now(); // Start first wave immediately
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

      let nearest: any = null;
      let minDist = Infinity;

      this.state.players.forEach((other) => {
        if (other.id === client.sessionId) return;
        if (other.faction === player.faction || other.isDead) return;

        const dist = Math.sqrt((other.x - player.x) ** 2 + (other.y - player.y) ** 2);
        if (dist < minDist) {
          minDist = dist;
          nearest = other;
        }
      });

      // Include targetable projectiles (drones/missiles)
      this.state.projectiles.forEach((proj) => {
        if (proj.faction === player.faction) return;
        // Only target drones or missiles (standard bullets/beams aren't targetable)
        if (proj.type !== "drone" && proj.type !== "missile") return;
        
        const dist = Math.sqrt((proj.x - player.x) ** 2 + (proj.y - player.y) ** 2);
        if (dist < minDist) {
          minDist = dist;
          nearest = proj;
        }
      });

      player.targetId = nearest ? (nearest as any).id : "";
      console.log(`Player ${client.sessionId} targeting enemy ${player.targetId || 'NOTHING'}`);
    });

    this.onMessage("target-object", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      let nearest: any = null;
      let minDist = Infinity;

      // Scan both players and stations
      this.state.players.forEach((other) => {
        if (other.id === client.sessionId || other.isDead) return;
        const dist = Math.sqrt((other.x - player.x) ** 2 + (other.y - player.y) ** 2);
        if (dist < minDist) {
          minDist = dist;
          nearest = other;
        }
      });

      this.state.stations.forEach((station) => {
        const dist = Math.sqrt((station.x - player.x) ** 2 + (station.y - player.y) ** 2);
        if (dist < minDist) {
          minDist = dist;
          nearest = station;
        }
      });

      this.state.projectiles.forEach((proj) => {
        // Targetable objects include drones and missiles
        if (proj.type !== "drone" && proj.type !== "missile") return;
        const dist = Math.sqrt((proj.x - player.x) ** 2 + (proj.y - player.y) ** 2);
        if (dist < minDist) {
          minDist = dist;
          nearest = proj;
        }
      });

      player.targetId = nearest ? (nearest as any).id : "";
      console.log(`Player ${client.sessionId} targeting object ${player.targetId || 'NOTHING'}`);
    });

    this.onMessage("input", (client, input) => {
      const player = this.state.players.get(client.sessionId);
      if (player && !player.isDead) {
        // Explicitly map inputs to ensure reference stays valid
        player.input.w = !!input.w;
        player.input.a = !!input.a;
        player.input.s = !!input.s;
        player.input.d = !!input.d;
      }
    });

    this.onMessage("respawn", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (player && player.isDead) {
        this.respawnPlayer(player);
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
    this.state.players.forEach((player) => {
      player.heartbeat++;
      
      if (player.isDead) {
        player.vx = 0;
        player.vy = 0;
        return;
      }

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
      if (player.targetId && shipSpec.weapons && !player.isDead) {
        const target = this.state.players.get(player.targetId) || 
                       this.state.stations.get(player.targetId) ||
                       this.state.projectiles.get(player.targetId);
        
        if (!target) {
            // console.log(`Player ${player.id} has targetId ${player.targetId} but NO TARGET FOUND`);
        }

        if (target && !(target instanceof Player && target.isDead)) {
          shipSpec.weapons.forEach((sw, i) => {
            if (!player.weaponSlots[i]) return;

            // Normalize weapon ID and level
            const wId = typeof sw.weapon === 'string' ? sw.weapon : sw.weapon.id;
            const wLevel = typeof sw.weapon === 'string' ? 1 : (sw.weapon.level || 1);

            const weaponDef = weapons.find(w => w.id === wId);
            if (!weaponDef) return;

            const lIdx = Math.max(0, wLevel - 1);
            const now = this.state.serverTime;
            const lastFire = player.weaponLastFire.get(i.toString()) || 0;

            // Extract leveled stats
            const reload = Array.isArray(weaponDef.reload) ? weaponDef.reload[lIdx] : (weaponDef.reload as any || 1);
            const reloadMs = reload * 1000;

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
                  // console.log(`Player ${player.id} FIRING at ${target.id} (Dist: ${distance.toFixed(1)}, Range: ${minRange}-${maxRange})`);
                  // FIRE!
                  player.weaponLastFire.set(i.toString(), now);

                  // 1. ROLL TO HIT (Autocannons only)
                  if (weaponDef.type !== "Missile") {
                    const didHit = rollHitChance({
                      accuracy,
                      optimalRange: optRange,
                      maxRange,
                      distance,
                      evasion: 0 // Placeholder until evasion is added to schema
                    });

                    if (!didHit) {
                      // console.log(`Player ${player.id} MISSED ${target.id}`);
                      return;
                    }

                    console.log(`Player ${player.id} HIT ${target.id} (Type: ${target.constructor.name})`);
                    // 2. APPLY DAMAGE (randomize between min and max)
                    const baseDmg = minDmg + Math.random() * (maxDmg - minDmg);
                    const hitResult = calculateHit({
                      baseDamage: baseDmg,
                      armor: (target as any).armor || 0,
                      armorPiercing: armorPiercing
                    });

                    target.hull -= hitResult.finalHullDamage;
                    if (target.hull <= 0) {
                      if (this.state.players.has(target.id)) {
                        this.handlePlayerDeath(target as Player);
                      } else if (this.state.projectiles.has(target.id)) {
                        this.state.projectiles.delete(target.id);
                        console.log(`Player ${player.id} destroyed Projectile ${target.id}`);
                      } else if (this.state.stations.has(target.id)) {
                        // STATION DESTROYED! 
                        const stationTarget = target as Station;
                        console.log(`STATION ${target.id} DESTROYED!`);
                        this.state.winner = (stationTarget.faction === 'humans') ? 'martians' : 'humans';
                        stationTarget.hull = stationTarget.maxHull;
                      }
                    }
                  } else {
                    // SPAWN MISSILE
                    const projectile = new Projectile();
                    projectile.id = Math.random().toString(36).substring(2, 11);
                    projectile.type = "missile";
                    projectile.faction = player.faction;
                    projectile.ownerId = player.id;
                    projectile.targetId = player.targetId;
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
                    
                    // Dynamic lifespan: enough time to reach maxRange at maxSpeed + buffer
                    // Assuming average 50ms simulation interval
                    const ticksToTarget = (maxRange / projectile.maxSpeed) * 1.5;
                    projectile.lifespan = Math.max(5000, ticksToTarget * 50);

                    this.state.projectiles.set(projectile.id, projectile);
                    console.log(`Player ${player.id} launched missile at ${target.id}`);
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
        const target = this.state.players.get(proj.targetId) || this.state.stations.get(proj.targetId) || this.state.projectiles.get(proj.targetId);
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
      if (proj.targetId) {
        const target = this.state.players.get(proj.targetId) || this.state.stations.get(proj.targetId) || this.state.projectiles.get(proj.targetId);
        if (target) {
          const dx = (target as any).x - proj.x;
          const dy = (target as any).y - proj.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 30) { // Impact radius
            const hitResult = calculateHit({
              baseDamage: proj.damage,
              armor: (target as any).armor || 0,
              armorPiercing: proj.armorPiercing
            });

            (target as any).hull -= hitResult.finalHullDamage;
            console.log(`Missile hit ${proj.targetId} for ${hitResult.finalHullDamage.toFixed(1)}`);

            if ((target as any).hull <= 0) {
              if (this.state.players.has(proj.targetId)) {
                this.handlePlayerDeath(target as any);
              } else if (this.state.projectiles.has(proj.targetId)) {
                this.state.projectiles.delete(proj.targetId);
              } else {
                // Station destroyed? Reset hull
                const station = target as Station;
                station.hull = station.maxHull;
                console.log(`STATION ${proj.targetId} DESTROYED!`);
              }
            }
            this.state.projectiles.delete(id);
          }
        }
      }
    });

    // 5. STATION AUTONOMOUS LOGIC
    this.state.stations.forEach((station) => {
      // Firing logic for corner turrets
      const turretWeapons = [
        { type: "sta-b1-sentinel", x: -250, y: -35 }, // TL AC
        { type: "sta-m1-goliath", x: -250, y: -35 },  // TL Missile
        { type: "sta-b1-sentinel", x: 250, y: -35 },  // TR AC
        { type: "sta-m1-goliath", x: 250, y: -35 },   // TR Missile
        { type: "sta-b1-sentinel", x: -250, y: 35 },  // BL AC
        { type: "sta-m1-goliath", x: -250, y: 35 },   // BL Missile
        { type: "sta-b1-sentinel", x: 250, y: 35 },   // BR AC
        { type: "sta-m1-goliath", x: 250, y: 35 }     // BR Missile
      ];

      turretWeapons.forEach((tw, idx) => {
        const weaponDef = weapons.find(w => w.id === tw.type);
        if (!weaponDef) return;

        const turretId = `${station.id}_t${idx}`;
        const now = this.state.serverTime;
        const lastFire = station.weaponLastFire.get(turretId) || 0;
        const reload = Array.isArray(weaponDef.reload) ? weaponDef.reload[0] : (weaponDef.reload as any || 1);
        const reloadMs = reload * 1000;

        if (now - lastFire >= reloadMs) {
          // Find nearest enemy player or drone
          let nearest: any = null;
          let minDist = Infinity;

          this.state.players.forEach((p) => {
            if (p.faction === station.faction || p.isDead) return;
            const dist = Math.sqrt((p.x - (station.x + tw.x)) ** 2 + (p.y - (station.y + tw.y)) ** 2);
            if (dist < minDist) {
              minDist = dist;
              nearest = p;
            }
          });

          this.state.projectiles.forEach((proj) => {
            if ((proj.type !== "drone" && proj.type !== "missile") || proj.faction === station.faction) return;
            const dist = Math.sqrt((proj.x - (station.x + tw.x)) ** 2 + (proj.y - (station.y + tw.y)) ** 2);
            if (dist < minDist) {
              minDist = dist;
              nearest = proj;
            }
          });

          // Extract stats (Station weapons are currently level 1 equivalent)
          const minRange = Array.isArray(weaponDef.minRange) ? weaponDef.minRange[0] : (weaponDef.minRange as any || 0);
          const maxRange = Array.isArray(weaponDef.maxRange) ? weaponDef.maxRange[0] : (weaponDef.maxRange as any || 1000);
          const optRange = Array.isArray(weaponDef.optimalRange) ? weaponDef.optimalRange[0] : (weaponDef.optimalRange as any || 500);
          const accuracy = Array.isArray(weaponDef.accuracy) ? weaponDef.accuracy[0] : (weaponDef.accuracy as any || 400);
          const minDmg = Array.isArray(weaponDef.minDamage) ? weaponDef.minDamage[0] : (weaponDef.minDamage as any || 10);
          const maxDmg = Array.isArray(weaponDef.maxDamage) ? weaponDef.maxDamage[0] : (weaponDef.maxDamage as any || 20);
          const armorPiercing = Array.isArray(weaponDef.armorPiercing) ? weaponDef.armorPiercing[0] : (weaponDef.armorPiercing as any || 0);

          if (nearest && minDist >= minRange && minDist <= maxRange) {
            // FIRE!
            station.weaponLastFire.set(turretId, now);
            const dx = nearest.x - (station.x + tw.x);
            const dy = nearest.y - (station.y + tw.y);
            // Weapon angle faces target
            const angle = Math.atan2(dy, dx) + Math.PI / 2;

            if (weaponDef.type !== "Missile") {
              const didHit = rollHitChance({
                accuracy,
                optimalRange: optRange,
                maxRange,
                distance: minDist,
                evasion: 0
              });

              if (didHit) {
                const baseDmg = minDmg + Math.random() * (maxDmg - minDmg);
                const hitResult = calculateHit({
                  baseDamage: baseDmg,
                  armor: (nearest as any).armor || 0,
                  armorPiercing: armorPiercing
                });
                nearest.hull -= hitResult.finalHullDamage;
                if (nearest.hull <= 0) {
                  if (this.state.players.has((nearest as any).id)) {
                    this.handlePlayerDeath(nearest as Player);
                  } else {
                    this.state.projectiles.delete((nearest as any).id);
                  }
                }
              }
            } else {
              // SPAWN MISSILE
              const projectile = new Projectile();
              projectile.id = Math.random().toString(36).substring(2, 11);
              projectile.type = "missile";
              projectile.faction = station.faction;
              projectile.ownerId = station.id;
              projectile.targetId = nearest.id;
              projectile.x = station.x + tw.x;
              projectile.y = station.y + tw.y;
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

              // Dynamic lifespan
              const ticksToTarget = (maxRange / projectile.maxSpeed) * 1.5;
              projectile.lifespan = Math.max(5000, ticksToTarget * 50);

              this.state.projectiles.set(projectile.id, projectile);
            }
          }
        }
      });

      // --- DRONE SWARM LOGIC ---
      const now = this.state.serverTime;
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
          drone.id = `drone_${station.id}_${Date.now()}_${station.droneSpawnsRemaining}`;
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
          
          drone.speed = 1.5; // Slow travel
          drone.acceleration = 0;
          drone.maxSpeed = 1.5;
          drone.turnSpeed = 0.05; // Gentle seeking
          
          drone.damage = 300; // Reduced power but many drones
          drone.armorPiercing = 40;
          drone.hull = 60; // Destructible
          drone.maxHull = 60;
          drone.armor = 5;
          drone.createdAt = now;
          drone.lifespan = 3600000; // 1 hour (plenty of time to travel)

          this.state.projectiles.set(drone.id, drone);
          console.log(`STATION ${station.id} launched DRONE at ${drone.targetId}`);
        }
      }
    });
  }

  handlePlayerDeath(player: Player) {
    if (player.isDead) return;
    console.log(`Player ${player.id} destroyed!`);
    player.isDead = true;
    player.hull = 0;
    player.vx = 0;
    player.vy = 0;
    player.targetId = "";

    // Retarget or clear projectiles targeting this player
    this.state.projectiles.forEach(proj => {
      if (proj.targetId === player.id) {
        proj.targetId = ""; // Fly straight
      }
    });
  }

  respawnPlayer(player: Player) {
    console.log(`Respawning player ${player.id}...`);
    const faction = this.state.factions.get(player.faction);
    const shipSpec = ships.find(s => s.id === player.shipClass) || ships[0];

    const angle = Math.random() * Math.PI * 2;
    const spawnRadius = 500;
    const spawnX = faction ? faction.spawnX : 0;
    const spawnY = faction ? faction.spawnY : 0;

    player.x = spawnX + Math.cos(angle) * spawnRadius;
    player.y = spawnY + Math.sin(angle) * spawnRadius;
    player.vx = 0;
    player.vy = 0;
    player.angle = 0;
    player.hull = shipSpec.stats.hull;
    player.armor = shipSpec.stats.armor;
    player.isDead = false;
    player.targetId = "";
  }

  onJoin(client: Client, options: any) {
    console.log(client.sessionId, "joined with options:", options);

    const factionId = options.faction || "humans";
    const faction = this.state.factions.get(factionId);
    const shipSpec = ships.find(s => s.id === options.ship) || ships[0];

    const player = new Player();
    player.id = client.sessionId;
    player.faction = factionId;
    player.shipClass = shipSpec.id;
    const angle = Math.random() * Math.PI * 2;
    const spawnRadius = 500;
    const spawnX = faction ? faction.spawnX : 0;
    const spawnY = faction ? faction.spawnY : 0;

    player.x = spawnX + Math.cos(angle) * spawnRadius;
    player.y = spawnY + Math.sin(angle) * spawnRadius;
    player.angle = 0;
    player.vx = 0;
    player.vy = 0;
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

  onLeave(client: Client, code: CloseCode) {
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
