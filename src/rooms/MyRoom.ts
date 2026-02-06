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
    /**
     * Called when a new room is created.
     */
    console.log("Room created with dimensions:", this.state.width, "x", this.state.height);
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
