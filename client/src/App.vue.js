import { ref, onMounted } from "vue";
import Lobby from "./components/Lobby.vue";
import GameView from "./components/GameView.vue";
const currentView = ref(localStorage.getItem('game_view') || 'lobby');
const activeRoomId = ref(localStorage.getItem('active_room_id'));
const selectedFaction = ref(localStorage.getItem('selected_faction'));
const selectedShip = ref(localStorage.getItem('selected_ship'));
const authToken = ref(localStorage.getItem('auth_token'));
const allFactions = ref([]);
const leaveTriggered = ref(false);
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
const handleFactionsLoaded = (factions) => {
    allFactions.value = factions;
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
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.main, __VLS_intrinsics.main)({
    ...{ class: "app-container" },
});
/** @type {__VLS_StyleScopedClasses['app-container']} */ ;
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.transition | typeof __VLS_components.Transition | typeof __VLS_components.transition | typeof __VLS_components.Transition} */
transition;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    name: "fade",
    mode: "out-in",
}));
const __VLS_2 = __VLS_1({
    name: "fade",
    mode: "out-in",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
const { default: __VLS_5 } = __VLS_3.slots;
if (__VLS_ctx.currentView === 'lobby') {
    const __VLS_6 = Lobby;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
        ...{ 'onJoin': {} },
        ...{ 'onFactionsLoaded': {} },
    }));
    const __VLS_8 = __VLS_7({
        ...{ 'onJoin': {} },
        ...{ 'onFactionsLoaded': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    let __VLS_11;
    const __VLS_12 = ({ join: {} },
        { onJoin: (__VLS_ctx.handleJoin) });
    const __VLS_13 = ({ factionsLoaded: {} },
        { onFactionsLoaded: (__VLS_ctx.handleFactionsLoaded) });
    var __VLS_9;
    var __VLS_10;
}
else if (__VLS_ctx.currentView === 'game') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "game-view" },
    });
    /** @type {__VLS_StyleScopedClasses['game-view']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "game-header" },
    });
    /** @type {__VLS_StyleScopedClasses['game-header']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.activeRoomId);
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.backToLobby) },
        ...{ class: "btn-back" },
    });
    /** @type {__VLS_StyleScopedClasses['btn-back']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        id: "game-canvas-container",
    });
    const __VLS_14 = GameView;
    // @ts-ignore
    const __VLS_15 = __VLS_asFunctionalComponent1(__VLS_14, new __VLS_14({
        ...{ 'onLeave': {} },
        roomId: (__VLS_ctx.activeRoomId),
        faction: (__VLS_ctx.selectedFaction),
        ship: (__VLS_ctx.selectedShip),
        factions: (__VLS_ctx.allFactions),
        token: (__VLS_ctx.authToken),
        isLeaving: (__VLS_ctx.leaveTriggered),
    }));
    const __VLS_16 = __VLS_15({
        ...{ 'onLeave': {} },
        roomId: (__VLS_ctx.activeRoomId),
        faction: (__VLS_ctx.selectedFaction),
        ship: (__VLS_ctx.selectedShip),
        factions: (__VLS_ctx.allFactions),
        token: (__VLS_ctx.authToken),
        isLeaving: (__VLS_ctx.leaveTriggered),
    }, ...__VLS_functionalComponentArgsRest(__VLS_15));
    let __VLS_19;
    const __VLS_20 = ({ leave: {} },
        { onLeave: (__VLS_ctx.handleFinalLeave) });
    var __VLS_17;
    var __VLS_18;
}
// @ts-ignore
[currentView, currentView, handleJoin, handleFactionsLoaded, activeRoomId, activeRoomId, backToLobby, selectedFaction, selectedShip, allFactions, authToken, leaveTriggered, handleFinalLeave,];
var __VLS_3;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
//# sourceMappingURL=App.vue.js.map