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

        // Enable CORS for external clients (Desktop App)
        app.use(cors());
        app.use(express.json());

        // --- API ROUTES ---
        app.get("/api/hello", (req, res) => {
            res.json({ message: "Hello World" });
        });

        app.get("/api/rooms", async (req, res) => {
            const rooms = await matchMaker.query({});
            res.json(rooms);
        });

        app.post("/api/rooms", async (req, res) => {
            const options = req.body || {};
            const room = await matchMaker.createRoom("my_room", options);
            res.json(room);
        });

        app.delete("/api/rooms/:id", async (req, res) => {
            const roomId = req.params.id;
            const roomInstance = matchMaker.getLocalRoomById(roomId);
            if (roomInstance) {
                await roomInstance.disconnect();
                res.json({ success: true });
            } else {
                res.status(404).json({ success: false, error: "Room not found or not active on this node." });
            }
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
    }

});

export default server;