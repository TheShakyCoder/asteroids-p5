import {
    defineServer,
    defineRoom,
    monitor,
    playground,
    matchMaker,
    LobbyRoom,
} from "colyseus";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
// import pool, { initDb } from "./utils/db.js";
import { generateGuestName, generateRoomName } from "./utils/names.js";
import { sendVerificationEmail } from "./utils/mail.js";

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
            // console.log("API: Queried rooms:", rooms.length);
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

        app.get("/api/version", (req, res) => {
            res.send(process.env.GAME_VERSION);
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

        // Initialize Database
        // initDb().catch(console.error);

        // --- AUTH ROUTES ---
        // app.post("/api/auth/register", async (req, res) => {
        //     const { email, password } = req.body;
        //     if (!email || !password) {
        //         return res.status(400).json({ error: "Missing required fields" });
        //     }

        //     const username = generateGuestName();

        //     try {
        //         const passwordHash = await bcrypt.hash(password, 10);
        //         const verificationToken = Math.random().toString(36).substring(2, 15);

        //         const [result]: any = await pool.execute(
        //             "INSERT INTO users (username, email, password_hash, verification_token) VALUES (?, ?, ?, ?)",
        //             [username, email, passwordHash, verificationToken]
        //         );

        //         console.log(`[AUTH] User registered: ${username}. Verification token: ${verificationToken}`);
                
        //         // Send verification email
        //         await sendVerificationEmail(email, verificationToken, username);

        //         res.status(201).json({ message: `Registration successful! Your generated username is: ${username}. Please check your email (Mailpit) to verify your account.` });
        //     } catch (error: any) {
        //         if (error.code === 'ER_DUP_ENTRY') {
        //             return res.status(409).json({ error: "Username or email already exists" });
        //         }
        //         res.status(500).json({ error: "Internal server error" });
        //     }
        // });

        // app.post("/api/auth/login", async (req, res) => {
        //     const { email, password } = req.body;
        //     try {
        //         const [rows]: any = await pool.execute("SELECT * FROM users WHERE email = ?", [email]);
        //         const user = rows[0];

        //         if (!user || user.is_guest) {
        //             return res.status(401).json({ error: "Invalid credentials" });
        //         }

        //         const isValid = await bcrypt.compare(password, user.password_hash);
        //         if (!isValid) {
        //             return res.status(401).json({ error: "Invalid credentials" });
        //         }

        //         if (!user.is_verified) {
        //             return res.status(403).json({ error: "Please verify your email first" });
        //         }

        //         const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET || "secret");
        //         res.json({ token, username: user.username });
        //     } catch (error) {
        //         res.status(500).json({ error: "Internal server error" });
        //     }
        // });

        app.post("/api/auth/guest", async (req, res) => {
            const username = generateGuestName();
            const token = jwt.sign({ id: 0, username, isGuest: true }, process.env.JWT_SECRET || "secret");
            res.json({ token, username });
            // try {
            //     const [result]: any = await pool.execute(
            //         "INSERT INTO users (username, is_verified, is_guest) VALUES (?, 1, 1)",
            //         [username]
            //     );
            //     const token = jwt.sign({ id: result.insertId, username, isGuest: true }, process.env.JWT_SECRET || "secret");
            //     res.json({ token, username });
            // } catch (error) {
            //     res.status(500).json({ error: "Internal server error" });
            // }
        });

        // app.get("/api/auth/verify-email", async (req, res) => {
        //     const { token } = req.query;
        //     try {
        //         const [result]: any = await pool.execute(
        //             "UPDATE users SET is_verified = 1, verification_token = NULL WHERE verification_token = ?",
        //             [token]
        //         );
        //         if (result.affectedRows === 0) {
        //             return res.status(400).send("Invalid or expired verification token.");
        //         }
        //         res.send("Email verified successfully! You can now login.");
        //     } catch (error) {
        //         res.status(500).send("Internal server error");
        //     }
        // });

        // --- BOOTSTRAP INITIAL ROOM ---
        // Ensuring at least one game sector exists
        setTimeout(async () => {
            const rooms = await matchMaker.query({});
            
            if (rooms.length === 0) {
                const randomName = `Sector ${generateRoomName()}`;
                // console.log(`Bootstrap: Initializing ${randomName}...`);
                try {
                    await matchMaker.create("my_room", { name: randomName });
                    // console.log(`Bootstrap: ${randomName} created.`);
                } catch (e) {
                    console.error("Bootstrap: Error creating room:", e);
                }
            } else {
                // console.log("Bootstrap: Sectors already active.");
            }
        }, 1000);
    }

});

export default server;