const props = defineProps({
    myPlayer: Object,
    connectionStatus: String,
    serverVersion: String,
    clientVersion: String,
    currentZoomIndex: Number,
    cameraRotationActive: Boolean,
    targetData: Object,
    hullPct: Number,
    armorPct: Number,
    moveKeys: Object
});
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['hull-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['controls-grid']} */ ;
if (__VLS_ctx.myPlayer) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ style: {} },
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.dl, __VLS_intrinsics.dl)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.dt, __VLS_intrinsics.dt)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.dd, __VLS_intrinsics.dd)({});
    (__VLS_ctx.connectionStatus);
    __VLS_asFunctionalElement1(__VLS_intrinsics.dt, __VLS_intrinsics.dt)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.dd, __VLS_intrinsics.dd)({});
    (__VLS_ctx.serverVersion);
    __VLS_asFunctionalElement1(__VLS_intrinsics.dt, __VLS_intrinsics.dt)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.dd, __VLS_intrinsics.dd)({});
    (__VLS_ctx.clientVersion);
    __VLS_asFunctionalElement1(__VLS_intrinsics.dt, __VLS_intrinsics.dt)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.dd, __VLS_intrinsics.dd)({});
    (Math.round(__VLS_ctx.myPlayer.x || 0));
    (Math.round(__VLS_ctx.myPlayer.y || 0));
    __VLS_asFunctionalElement1(__VLS_intrinsics.dt, __VLS_intrinsics.dt)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.dd, __VLS_intrinsics.dd)({});
    (Math.round(__VLS_ctx.myPlayer.vx || 0));
    (Math.round(__VLS_ctx.myPlayer.vy || 0));
    __VLS_asFunctionalElement1(__VLS_intrinsics.dt, __VLS_intrinsics.dt)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.dd, __VLS_intrinsics.dd)({});
    (__VLS_ctx.currentZoomIndex === 0 ? 'CLOSEUP' : 'LONG-RANGE');
    __VLS_asFunctionalElement1(__VLS_intrinsics.dt, __VLS_intrinsics.dt)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.dd, __VLS_intrinsics.dd)({});
    (__VLS_ctx.cameraRotationActive ? 'SHIP ALIGNED' : 'WORLD ALIGNED');
    __VLS_asFunctionalElement1(__VLS_intrinsics.dt, __VLS_intrinsics.dt)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.dd, __VLS_intrinsics.dd)({});
    (__VLS_ctx.targetData ? __VLS_ctx.targetData.name : 'NONE');
    if (__VLS_ctx.targetData && !__VLS_ctx.targetData.connected) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ style: {} },
        });
    }
    if (__VLS_ctx.targetData) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.dt, __VLS_intrinsics.dt)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.dd, __VLS_intrinsics.dd)({
            ...{ class: "status-bar-container" },
        });
        /** @type {__VLS_StyleScopedClasses['status-bar-container']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "status-bar hull-bar" },
            ...{ class: ({ low: __VLS_ctx.targetData.hullPct < 0.3 }) },
            ...{ style: ({ width: (__VLS_ctx.targetData.hullPct * 100) + '%' }) },
        });
        /** @type {__VLS_StyleScopedClasses['status-bar']} */ ;
        /** @type {__VLS_StyleScopedClasses['hull-bar']} */ ;
        /** @type {__VLS_StyleScopedClasses['low']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "status-val" },
        });
        /** @type {__VLS_StyleScopedClasses['status-val']} */ ;
        (Math.round(__VLS_ctx.targetData.hull));
        (Math.round(__VLS_ctx.targetData.maxHull));
        if (__VLS_ctx.targetData.maxArmor > 0) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.dt, __VLS_intrinsics.dt)({});
        }
        if (__VLS_ctx.targetData.maxArmor > 0) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.dd, __VLS_intrinsics.dd)({
                ...{ class: "status-bar-container" },
            });
            /** @type {__VLS_StyleScopedClasses['status-bar-container']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "status-bar armor-bar" },
                ...{ style: ({ width: (__VLS_ctx.targetData.armorPct * 100) + '%' }) },
            });
            /** @type {__VLS_StyleScopedClasses['status-bar']} */ ;
            /** @type {__VLS_StyleScopedClasses['armor-bar']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "status-val" },
            });
            /** @type {__VLS_StyleScopedClasses['status-val']} */ ;
            (Math.round(__VLS_ctx.targetData.armor));
            (Math.round(__VLS_ctx.targetData.maxArmor));
        }
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.dt, __VLS_intrinsics.dt)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.dd, __VLS_intrinsics.dd)({
        ...{ class: "status-bar-container" },
    });
    /** @type {__VLS_StyleScopedClasses['status-bar-container']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "status-bar hull-bar" },
        ...{ class: ({ low: __VLS_ctx.hullPct < 0.3 }) },
        ...{ style: ({ width: (__VLS_ctx.hullPct * 100) + '%' }) },
    });
    /** @type {__VLS_StyleScopedClasses['status-bar']} */ ;
    /** @type {__VLS_StyleScopedClasses['hull-bar']} */ ;
    /** @type {__VLS_StyleScopedClasses['low']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "status-val" },
    });
    /** @type {__VLS_StyleScopedClasses['status-val']} */ ;
    (Math.round(__VLS_ctx.myPlayer.hull));
    __VLS_asFunctionalElement1(__VLS_intrinsics.dt, __VLS_intrinsics.dt)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.dd, __VLS_intrinsics.dd)({
        ...{ class: "status-bar-container" },
    });
    /** @type {__VLS_StyleScopedClasses['status-bar-container']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "status-bar armor-bar" },
        ...{ style: ({ width: (__VLS_ctx.armorPct * 100) + '%' }) },
    });
    /** @type {__VLS_StyleScopedClasses['status-bar']} */ ;
    /** @type {__VLS_StyleScopedClasses['armor-bar']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "status-val" },
    });
    /** @type {__VLS_StyleScopedClasses['status-val']} */ ;
    (Math.round(__VLS_ctx.myPlayer.armor));
    __VLS_asFunctionalElement1(__VLS_intrinsics.dt, __VLS_intrinsics.dt)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.dd, __VLS_intrinsics.dd)({
        ...{ class: "controls-grid" },
    });
    /** @type {__VLS_StyleScopedClasses['controls-grid']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: ({ active: __VLS_ctx.moveKeys.w }) },
    });
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: ({ active: __VLS_ctx.moveKeys.a }) },
    });
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: ({ active: __VLS_ctx.moveKeys.d }) },
    });
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: ({ active: __VLS_ctx.moveKeys.s }) },
    });
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
}
// @ts-ignore
[myPlayer, myPlayer, myPlayer, myPlayer, myPlayer, myPlayer, myPlayer, connectionStatus, serverVersion, clientVersion, currentZoomIndex, cameraRotationActive, targetData, targetData, targetData, targetData, targetData, targetData, targetData, targetData, targetData, targetData, targetData, targetData, targetData, targetData, hullPct, hullPct, armorPct, moveKeys, moveKeys, moveKeys, moveKeys,];
const __VLS_export = (await import('vue')).defineComponent({
    props: {
        myPlayer: Object,
        connectionStatus: String,
        serverVersion: String,
        clientVersion: String,
        currentZoomIndex: Number,
        cameraRotationActive: Boolean,
        targetData: Object,
        hullPct: Number,
        armorPct: Number,
        moveKeys: Object
    },
});
export default {};
//# sourceMappingURL=DebugHud.vue.js.map