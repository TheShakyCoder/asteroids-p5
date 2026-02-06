import { Schema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") id: string;
  @type("string") faction: string;
  @type("string") shipClass: string;
  @type("number") x: number;
  @type("number") y: number;
  @type("number") angle: number = 0;
  @type("number") hull: number;
  @type("number") armor: number;
  @type("number") weaponRadius: number;
}
