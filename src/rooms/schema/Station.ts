import { Schema, type, MapSchema } from "@colyseus/schema";

export class Station extends Schema {
  @type("string") id: string;
  @type("string") faction: string;
  @type("number") x: number;
  @type("number") y: number;
  @type("number") width: number = 500;
  @type("number") height: number = 70;
  @type("number") hull: number = 40000;
  @type("number") maxHull: number = 40000;
  @type("number") armor: number = 100; // Bases are heavy
  @type({ map: "number" }) weaponLastFire = new MapSchema<number>();
  @type("number") angle: number = 0;

  // Drone logic
  @type("number") droneNextWaveTime: number = 0;
  @type("number") droneSpawnsRemaining: number = 0;
  @type("number") droneNextSpawnTime: number = 0;
}
