import { Schema, type, MapSchema } from "@colyseus/schema";
import { Player } from "./Player.js";

export class MyRoomState extends Schema {

  @type({ map: Player }) players = new MapSchema<Player>();
  @type("number") width: number = 100000;
  @type("number") height: number = 100000;
  @type("number") serverTime: number = 0;

}
