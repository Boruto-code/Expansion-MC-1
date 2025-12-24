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
                skills: ["trident_skill"],
                image: "ext:MC-1/image/card/trident.jpg"
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
        },
        translate: {
            mc1: "MC-1",

            trident: "三叉戟",
            trident_info: "出牌阶段限一次，你可以视为使用一张无距离限制的【杀】。",
            trident_skill: "三叉戟",
            trident_skill_info: "出牌阶段限一次，你可以视为使用一张无距离限制的【杀】。"
        }
    };
})