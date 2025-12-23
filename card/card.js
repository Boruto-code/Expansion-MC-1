import { lib, game, ui, get, ai, _status } from "../../../noname.js";

game.import("card", function() {
    return {
        name: "mc1",
        connect: true,
        card: {
            trident: {
                fullskin: true,
                type: "equip",
                subtype: "equip1",
                bingzhu: ["溺尸"],
                distance: { attackFrom: -2 },
                skills: ["trident_skill"]
            }
        },
        skill: {
            trident_skill: {
                equipSkill: true,
                usable: 1,
                enable: "phaseUse",
                async content(event, trigger, player) {
                    const target = event.targets[0];
                    await player.useCard({ name: "sha", isCard: true }, target, false)
                }
            }
        }
    };
})