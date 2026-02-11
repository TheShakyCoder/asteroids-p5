<script setup>
import { ref, onMounted, onUnmounted, inject, computed, watch } from 'vue';
import { Client } from '@colyseus/sdk';

const rooms = ref([]);
const factions = inject('factions', ref([]));
const selectedFaction = ref(localStorage.getItem('selected_faction'));
const ships = ref([]);
const selectedShip = ref(localStorage.getItem('selected_ship'));

// Keep preferences in sync with localStorage
watch(selectedFaction, (newVal) => {
  if (newVal) localStorage.setItem('selected_faction', newVal);
});
watch(selectedShip, (newVal) => {
  if (newVal) localStorage.setItem('selected_ship', newVal);
});

// Set initial faction when factions data arrives, but only if not already set
watch(factions, (newFactions) => {
  if (newFactions.length > 0 && !selectedFaction.value) {
    const pickable = newFactions.filter(f => f.pickable);
    if (pickable.length > 0) {
      selectedFaction.value = pickable[0].id;
    }
  }
}, { immediate: true });
const loading = ref(true);
const isConnecting = ref(true);
const error = ref(null);
const successMessage = ref(null);
let refreshInterval = null;

// Auth State
const authToken = ref(localStorage.getItem('auth_token'));
const authUsername = ref(localStorage.getItem('auth_username'));
const currentAuthView = ref('auth'); // auth, lobby
const authMode = ref('login'); // login, register
const loginData = ref({ email: '', password: '' });
const registerData = ref({ email: '', password: '' });
const isAuthLoading = ref(false);

const handleAuthSuccess = (data) => {
  authToken.value = data.token;
  authUsername.value = data.username;
  localStorage.setItem('auth_token', data.token);
  localStorage.setItem('auth_username', data.username);
  currentAuthView.value = 'lobby';
};

