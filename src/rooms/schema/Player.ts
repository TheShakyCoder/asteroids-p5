import { Schema, type, MapSchema } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") id: string;
  @type("string") name: string;
  @type("boolean") connected: boolean = true;

  @type("string") shipId: string;

  @type("number") tylium: number = 50000; // Starting capital
  @type({ map: "number" }) ownedWeapons = new MapSchema<number>();

  // Diagnostic properties
  @type("number") heartbeat: number = 0;
  
  // Input states (not synchronized directly via schema for efficiency, handled manually)
  input = { w: false, a: false, s: false, d: false };
}
