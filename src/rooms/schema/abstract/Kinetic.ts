import { Schema, type } from "@colyseus/schema";
import { Mass } from "./Mass.js";

export class Kinetic extends Mass {
    @type("number") angle: number = 0;
    @type("number") vx: number = 0;
    @type("number") vy: number = 0;
}