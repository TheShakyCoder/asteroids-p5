import { Schema, type, MapSchema } from "@colyseus/schema";
import { Mass } from "./abstract/Mass.js";

export class Station extends Mass {
  @type("number") width: number = 500;
  @type("number") height: number = 70;
  @type({ map: "number" }) weaponLastFire = new MapSchema<number>();

  // Drone logic
  @type("number") droneNextWaveTime: number = 0;
  @type("number") droneSpawnsRemaining: number = 0;
  @type("number") droneNextSpawnTime: number = 0;
}
