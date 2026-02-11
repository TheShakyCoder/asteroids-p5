import { Schema, type, MapSchema } from "@colyseus/schema";
import { Player } from "./Player.js";
import { Ship } from "./Ship.js";
import { Station } from "./Station.js";
import { Projectile } from "./Projectile.js";
import { Faction } from "./Faction.js";
import { Asteroid } from "./Asteroid.js";

export class MyRoomState extends Schema {

  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Ship }) ships = new MapSchema<Ship>();
  @type({ map: Station }) stations = new MapSchema<Station>();
  @type({ map: Projectile }) projectiles = new MapSchema<Projectile>();
  @type({ map: Asteroid }) asteroidObjects = new MapSchema<Asteroid>();
  @type({ map: Faction }) factions = new MapSchema<Faction>();
  @type("number") width: number = 20000;
  @type("number") height: number = 20000;
  @type("number") asteroids: number = 100;
  @type("number") serverTime: number = 0;
  @type("string") winner: string = "";
  @type("number") gameOverTime: number = 0;
  @type("string") gameStatus: string = "active"; // "active", "gameover"
  @type("string") serverVersion: string = "0.0.0";

}
