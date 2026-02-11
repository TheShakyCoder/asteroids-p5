import { ref, onMounted, onUnmounted } from 'vue';
import { Client } from '@colyseus/sdk';
const rooms = ref([]);
const factions = ref([]);
const selectedFaction = ref(null);
const ships = ref([]);
const selectedShip = ref(null);
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
        if (!response.ok)
            throw new Error(data.error || "Login failed");
        handleAuthSuccess(data);
    }
    catch (e) {
        error.value = e.message;
    }
    finally {
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
        if (!response.ok)
            throw new Error(data.error || "Registration failed");
        successMessage.value = "Registration successful! Check your console for the verification code (mocked).";
        authMode.value = 'login';
    }
    catch (e) {
        error.value = e.message;
    }
    finally {
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
        if (!response.ok)
            throw new Error(data.error || "Guest access failed");
        handleAuthSuccess(data);
    }
    catch (e) {
        error.value = e.message;
    }
    finally {
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
    }
    catch (e) {
        return false;
    }
};
const fetchShips = async () => {
    try {
        const baseUrl = import.meta.env.VITE_SERVER_URL || '';
        const response = await fetch(`${baseUrl}/api/ships`.replace(/^\/\//, '/'));
        if (!response.ok)
            throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        ships.value = data;
        if (data.length > 0) {
            selectedShip.value = data[0].id;
        }
    }
    catch (e) {
        console.error("Error fetching ships:", e);
        error.value = "Failed to load ship configurations.";
    }
};
const fetchFactions = async () => {
    try {
        const baseUrl = import.meta.env.VITE_SERVER_URL || '';
        const response = await fetch(`${baseUrl}/api/factions`.replace(/^\/\//, '/'));
        if (!response.ok)
            throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        factions.value = data;
        emit('factions-loaded', data);
        if (data.length > 0) {
            selectedFaction.value = data[0].id;
        }
    }
    catch (e) {
        console.error("Error fetching factions:", e);
        error.value = "Failed to load faction data.";
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
    }
    catch (e) {
        console.error("Error fetching rooms:", e);
        error.value = "Scanning frequencies failed.";
        loading.value = false;
    }
};
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
            fetchFactions(),
            fetchShips()
        ]);
        refreshInterval = setInterval(fetchRooms, 3000);
    }
    else {
        isConnecting.value = false;
        loading.value = false;
        error.value = "Unable to establish connection to Command Center. Please verify server status.";
    }
});
onUnmounted(() => {
    if (refreshInterval)
        clearInterval(refreshInterval);
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
const emit = defineEmits(['join', 'factions-loaded']);
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['danger-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['faction-selector']} */ ;
/** @type {__VLS_StyleScopedClasses['faction-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['faction-card']} */ ;
/** @type {__VLS_StyleScopedClasses['faction-card']} */ ;
/** @type {__VLS_StyleScopedClasses['faction-card']} */ ;
/** @type {__VLS_StyleScopedClasses['faction-card']} */ ;
/** @type {__VLS_StyleScopedClasses['ship-selector']} */ ;
/** @type {__VLS_StyleScopedClasses['ship-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['ship-card']} */ ;
/** @type {__VLS_StyleScopedClasses['ship-card']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-row']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['faction-card']} */ ;
/** @type {__VLS_StyleScopedClasses['ship-card']} */ ;
/** @type {__VLS_StyleScopedClasses['room-card']} */ ;
/** @type {__VLS_StyleScopedClasses['room-card']} */ ;
/** @type {__VLS_StyleScopedClasses['room-info']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['dashed']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['text']} */ ;
/** @type {__VLS_StyleScopedClasses['error-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['success-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-form']} */ ;
/** @type {__VLS_StyleScopedClasses['divider']} */ ;
/** @type {__VLS_StyleScopedClasses['divider']} */ ;
/** @type {__VLS_StyleScopedClasses['divider']} */ ;
/** @type {__VLS_StyleScopedClasses['user-info']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "lobby-container" },
});
/** @type {__VLS_StyleScopedClasses['lobby-container']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "glass-panel" },
});
/** @type {__VLS_StyleScopedClasses['glass-panel']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "subtitle" },
});
/** @type {__VLS_StyleScopedClasses['subtitle']} */ ;
if (__VLS_ctx.isConnecting) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "loader" },
    });
    /** @type {__VLS_StyleScopedClasses['loader']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "connection-status" },
    });
    /** @type {__VLS_StyleScopedClasses['connection-status']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "pulse" },
    });
    /** @type {__VLS_StyleScopedClasses['pulse']} */ ;
}
else if (__VLS_ctx.error) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "error-badge" },
    });
    /** @type {__VLS_StyleScopedClasses['error-badge']} */ ;
    (__VLS_ctx.error);
}
else if (__VLS_ctx.successMessage) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "success-badge" },
    });
    /** @type {__VLS_StyleScopedClasses['success-badge']} */ ;
    (__VLS_ctx.successMessage);
}
if (__VLS_ctx.currentAuthView === 'auth' && !__VLS_ctx.isConnecting) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "auth-section" },
    });
    /** @type {__VLS_StyleScopedClasses['auth-section']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "auth-tabs" },
    });
    /** @type {__VLS_StyleScopedClasses['auth-tabs']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.currentAuthView === 'auth' && !__VLS_ctx.isConnecting))
                    return;
                __VLS_ctx.authMode = 'login';
                // @ts-ignore
                [isConnecting, isConnecting, error, error, successMessage, successMessage, currentAuthView, authMode,];
            } },
        ...{ class: ({ active: __VLS_ctx.authMode === 'login' }) },
    });
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.currentAuthView === 'auth' && !__VLS_ctx.isConnecting))
                    return;
                __VLS_ctx.authMode = 'register';
                // @ts-ignore
                [authMode, authMode,];
            } },
        ...{ class: ({ active: __VLS_ctx.authMode === 'register' }) },
    });
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    if (__VLS_ctx.authMode === 'login') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "auth-form" },
        });
        /** @type {__VLS_StyleScopedClasses['auth-form']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            type: "email",
            placeholder: "Email",
        });
        (__VLS_ctx.loginData.email);
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            type: "password",
            placeholder: "Password",
        });
        (__VLS_ctx.loginData.password);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.login) },
            disabled: (__VLS_ctx.isAuthLoading),
            ...{ class: "btn primary" },
        });
        /** @type {__VLS_StyleScopedClasses['btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['primary']} */ ;
    }
    if (__VLS_ctx.authMode === 'register') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "auth-form" },
        });
        /** @type {__VLS_StyleScopedClasses['auth-form']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            type: "email",
            placeholder: "Email",
        });
        (__VLS_ctx.registerData.email);
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            type: "password",
            placeholder: "Password",
        });
        (__VLS_ctx.registerData.password);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.register) },
            disabled: (__VLS_ctx.isAuthLoading),
            ...{ class: "btn primary" },
        });
        /** @type {__VLS_StyleScopedClasses['btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['primary']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "divider" },
    });
    /** @type {__VLS_StyleScopedClasses['divider']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.playAsGuest) },
        disabled: (__VLS_ctx.isAuthLoading),
        ...{ class: "btn secondary guest-btn" },
    });
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['secondary']} */ ;
    /** @type {__VLS_StyleScopedClasses['guest-btn']} */ ;
}
else if (__VLS_ctx.currentAuthView === 'lobby' && !__VLS_ctx.isConnecting) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "user-info" },
    });
    /** @type {__VLS_StyleScopedClasses['user-info']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.authUsername);
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.logout) },
        ...{ class: "btn text small" },
    });
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['text']} */ ;
    /** @type {__VLS_StyleScopedClasses['small']} */ ;
    if (__VLS_ctx.factions.length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "faction-selector" },
        });
        /** @type {__VLS_StyleScopedClasses['faction-selector']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "faction-grid" },
        });
        /** @type {__VLS_StyleScopedClasses['faction-grid']} */ ;
        for (const [faction] of __VLS_vFor((__VLS_ctx.factions))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.currentAuthView === 'auth' && !__VLS_ctx.isConnecting))
                            return;
                        if (!(__VLS_ctx.currentAuthView === 'lobby' && !__VLS_ctx.isConnecting))
                            return;
                        if (!(__VLS_ctx.factions.length > 0))
                            return;
                        __VLS_ctx.selectedFaction = faction.id;
                        // @ts-ignore
                        [isConnecting, currentAuthView, authMode, authMode, authMode, loginData, loginData, login, isAuthLoading, isAuthLoading, isAuthLoading, registerData, registerData, register, playAsGuest, authUsername, logout, factions, factions, selectedFaction,];
                    } },
                key: (faction.id),
                ...{ class: "faction-card" },
                ...{ class: ({ active: __VLS_ctx.selectedFaction === faction.id }) },
                ...{ style: ({
                        borderColor: __VLS_ctx.selectedFaction === faction.id ? faction.color : 'rgba(255,255,255,0.1)',
                        boxShadow: __VLS_ctx.selectedFaction === faction.id ? `0 0 20px ${faction.color}33` : 'none'
                    }) },
            });
            /** @type {__VLS_StyleScopedClasses['faction-card']} */ ;
            /** @type {__VLS_StyleScopedClasses['active']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "faction-dot" },
                ...{ style: ({ backgroundColor: faction.color, boxShadow: `0 0 10px ${faction.color}` }) },
            });
            /** @type {__VLS_StyleScopedClasses['faction-dot']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({});
            (faction.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
            (faction.description);
            // @ts-ignore
            [selectedFaction, selectedFaction, selectedFaction,];
        }
    }
    if (__VLS_ctx.ships.length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "ship-selector" },
        });
        /** @type {__VLS_StyleScopedClasses['ship-selector']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "ship-grid" },
        });
        /** @type {__VLS_StyleScopedClasses['ship-grid']} */ ;
        for (const [ship] of __VLS_vFor((__VLS_ctx.ships))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.currentAuthView === 'auth' && !__VLS_ctx.isConnecting))
                            return;
                        if (!(__VLS_ctx.currentAuthView === 'lobby' && !__VLS_ctx.isConnecting))
                            return;
                        if (!(__VLS_ctx.ships.length > 0))
                            return;
                        __VLS_ctx.selectedShip = ship.id;
                        // @ts-ignore
                        [ships, ships, selectedShip,];
                    } },
                key: (ship.id),
                ...{ class: "ship-card" },
                ...{ class: ({ active: __VLS_ctx.selectedShip === ship.id }) },
            });
            /** @type {__VLS_StyleScopedClasses['ship-card']} */ ;
            /** @type {__VLS_StyleScopedClasses['active']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "ship-visual-preview" },
            });
            /** @type {__VLS_StyleScopedClasses['ship-visual-preview']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "ship-icon-placeholder" },
                ...{ style: ({ color: __VLS_ctx.factions.find(f => f.id === __VLS_ctx.selectedFaction)?.color }) },
            });
            /** @type {__VLS_StyleScopedClasses['ship-icon-placeholder']} */ ;
            (ship.name[0]);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "ship-class-badge" },
            });
            /** @type {__VLS_StyleScopedClasses['ship-class-badge']} */ ;
            (ship.class);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "ship-details" },
            });
            /** @type {__VLS_StyleScopedClasses['ship-details']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({});
            (ship.name);
            // @ts-ignore
            [factions, selectedFaction, selectedShip,];
        }
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "room-list-container" },
    });
    /** @type {__VLS_StyleScopedClasses['room-list-container']} */ ;
    if (__VLS_ctx.loading && __VLS_ctx.rooms.length === 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "loader" },
        });
        /** @type {__VLS_StyleScopedClasses['loader']} */ ;
    }
    else if (__VLS_ctx.rooms.length === 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "empty-state" },
        });
        /** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "room-grid" },
        });
        /** @type {__VLS_StyleScopedClasses['room-grid']} */ ;
        for (const [room] of __VLS_vFor((__VLS_ctx.rooms))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (room.roomId),
                ...{ class: "room-card" },
            });
            /** @type {__VLS_StyleScopedClasses['room-card']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "room-info" },
            });
            /** @type {__VLS_StyleScopedClasses['room-info']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
            ((room.metadata && room.metadata.name) ? room.metadata.name : 'Sector ' + room.roomId);
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
            (room.clients);
            (room.maxClients || '∞');
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "room-actions" },
            });
            /** @type {__VLS_StyleScopedClasses['room-actions']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.currentAuthView === 'auth' && !__VLS_ctx.isConnecting))
                            return;
                        if (!(__VLS_ctx.currentAuthView === 'lobby' && !__VLS_ctx.isConnecting))
                            return;
                        if (!!(__VLS_ctx.loading && __VLS_ctx.rooms.length === 0))
                            return;
                        if (!!(__VLS_ctx.rooms.length === 0))
                            return;
                        __VLS_ctx.joinRoom(room.roomId);
                        // @ts-ignore
                        [loading, rooms, rooms, rooms, joinRoom,];
                    } },
                ...{ class: "btn secondary" },
            });
            /** @type {__VLS_StyleScopedClasses['btn']} */ ;
            /** @type {__VLS_StyleScopedClasses['secondary']} */ ;
            // @ts-ignore
            [];
        }
    }
}
__VLS_asFunctionalElement1(__VLS_intrinsics.footer, __VLS_intrinsics.footer)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.fetchRooms) },
    ...{ class: "btn text" },
});
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['text']} */ ;
// @ts-ignore
[fetchRooms,];
const __VLS_export = (await import('vue')).defineComponent({
    emits: {},
});
export default {};
//# sourceMappingURL=Lobby.vue.js.map