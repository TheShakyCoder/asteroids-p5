import { type, MapSchema } from "@colyseus/schema";
import { Mass } from "./abstract/Mass.js";
import { Kinetic } from "./abstract/Kinetic.js";

export class Ship extends Kinetic {
    @type("string") shipClass: string;
    @type(["boolean"]) weaponSlots: boolean[] = [];
    @type({ map: "number" }) weaponLastFire = new MapSchema<number>();
    @type("boolean") isDocking: boolean = false;
    @type("number") dockingStartTime: number = 0;
    @type("boolean") isDocked: boolean = false;
    @type(["string"]) equippedWeapons: string[] = [];
    @type(["number"]) weaponLevels: number[] = [];
    @type("boolean") isDead: boolean = false;
}
