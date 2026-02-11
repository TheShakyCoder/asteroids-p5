import { type, MapSchema } from "@colyseus/schema";
import { Mass } from "./abstract/Mass.js";

export class Ship extends Mass {
    @type("string") ownerId: string;
    @type("string") faction: string;
    @type("string") shipClass: string;
    @type("number") angle: number = 0;
    @type("number") vx: number = 0;
    @type("number") vy: number = 0;
    @type("number") hull: number;
    @type("number") armor: number;
    @type("boolean") isDead: boolean = false;
    @type("number") weaponRadius: number;
    @type(["boolean"]) weaponSlots: boolean[] = [];
    @type({ map: "number" }) weaponLastFire = new MapSchema<number>();
    @type("string") targetId: string = "";
    @type("boolean") isDocking: boolean = false;
    @type("number") dockingStartTime: number = 0;
    @type("boolean") isDocked: boolean = false;
    @type(["string"]) equippedWeapons: string[] = [];
    @type(["number"]) weaponLevels: number[] = [];
}
