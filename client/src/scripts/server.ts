import { Client } from '@colyseus/sdk';

const getUrl = async() => {
    const wsUrlEnv = import.meta.env.VITE_WS_URL;
    const serverUrlEnv = import.meta.env.VITE_SERVER_URL;

    let protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    let host = window.location.host;

    // Smart host/protocol resolution for DDEV/Tauri
    if (wsUrlEnv) {
      host = wsUrlEnv.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '');
      if (wsUrlEnv.startsWith('wss://')) protocol = 'wss';
      else if (wsUrlEnv.startsWith('ws://')) protocol = 'ws';
    } else if (serverUrlEnv) {
      host = serverUrlEnv.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '');
      if (serverUrlEnv.startsWith('https')) protocol = 'wss';
      else if (serverUrlEnv.startsWith('http')) protocol = 'ws';
    }
    return { protocol, host };
}

export const connect = async (targetRoomId: string, faction: string, ship: string, token: string) => {
  let room = null;
  try {
    const { protocol, host } = await getUrl();

    // console.log(`Neural Link: connecting to ${protocol}://${host}`);
    let client = new Client(`${protocol}://${host}`);

    // Give the server a tiny moment to finalize room creation/setup
    // Critical for DDEV/Multi-container setups
    await new Promise(resolve => setTimeout(resolve, 300));

    const lastSessionId = localStorage.getItem(`session_${targetRoomId}`);

    if (lastSessionId) {
      // console.log(`Attempting to reconnect to sector ${targetRoomId} with session ${lastSessionId}...`);
      try {
        room = await client.reconnect(targetRoomId, lastSessionId);
        // console.log("Reconnected successfully:", room.sessionId);
      } catch (e) {
        console.warn("Reconnection failed, starting fresh deployment...", e);
        room = await client.joinById(targetRoomId, {
          faction: faction,
          ship: ship,
          token: token
        });
      }
    } else {
      // console.log(`Connecting to sector ${targetRoomId}...`);
      room = await client.joinById(targetRoomId, {
        faction: faction,
        ship: ship,
        token: token
      });
    }
    localStorage.setItem(`session_${targetRoomId}`, room.sessionId);
    // console.log("Joined successfully:", room.sessionId);
    return room;
  } catch (e) {
    return null;
  }
};