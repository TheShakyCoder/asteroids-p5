<script setup>
import { ref, onMounted, provide } from "vue";
import Lobby from "./components/Lobby.vue";
import GameView from "./components/GameView.vue";

const currentView = ref('lobby');
const activeRoomId = ref(null);
const selectedFaction = ref(null);
const selectedShip = ref(null);
const authToken = ref(localStorage.getItem('auth_token'));
const allFactions = ref([]);
const leaveTriggered = ref(false);

// Clear game session items on boot to ensure we start in lobby
localStorage.removeItem('game_view');
localStorage.removeItem('active_room_id');
localStorage.removeItem('selected_faction');
localStorage.removeItem('selected_ship');

provide('factions', allFactions);

const fetchFactions = async () => {
  try {
    const baseUrl = import.meta.env.VITE_SERVER_URL || '';
    const response = await fetch(`${baseUrl}/api/factions`.replace(/^\/\//, '/'));
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    allFactions.value = data;
  } catch (e) {
    console.error("Error fetching factions:", e);
  }
};

onMounted(async () => {
  await fetchFactions();
  
  // Cleanup on reload
  window.addEventListener('beforeunload', () => {
    if (activeRoomId.value) {
      localStorage.removeItem(`session_${activeRoomId.value}`);
    }
    localStorage.removeItem('game_view');
    localStorage.removeItem('active_room_id');
    localStorage.removeItem('selected_faction');
    localStorage.removeItem('selected_ship');
  });
});

const handleJoin = (data) => {
  activeRoomId.value = data.roomId;
  selectedFaction.value = data.faction;
  selectedShip.value = data.ship;
  authToken.value = data.token;
  currentView.value = 'game';
  
  localStorage.setItem('game_view', 'game');
  localStorage.setItem('active_room_id', data.roomId);
  localStorage.setItem('selected_faction', data.faction);
  localStorage.setItem('selected_ship', data.ship);
  
  console.log("Navigating to game for room:", data.roomId, "as", data.faction);
  leaveTriggered.value = false;
};

const backToLobby = () => {
  leaveTriggered.value = true;
};

const handleFinalLeave = () => {
  if (activeRoomId.value) {
    localStorage.removeItem(`session_${activeRoomId.value}`);
  }
  currentView.value = 'lobby';
  activeRoomId.value = null;
  localStorage.removeItem('game_view');
  localStorage.removeItem('active_room_id');
  localStorage.removeItem('selected_faction');
  localStorage.removeItem('selected_ship');
};
</script>

<template>
  <main class="app-container">
    <transition name="fade" mode="out-in">
      <Lobby 
        v-if="currentView === 'lobby'" 
        @join="handleJoin" 
      />
      <div v-else-if="currentView === 'game'" class="game-view">
        <div class="game-header">
          <span>Sector: {{ activeRoomId }}</span>
          <button @click="backToLobby" class="btn-back">Main Menu</button>
        </div>
        <div id="game-canvas-container">
          <GameView 
            :roomId="activeRoomId" 
            :faction="selectedFaction" 
            :ship="selectedShip"
            :token="authToken"
            :isLeaving="leaveTriggered"
            @leave="handleFinalLeave"
          />
        </div>
      </div>
    </transition>
  </main>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap');

:root {
  margin: 0;
  padding: 0;
  overflow: hidden;
}

body {
  margin: 0;
  padding: 0;
  background-color: #050510;
  color: white;
  font-family: 'Outfit', sans-serif;
}

.app-container {
  width: 100vw;
  height: 100vh;
}

.game-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.game-header {
  padding: 20px;
  background: rgba(15, 15, 25, 0.8);
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 10;
}

#game-canvas-container {
  flex: 1;
  position: relative;
  background: #000;
}

.placeholder-game {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at center, #1a1a2e 0%, #050510 100%);
}

.btn-back {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.btn-back:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: #4facfe;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
