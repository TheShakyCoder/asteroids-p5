import { Schema, type } from "@colyseus/schema";

export class Faction extends Schema {
  @type("string") id: string;
  @type("string") name: string;
  @type("string") color: string;
  @type("string") description: string;
  @type("number") spawnX: number;
  @type("number") spawnY: number;

  @type("number") score: number = 0;
  @type("number") kills: number = 0;
  @type("number") deaths: number = 0;
}
