import { Schema, type } from "@colyseus/schema";

export class Mass extends Schema {
  @type("string") id: string;
  @type("string") ownerId: string;
  @type("string") faction: string;
  @type("number") x: number;
  @type("number") y: number;
  @type("number") radius: number;
  @type("number") hull: number;
  @type("number") maxHull: number;
  @type("number") armor: number;
  @type("string") targetId: string = "";
}
