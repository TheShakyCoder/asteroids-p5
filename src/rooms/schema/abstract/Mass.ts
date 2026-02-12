import { Schema, type } from "@colyseus/schema";

export class Mass extends Schema {
  @type("string") id: string;
  @type("string") ownerId: string;
  @type("string") faction: string;
  @type("number") x: number;
  @type("number") y: number;
  @type("number") radius: number;
  @type("number") hull: number = 0;
  @type("number") maxHull: number = 0;
  @type("number") armor: number = 0;
  @type("string") targetId: string = "";
}
