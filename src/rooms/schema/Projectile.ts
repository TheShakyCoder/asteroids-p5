import { Schema, type } from "@colyseus/schema";

export class Projectile extends Schema {
  @type("string") id: string;
  @type("string") type: string; // "missile"
  @type("string") faction: string;
  @type("string") ownerId: string;
  @type("string") targetId: string;
  
  @type("number") x: number;
  @type("number") y: number;
  @type("number") angle: number;
  @type("number") speed: number;
  
  @type("number") damage: number;
  @type("number") armorPiercing: number;
  
  @type("number") createdAt: number;
  @type("number") lifespan: number = 5000; // ms
}
