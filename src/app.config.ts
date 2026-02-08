import {
    defineServer,
    defineRoom,
    monitor,
    playground,
    createRouter,
    createEndpoint,
    matchMaker,
    LobbyRoom,
} from "colyseus";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Import your Room files
 */
import { MyRoom } from "./rooms/MyRoom.js";
import { ships } from "./data/ships.js";
import { factions } from "./data/factions.js";
import { weapons } from "./data/weapons.js";

const server = defineServer({
    /**
     * Define your room handlers:
     */
    rooms: {
        lobby: defineRoom(LobbyRoom),
        my_room: defineRoom(MyRoom).enableRealtimeListing()
    },

    /**
     * Bind your custom express routes here:
     */
    express: (app) => {
        /**
         * Serve static files from the client's dist directory
         */
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const clientDist = path.join(__dirname, "../public");

        // Enable CORS for external clients
        app.use(cors({
            origin: true, // Reflect the request origin in the Access-Control-Allow-Origin header
            credentials: true
        }));
        app.use(express.json());

        // --- API ROUTES ---
        app.get("/api/hello", (req, res) => {
            res.json({ message: "Hello World" });
        });

        app.get("/api/rooms", async (req, res) => {
            const rooms = await matchMaker.query({});
            console.log("API: Queried rooms:", rooms.length);
            res.json(rooms);
        });

        app.get("/api/factions", (req, res) => {
            res.json(factions);
        });

        app.get("/api/ships", (req, res) => {
            const data = ships.map(ship => ({
                ...ship,
                weapons: ship.weapons.map(sw => {
                    const wId = typeof sw.weapon === 'string' ? sw.weapon : sw.weapon.id;
                    const weaponData = weapons.find(w => w.id === wId);
                    return {
                        ...sw,
                        weapon: weaponData || { name: "Unknown Weapon" }
                    };
                })
            }));
            res.json(data);
        });

        app.get("/api/weapons", (req, res) => {
            res.json(weapons);
        });

        app.get("/hi", (req, res) => {
            res.send("It's time to kick ass and chew bubblegum!");
        });

        app.use(express.static(clientDist));

        /**
         * Use @colyseus/monitor
         */
        app.use("/monitor", monitor());

        /**
         * Use @colyseus/playground
         */
        if (process.env.NODE_ENV !== "production") {
            app.use("/playground", playground());
        }

        // Catch-all route to serve the built index.html (SPA support)
        app.get("*", (req, res) => {
            if (res.headersSent) return;
            res.sendFile(path.join(clientDist, "index.html"));
        });

        // --- BOOTSTRAP INITIAL ROOM ---
        // Ensuring a single global game sector exists
        setTimeout(async () => {
            const rooms = await matchMaker.query({});
            const hasSector1 = rooms.some(r => r.metadata && r.metadata.name === "Sector 1");
            
            if (!hasSector1) {
                console.log("Bootstrap: Initializing Sector 1...");
                try {
                    await matchMaker.create("my_room", { name: "Sector 1" });
                    console.log("Bootstrap: Sector 1 created.");
                } catch (e) {
                    console.error("Bootstrap: Error creating room:", e);
                }
            } else {
                console.log("Bootstrap: Sector 1 already active.");
            }
        }, 1000);
    }

});

export default server;