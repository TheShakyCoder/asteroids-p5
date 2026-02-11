import { ref } from 'vue';
const props = defineProps({
    isDocked: Boolean,
    myPlayer: Object,
    shipConfigs: Array,
    allWeapons: Array
});
const emit = defineEmits(['undock', 'change-ship', 'buy-weapon', 'upgrade-weapon']);
const activeDockTab = ref('ships');
const handleBuyWeapon = (slotIndex, weaponId) => emit('buy-weapon', slotIndex, weaponId);
const handleUpgradeWeapon = (slotIndex) => emit('upgrade-weapon', slotIndex);
const handleChangeShip = (shipId) => emit('change-ship', shipId);
const handleUndock = () => emit('undock');
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
/** @type {__VLS_StyleScopedClasses['tylium-display']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-departure']} */ ;
/** @type {__VLS_StyleScopedClasses['dock-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['dock-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['ship-card']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-select-ship']} */ ;
/** @type {__VLS_StyleScopedClasses['weapon-header']} */ ;
/** @type {__VLS_StyleScopedClasses['weapon-header']} */ ;
/** @type {__VLS_StyleScopedClasses['weapon-header']} */ ;
/** @type {__VLS_StyleScopedClasses['slot-buttons']} */ ;
/** @type {__VLS_StyleScopedClasses['slot-buttons']} */ ;
/** @type {__VLS_StyleScopedClasses['equipped-weapon']} */ ;
/** @type {__VLS_StyleScopedClasses['equipped-weapon']} */ ;
/** @type {__VLS_StyleScopedClasses['equipped-weapon']} */ ;
/** @type {__VLS_StyleScopedClasses['equipped-weapon']} */ ;
/** @type {__VLS_StyleScopedClasses['equipped-weapon']} */ ;
/** @type {__VLS_StyleScopedClasses['equipped-weapon']} */ ;
/** @type {__VLS_StyleScopedClasses['equipped-weapon']} */ ;
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.transition | typeof __VLS_components.Transition | typeof __VLS_components.transition | typeof __VLS_components.Transition} */
transition;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    name: "fade",
}));
const __VLS_2 = __VLS_1({
    name: "fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
const { default: __VLS_5 } = __VLS_3.slots;
if (__VLS_ctx.isDocked) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "dock-overlay" },
    });
    /** @type {__VLS_StyleScopedClasses['dock-overlay']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "dock-panel" },
    });
    /** @type {__VLS_StyleScopedClasses['dock-panel']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({
        ...{ class: "dock-header" },
    });
    /** @type {__VLS_StyleScopedClasses['dock-header']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "station-info" },
    });
    /** @type {__VLS_StyleScopedClasses['station-info']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tylium-display" },
    });
    /** @type {__VLS_StyleScopedClasses['tylium-display']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "label" },
    });
    /** @type {__VLS_StyleScopedClasses['label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "value" },
    });
    /** @type {__VLS_StyleScopedClasses['value']} */ ;
    (__VLS_ctx.myPlayer?.tylium?.toLocaleString());
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.handleUndock) },
        ...{ class: "btn-departure" },
    });
    /** @type {__VLS_StyleScopedClasses['btn-departure']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.nav, __VLS_intrinsics.nav)({
        ...{ class: "dock-tabs" },
    });
    /** @type {__VLS_StyleScopedClasses['dock-tabs']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.isDocked))
                    return;
                __VLS_ctx.activeDockTab = 'ships';
                // @ts-ignore
                [isDocked, myPlayer, handleUndock, activeDockTab,];
            } },
        ...{ class: ({ active: __VLS_ctx.activeDockTab === 'ships' }) },
    });
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.isDocked))
                    return;
                __VLS_ctx.activeDockTab = 'shop';
                // @ts-ignore
                [activeDockTab, activeDockTab,];
            } },
        ...{ class: ({ active: __VLS_ctx.activeDockTab === 'shop' }) },
    });
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.isDocked))
                    return;
                __VLS_ctx.activeDockTab = 'armory';
                // @ts-ignore
                [activeDockTab, activeDockTab,];
            } },
        ...{ class: ({ active: __VLS_ctx.activeDockTab === 'armory' }) },
    });
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "dock-content" },
    });
    /** @type {__VLS_StyleScopedClasses['dock-content']} */ ;
    if (__VLS_ctx.activeDockTab === 'ships') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "tab-panel ships-tab" },
        });
        /** @type {__VLS_StyleScopedClasses['tab-panel']} */ ;
        /** @type {__VLS_StyleScopedClasses['ships-tab']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "ship-grid" },
        });
        /** @type {__VLS_StyleScopedClasses['ship-grid']} */ ;
        for (const [s] of __VLS_vFor((__VLS_ctx.shipConfigs))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (s.id),
                ...{ class: "ship-card" },
                ...{ class: ({ current: __VLS_ctx.myPlayer?.shipClass === s.id }) },
            });
            /** @type {__VLS_StyleScopedClasses['ship-card']} */ ;
            /** @type {__VLS_StyleScopedClasses['current']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
            (s.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "ship-desc" },
            });
            /** @type {__VLS_StyleScopedClasses['ship-desc']} */ ;
            (s.description);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "ship-stats" },
            });
            /** @type {__VLS_StyleScopedClasses['ship-stats']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "stat" },
            });
            /** @type {__VLS_StyleScopedClasses['stat']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            (s.stats.hull);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "stat" },
            });
            /** @type {__VLS_StyleScopedClasses['stat']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            (s.stats.armor);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "stat" },
            });
            /** @type {__VLS_StyleScopedClasses['stat']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            (s.stats.maxVelocity);
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.isDocked))
                            return;
                        if (!(__VLS_ctx.activeDockTab === 'ships'))
                            return;
                        __VLS_ctx.handleChangeShip(s.id);
                        // @ts-ignore
                        [myPlayer, activeDockTab, activeDockTab, shipConfigs, handleChangeShip,];
                    } },
                ...{ class: "btn-select-ship" },
                disabled: (__VLS_ctx.myPlayer?.shipClass === s.id),
            });
            /** @type {__VLS_StyleScopedClasses['btn-select-ship']} */ ;
            (__VLS_ctx.myPlayer?.shipClass === s.id ? 'CURRENTLY ASSIGNED' : 'REQUISITION SHIP');
            // @ts-ignore
            [myPlayer, myPlayer,];
        }
    }
    if (__VLS_ctx.activeDockTab === 'shop') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "tab-panel shop-tab" },
        });
        /** @type {__VLS_StyleScopedClasses['tab-panel']} */ ;
        /** @type {__VLS_StyleScopedClasses['shop-tab']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "weapon-grid" },
        });
        /** @type {__VLS_StyleScopedClasses['weapon-grid']} */ ;
        for (const [w] of __VLS_vFor((__VLS_ctx.allWeapons.filter(weapon => weapon.tylium)))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (w.id),
                ...{ class: "weapon-card" },
            });
            /** @type {__VLS_StyleScopedClasses['weapon-card']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "weapon-header" },
            });
            /** @type {__VLS_StyleScopedClasses['weapon-header']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({});
            (w.name);
            if (__VLS_ctx.myPlayer?.ownedWeapons?.[w.id]) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "owned-tag" },
                });
                /** @type {__VLS_StyleScopedClasses['owned-tag']} */ ;
                (__VLS_ctx.myPlayer.ownedWeapons[w.id]);
            }
            else {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "type" },
                });
                /** @type {__VLS_StyleScopedClasses['type']} */ ;
                (w.type);
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "weapon-stats" },
            });
            /** @type {__VLS_StyleScopedClasses['weapon-stats']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "stat" },
            });
            /** @type {__VLS_StyleScopedClasses['stat']} */ ;
            (w.maxRange);
            if (w.reload) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "stat" },
                });
                /** @type {__VLS_StyleScopedClasses['stat']} */ ;
                (w.reload);
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "price" },
            });
            /** @type {__VLS_StyleScopedClasses['price']} */ ;
            (__VLS_ctx.myPlayer?.ownedWeapons?.[w.id] ? 'RE-EQUIP FREE' : `COST: ${w.tylium?.toLocaleString()} ⚛`);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "slot-selectors" },
            });
            /** @type {__VLS_StyleScopedClasses['slot-selectors']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "slot-buttons" },
            });
            /** @type {__VLS_StyleScopedClasses['slot-buttons']} */ ;
            for (const [_, idx] of __VLS_vFor((__VLS_ctx.myPlayer?.equippedWeapons))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.isDocked))
                                return;
                            if (!(__VLS_ctx.activeDockTab === 'shop'))
                                return;
                            __VLS_ctx.handleBuyWeapon(idx, w.id);
                            // @ts-ignore
                            [myPlayer, myPlayer, myPlayer, myPlayer, activeDockTab, allWeapons, handleBuyWeapon,];
                        } },
                    disabled: (!__VLS_ctx.myPlayer?.ownedWeapons?.[w.id] && (__VLS_ctx.myPlayer?.tylium || 0) < w.tylium),
                });
                (idx + 1);
                // @ts-ignore
                [myPlayer, myPlayer,];
            }
            // @ts-ignore
            [];
        }
    }
    if (__VLS_ctx.activeDockTab === 'armory') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "tab-panel armory-tab" },
        });
        /** @type {__VLS_StyleScopedClasses['tab-panel']} */ ;
        /** @type {__VLS_StyleScopedClasses['armory-tab']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "equipped-list" },
        });
        /** @type {__VLS_StyleScopedClasses['equipped-list']} */ ;
        for (const [wId, idx] of __VLS_vFor((__VLS_ctx.myPlayer?.equippedWeapons))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (idx),
                ...{ class: "equipped-weapon" },
            });
            /** @type {__VLS_StyleScopedClasses['equipped-weapon']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "info" },
            });
            /** @type {__VLS_StyleScopedClasses['info']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "slot" },
            });
            /** @type {__VLS_StyleScopedClasses['slot']} */ ;
            (idx + 1);
            __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({});
            (__VLS_ctx.allWeapons.find(w => w.id === wId)?.name || 'NONE');
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "level" },
            });
            /** @type {__VLS_StyleScopedClasses['level']} */ ;
            (__VLS_ctx.myPlayer?.weaponLevels[idx]);
            if (wId) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "action" },
                });
                /** @type {__VLS_StyleScopedClasses['action']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "cost" },
                });
                /** @type {__VLS_StyleScopedClasses['cost']} */ ;
                (Math.floor((__VLS_ctx.allWeapons.find(w => w.id === wId)?.tylium || 10000) * 0.5 * (__VLS_ctx.myPlayer?.weaponLevels[idx] || 1)));
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.isDocked))
                                return;
                            if (!(__VLS_ctx.activeDockTab === 'armory'))
                                return;
                            if (!(wId))
                                return;
                            __VLS_ctx.handleUpgradeWeapon(idx);
                            // @ts-ignore
                            [myPlayer, myPlayer, myPlayer, activeDockTab, allWeapons, allWeapons, handleUpgradeWeapon,];
                        } },
                    disabled: (__VLS_ctx.myPlayer?.weaponLevels[idx] >= 10 || (__VLS_ctx.myPlayer?.tylium || 0) < Math.floor((__VLS_ctx.allWeapons.find(w => w.id === wId)?.tylium || 10000) * 0.5 * (__VLS_ctx.myPlayer?.weaponLevels[idx] || 1))),
                });
                (__VLS_ctx.myPlayer?.weaponLevels[idx] >= 10 ? 'MAX LEVEL' : 'UPGRADE');
            }
            // @ts-ignore
            [myPlayer, myPlayer, myPlayer, myPlayer, allWeapons,];
        }
    }
}
// @ts-ignore
[];
var __VLS_3;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    emits: {},
    props: {
        isDocked: Boolean,
        myPlayer: Object,
        shipConfigs: Array,
        allWeapons: Array
    },
});
export default {};
//# sourceMappingURL=DockingMenu.vue.js.map