import { Schema, type, MapSchema } from "@colyseus/schema";
import { Player } from "./Player.js";
import { Station } from "./Station.js";
import { Projectile } from "./Projectile.js";
import { Faction } from "./Faction.js";

export class MyRoomState extends Schema {

  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Station }) stations = new MapSchema<Station>();
  @type({ map: Projectile }) projectiles = new MapSchema<Projectile>();
  @type({ map: Faction }) factions = new MapSchema<Faction>();
  @type("number") width: number = 100000;
  @type("number") height: number = 100000;
  @type("number") serverTime: number = 0;
  @type("string") winner: string = "";

}
