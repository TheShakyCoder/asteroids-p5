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
      const maxSpeed = shipSpec.stats.speed * 1.5;
      const acceleration = shipSpec.stats.speed * 0.1;
      const rotationSpeed = 0.05;
      const friction = 0.98;

      // Update angle
      if (player.input.a) player.angle -= rotationSpeed;
      if (player.input.d) player.angle += rotationSpeed;

      // Update velocity
      if (player.input.w) {
        player.vx += Math.sin(player.angle) * acceleration;
        player.vy -= Math.cos(player.angle) * acceleration;
      }
      if (player.input.s) {
        player.vx -= Math.sin(player.angle) * (acceleration * 0.5);
        player.vy += Math.cos(player.angle) * (acceleration * 0.5);
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
