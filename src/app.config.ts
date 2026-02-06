import {
    defineServer,
    defineRoom,
    monitor,
    playground,
    createRouter,
    createEndpoint,
    matchMaker,
} from "colyseus";

/**
 * Import your Room files
 */
import { MyRoom } from "./rooms/MyRoom.js";

const server = defineServer({
    /**
     * Define your room handlers:
     */
    rooms: {
        my_room: defineRoom(MyRoom)
    },

    /**
     * Experimental: Define API routes. Built-in integration with the "playground" and SDK.
     * 
     * Usage from SDK: 
     *   client.http.get("/api/hello").then((response) => {})
     * 
     */
    routes: createRouter({
        api_hello: createEndpoint("/api/hello", { method: "GET", }, async (ctx) => {
            return { message: "Hello World" }
        }),

        api_rooms: createEndpoint("/api/rooms", { method: "GET" }, async (ctx) => {
            return await matchMaker.query({});
        }),

        api_create_room: createEndpoint("/api/rooms", { method: "POST" }, async (ctx) => {
            const options = ctx.body || {};
            const room = await matchMaker.createRoom("my_room", options);
            return room;
        }),

        api_delete_room: createEndpoint("/api/rooms/:id", { method: "DELETE" }, async (ctx) => {
            const roomId = ctx.params.id;
            const roomInstance = matchMaker.getLocalRoomById(roomId);
            if (roomInstance) {
                await roomInstance.disconnect();
                return { success: true };
            } else {
                return { success: false, error: "Room not found or not active on this node." };
            }
        }),

        api_factions: createEndpoint("/api/factions", { method: "GET" }, async (ctx) => {
            return [
                {
                    id: "humans",
                    name: "Terran Union",
                    description: "Adaptable and resilient survivors from Earth. Balanced ship stats.",
                    color: "#4facfe"
                },
                {
                    id: "martians",
                    name: "Martian Sovereignty",
                    description: "Advanced technological society from the Red Planet. Higher speed and maneuverability.",
                    color: "#ff3b30"
                }
            ];
        }),

        api_ships: createEndpoint("/api/ships", { method: "GET" }, async (ctx) => {
            return [
                {
                    id: "interceptor",
                    name: "Interceptor",
                    class: "Small",
                    description: "Fast and agile. Ideal for hit-and-run tactics.",
                    stats: { speed: 8, armor: 3, fireRate: 6 }
                },
                {
                    id: "assault",
                    name: "Assault",
                    class: "Medium",
                    description: "Well-rounded combat vessel with balanced protection and firepower.",
                    stats: { speed: 5, armor: 6, fireRate: 7 }
                },
                {
                    id: "support",
                    name: "Support",
                    class: "Large",
                    description: "Heavy armor and sustained fire. Built to hold the line.",
                    stats: { speed: 3, armor: 9, fireRate: 5 }
                }
            ];
        })
    }),

    /**
     * Bind your custom express routes here:
     * Read more: https://expressjs.com/en/starter/basic-routing.html
     */
    express: (app) => {
        app.get("/hi", (req, res) => {
            res.send("It's time to kick ass and chew bubblegum!");
        });

        /**
         * Use @colyseus/monitor
         * It is recommended to protect this route with a password
         * Read more: https://docs.colyseus.io/tools/monitoring/#restrict-access-to-the-panel-using-a-password
         */
        app.use("/monitor", monitor());

        /**
         * Use @colyseus/playground
         * (It is not recommended to expose this route in a production environment)
         */
        if (process.env.NODE_ENV !== "production") {
            app.use("/", playground());
        }
    }

});

export default server;