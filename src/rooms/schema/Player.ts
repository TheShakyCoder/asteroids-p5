import { Schema, type, MapSchema } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") id: string;
  @type("string") faction: string;
  @type("string") shipClass: string;
  @type("number") x: number;
  @type("number") y: number;
  @type("number") angle: number = 0;
  @type("number") vx: number = 0;
  @type("number") vy: number = 0;
  @type("number") hull: number;
  @type("number") armor: number;
  @type("number") weaponRadius: number;
  @type(["boolean"]) weaponSlots: boolean[] = [];
  @type({ map: "number" }) weaponLastFire = new MapSchema<number>();
  @type("string") targetId: string = "";

  // Diagnostic properties
  @type("number") heartbeat: number = 0;
  
  // Input states (not synchronized directly via schema for efficiency, handled manually)
  input = { w: false, a: false, s: false, d: false };
}
