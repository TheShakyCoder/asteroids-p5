import { Schema, type } from "@colyseus/schema";

export class Mass extends Schema {
  @type("string") id: string;
  @type("number") x: number;
  @type("number") y: number;
  @type("number") radius: number;
}