const login = async () => {
  isAuthLoading.value = true;
  error.value = null;
  try {
    const baseUrl = import.meta.env.VITE_SERVER_URL || '';
    const response = await fetch(`${baseUrl}/api/auth/login`.replace(/^\/\//, '/'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginData.value)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Login failed");
    handleAuthSuccess(data);
  } catch (e) {
    error.value = e.message;
  } finally {
    isAuthLoading.value = false;
  }
};

const register = async () => {
  isAuthLoading.value = true;
  error.value = null;
  try {
    const baseUrl = import.meta.env.VITE_SERVER_URL || '';
    const response = await fetch(`${baseUrl}/api/auth/register`.replace(/^\/\//, '/'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerData.value)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Registration failed");
    successMessage.value = "Registration successful! Check your console for the verification code (mocked).";
    authMode.value = 'login';
  } catch (e) {
    error.value = e.message;
  } finally {
    isAuthLoading.value = false;
  }
};

const playAsGuest = async () => {
  isAuthLoading.value = true;
  error.value = null;
  try {
    const baseUrl = import.meta.env.VITE_SERVER_URL || '';
    const response = await fetch(`${baseUrl}/api/auth/guest`.replace(/^\/\//, '/'), {
      method: 'POST'
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Guest access failed");
    handleAuthSuccess(data);
  } catch (e) {
    error.value = e.message;
  } finally {
    isAuthLoading.value = false;
  }
};

const logout = () => {
  authToken.value = null;
  authUsername.value = null;
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_username');
  currentAuthView.value = 'auth';
};

const checkConnection = async () => {
  const baseUrl = import.meta.env.VITE_SERVER_URL || '';
  try {
    const response = await fetch(`${baseUrl}/api/hello`.replace(/^\/\//, '/'));
    return response.ok;
  } catch (e) {
    return false;
  }
};

const fetchShips = async () => {
  try {
    const baseUrl = import.meta.env.VITE_SERVER_URL || '';
    const response = await fetch(`${baseUrl}/api/ships`.replace(/^\/\//, '/'));
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    ships.value = data;
    if (data.length > 0 && !selectedShip.value) {
      selectedShip.value = data[0].id;
    }
  } catch (e) {
    console.error("Error fetching ships:", e);
    error.value = "Failed to load ship configurations.";
  }
};

const fetchRooms = async () => {
  try {
    const baseUrl = import.meta.env.VITE_SERVER_URL || '';
    const response = await fetch(`${baseUrl}/api/rooms`.replace(/^\/\//, '/'));
    const availableRooms = await response.json();
    rooms.value = availableRooms;
    loading.value = false;
    error.value = null;
  } catch (e) {
    console.error("Error fetching rooms:", e);
    error.value = "Scanning frequencies failed.";
    loading.value = false;
  }
};

const pickableFactions = computed(() => {
  return factions.value.filter(f => f.pickable);
});

onMounted(async () => {
  isConnecting.value = true;
  loading.value = true;
  
  // Wait for server to be responsive
  let retries = 0;
  const maxRetries = 5;
  let connected = false;
  
  while (retries < maxRetries && !connected) {
    connected = await checkConnection();
    if (!connected) {
      retries++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  if (connected) {
    isConnecting.value = false;
    if (authToken.value) {
      currentAuthView.value = 'lobby';
    }
    await Promise.all([
      fetchRooms(),
      fetchShips()
    ]);
    refreshInterval = setInterval(fetchRooms, 3000);
  } else {
    isConnecting.value = false;
    loading.value = false;
    error.value = "Unable to establish connection to Command Center. Please verify server status.";
  }
});

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval);
});

const joinRoom = (roomId) => {
  const targetId = String(roomId);
  console.log("Joining sector:", targetId);
  emit('join', { 
    roomId: targetId, 
    faction: selectedFaction.value, 
    ship: selectedShip.value,
    token: authToken.value
  });
};

const emit = defineEmits(['join']);
</script>

<template>
  <div class="lobby-container">
    <div class="glass-panel">
      <header>
        <h1>Asteroids MMO</h1>
        <p class="subtitle">Select your faction and sector to deploy</p>
      </header>

      <div v-if="isConnecting" class="loader">
        <div class="connection-status">
          <span class="pulse"></span>
          Establishing Secure Neural Link...
        </div>
      </div>

      <div v-else-if="error" class="error-badge">
        {{ error }}
      </div>

      <div v-else-if="successMessage" class="success-badge">
        {{ successMessage }}
      </div>

      <div v-if="currentAuthView === 'auth' && !isConnecting" class="auth-section">
        <div class="auth-tabs">
          <button :class="{ active: authMode === 'login' }" @click="authMode = 'login'">Login</button>
          <button :class="{ active: authMode === 'register' }" @click="authMode = 'register'">Register</button>
        </div>

        <div v-if="authMode === 'login'" class="auth-form">
          <input v-model="loginData.email" type="email" placeholder="Email" />
          <input v-model="loginData.password" type="password" placeholder="Password" />
          <button @click="login" :disabled="isAuthLoading" class="btn primary">Login</button>
        </div>

        <div v-if="authMode === 'register'" class="auth-form">
          <input v-model="registerData.email" type="email" placeholder="Email" />
          <input v-model="registerData.password" type="password" placeholder="Password" />
          <button @click="register" :disabled="isAuthLoading" class="btn primary">Register</button>
        </div>

        <div class="divider"><span>OR</span></div>
        
        <button @click="playAsGuest" :disabled="isAuthLoading" class="btn secondary guest-btn">Play as Guest</button>
      </div>

      <template v-else-if="currentAuthView === 'lobby' && !isConnecting">
        <div class="user-info">
          <span>Logged in as: <strong>{{ authUsername }}</strong></span>
          <button @click="logout" class="btn text small">Logout</button>
        </div>

        <div class="faction-selector" v-if="factions.length > 0">
          <h3>Choose your Allegiance</h3>
          <div class="faction-grid">
            <div 
              v-for="faction in pickableFactions" 
              :key="faction.id" 
              class="faction-card"
              :class="{ active: selectedFaction === faction.id }"
              @click="selectedFaction = faction.id"
              :style="{ 
                borderColor: selectedFaction === faction.id ? faction.color : 'rgba(255,255,255,0.1)',
                boxShadow: selectedFaction === faction.id ? `0 0 20px ${faction.color}33` : 'none'
              }"
            >
              <div class="faction-dot" :style="{ backgroundColor: faction.color, boxShadow: `0 0 10px ${faction.color}` }"></div>
              <h4>{{ faction.name }}</h4>
              <p>{{ faction.description }}</p>
            </div>
          </div>
        </div>

        <div class="ship-selector" v-if="ships.length > 0">
          <h3>Select Ship Configuration</h3>
          <div class="ship-grid">
            <div 
              v-for="ship in ships" 
              :key="ship.id" 
              class="ship-card"
              :class="{ active: selectedShip === ship.id }"
              @click="selectedShip = ship.id"
            >
              <div class="ship-visual-preview">
                <div class="ship-icon-placeholder" :style="{ color: factions.find(f => f.id === selectedFaction)?.color }">
                  {{ ship.name[0] }}
                </div>
                <span class="ship-class-badge">{{ ship.class }}</span>
              </div>
              <div class="ship-details">
                <h4>{{ ship.name }}</h4>
              </div>
            </div>
          </div>
        </div>

        <div class="room-list-container">
          <div v-if="loading && rooms.length === 0" class="loader">
            Scanning frequencies...
          </div>
          
          <div v-else-if="rooms.length === 0" class="empty-state">
            <p>Scanning for active sectors...</p>
          </div>

          <div v-else class="room-grid">
            <div v-for="room in rooms" :key="room.roomId" class="room-card">
              <div class="room-info">
                <h3>{{ (room.metadata && room.metadata.name) ? room.metadata.name : 'Sector ' + room.roomId }}</h3>
                <p>Players: {{ room.clients }} / {{ room.maxClients || '∞' }}</p>
              </div>
              <div class="room-actions">
                <button @click="joinRoom(room.roomId)" class="btn secondary">Deploy</button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <footer>
        <button @click="fetchRooms" class="btn text">Refresh Frequencies</button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.room-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.btn.danger-icon {
  background: rgba(255, 59, 48, 0.1);
  color: #ff3b30;
  border: 1px solid rgba(255, 59, 48, 0.2);
  width: 44px;
  height: 44px;
  padding: 0;
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.btn.danger-icon:hover {
  background: #ff3b30;
  color: white;
}

.lobby-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: url('/space_background.png') no-repeat center center fixed;
  background-size: cover;
  padding: 20px;
  color: white;
  font-family: 'Outfit', sans-serif;
}

.glass-panel {
  background: rgba(15, 15, 25, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 40px;
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.8);
  animation: fadeIn 0.8s ease-out;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
}

.glass-panel::-webkit-scrollbar {
  width: 6px;
}

.glass-panel::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.faction-selector {
  margin-bottom: 30px;
  padding-bottom: 30px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.faction-selector h3 {
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 15px;
  text-align: center;
}

.faction-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 600px) {
  .faction-grid {
    grid-template-columns: 1fr;
  }
}

.faction-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.faction-card:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-2px);
}

.faction-card.active {
  background: rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
}

.faction-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-bottom: 12px;
  box-shadow: 0 0 10px currentColor;
}

.faction-card h4 {
  margin: 0 0 8px;
  font-size: 1.1rem;
}

.faction-card p {
  margin: 0;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.4;
}

.ship-selector {
  margin-bottom: 30px;
  padding-bottom: 30px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.ship-selector h3 {
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 15px;
  text-align: center;
}

.ship-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

@media (max-width: 768px) {
  .ship-grid {
    grid-template-columns: 1fr;
  }
}

.ship-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ship-card:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-2px);
}

.ship-card.active {
  background: rgba(255, 255, 255, 0.1);
  border-color: #4facfe;
  box-shadow: 0 0 20px rgba(79, 172, 254, 0.2);
}

.ship-visual-preview {
  height: 80px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.ship-icon-placeholder {
  font-size: 2.5rem;
  font-weight: 800;
  opacity: 0.8;
  filter: drop-shadow(0 0 10px currentColor);
}

.ship-class-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 0.6rem;
  text-transform: uppercase;
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.6);
}

.ship-details h4 {
  margin: 0 0 8px;
  font-size: 1rem;
  text-align: center;
}

.stat-bars {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-row span {
  font-size: 0.65rem;
  width: 24px;
  color: rgba(255, 255, 255, 0.4);
}

.bar-bg {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 2px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #4facfe, #00f2fe);
  border-radius: 2px;
}

.faction-distribution {
  display: flex;
  gap: 12px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.faction-mini-count {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 600;
}

.count-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  box-shadow: 0 0 8px currentColor;
}

header {
  text-align: center;
  margin-bottom: 40px;
}

h1 {
  font-size: 3rem;
  margin: 0;
  background: linear-gradient(45deg, #00f2fe 0%, #4facfe 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.subtitle {
  color: rgba(255, 255, 255, 0.6);
  margin-top: 8px;
  font-size: 1.1rem;
}

.room-list-container {
  min-height: 180px;
  display: flex;
  flex-direction: column;
}

.room-grid {
  display: grid;
  gap: 16px;
  margin-bottom: 24px;
}

@media (max-width: 600px) {
  .glass-panel {
    padding: 20px;
  }
  
  h1 {
    font-size: 2rem;
  }
  
  .faction-card, .ship-card, .room-card {
    padding: 15px;
  }
}

.room-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s ease;
}

.room-card:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
  border-color: #4facfe;
}

.room-info h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #fff;
}

.room-info p {
  margin: 4px 0 0;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9rem;
}

.btn {
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  font-family: inherit;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.btn.primary {
  background: linear-gradient(45deg, #4facfe 0%, #00f2fe 100%);
  color: #000;
}

.btn.secondary {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn.secondary:hover {
  background: #4facfe;
  color: #000;
  border-color: #4facfe;
}

.btn.dashed {
  background: transparent;
  border: 2px dashed rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.6);
  padding: 20px;
}

.btn.dashed:hover {
  border-color: #4facfe;
  color: #4facfe;
}

.btn.text {
  background: transparent;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.8rem;
  margin-top: 20px;
  width: 100%;
}

.btn.text:hover {
  color: #4facfe;
}

.error-badge, .success-badge {
  padding: 12px;
  border-radius: 12px;
  margin-bottom: 24px;
  text-align: center;
  font-size: 0.9rem;
}

.error-badge {
  background: rgba(255, 59, 48, 0.2);
  border: 1px solid rgba(255, 59, 48, 0.5);
  color: #ff3b30;
}

.success-badge {
  background: rgba(74, 222, 128, 0.2);
  border: 1px solid rgba(74, 222, 128, 0.5);
  color: #4ade80;
}

.auth-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
  animation: fadeIn 0.5s ease;
}

.auth-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.auth-tabs button {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
}

.auth-tabs button.active {
  background: rgba(255, 255, 255, 0.1);
  color: #4facfe;
  border-color: #4facfe;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.auth-form input {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  padding: 12px;
  border-radius: 8px;
  font-family: inherit;
}

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  color: rgba(255, 255, 255, 0.3);
  font-size: 0.8rem;
}

.divider::before, .divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.divider span {
  padding: 0 10px;
}

.user-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  padding: 10px 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 0.9rem;
}

.user-info strong {
  color: #4facfe;
}

.loader, .empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 40px 0;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.5);
}

.connection-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  font-size: 1.2rem;
  letter-spacing: 1px;
}

.pulse {
  width: 12px;
  height: 12px;
  background: #4facfe;
  border-radius: 50%;
  box-shadow: 0 0 10px #4facfe, 0 0 20px #4facfe;
  animation: pulse-glow 1.5s infinite;
}

@keyframes pulse-glow {
  0% { transform: scale(0.95); opacity: 0.5; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.5; }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

footer {
  text-align: center;
}
</style>
