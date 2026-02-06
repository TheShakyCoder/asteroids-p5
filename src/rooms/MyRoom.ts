import { Room, Client, CloseCode } from "colyseus";
import { MyRoomState } from "./schema/MyRoomState.js";
import { Player } from "./schema/Player.js";
import { factions } from "../data/factions.js";
import { ships } from "../data/ships.js";

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
    });
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
    
    // Initialize weapon slots
    if (shipSpec.weapons) {
       shipSpec.weapons.forEach(() => player.weaponSlots.push(true));
    }
    
    this.state.players.set(client.sessionId, player);
  }

  onLeave (client: Client, code: CloseCode) {
    console.log(client.sessionId, "left!", code);
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    /**
     * Called when the room is disposed.
     */
    console.log("room", this.roomId, "disposing...");
  }

}
