import { Schema, type } from "@colyseus/schema";

export class Station extends Schema {
  @type("string") id: string;
  @type("string") faction: string;
  @type("number") x: number;
  @type("number") y: number;
  @type("number") width: number = 500;
  @type("number") height: number = 70;
  @type("number") hull: number = 5000;
  @type("number") maxHull: number = 5000;
  @type("number") angle: number = 0;
}
