import { Schema, type, MapSchema } from "@colyseus/schema";
import { Player } from "./Player.js";
import { Station } from "./Station.js";
import { Projectile } from "./Projectile.js";

export class MyRoomState extends Schema {

  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Station }) stations = new MapSchema<Station>();
  @type({ map: Projectile }) projectiles = new MapSchema<Projectile>();
  @type("number") width: number = 100000;
  @type("number") height: number = 100000;
  @type("number") serverTime: number = 0;

}
