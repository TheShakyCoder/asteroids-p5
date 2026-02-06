import { Schema, type } from "@colyseus/schema";

export class MyRoomState extends Schema {

  @type("number") width: number = 100000;
  @type("number") height: number = 100000;

}
