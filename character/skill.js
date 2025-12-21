import { lib, game, ui, get, ai, _status } from "../../../noname.js";

/** @type { importCharacterConfig['skill'] } */
const skills = {
    fenlie: {
        trigger: {
            player: "damageEnd"
        },
        filter(event, player) {
            return player.maxHp > 1;
        },
        async content(event, trigger, player) {
            if (!player.getCards("h").length){
                return;
            }
            const result = await player.chooseCard("h", "选择一张牌作为“裂”").forResult();
            if (result.bool){
                await player.addToExpansion(result.cards, player, "giveAuto").gaintag.add("fenlie");
                await player.loseMaxHp();
                await player.recover(player.maxHp - player.hp);
            }
        },
        intro: {
            content: "expansion",
            markcount: "expansion",
        },
        onremove(player, skill) {
            const cards = player.getExpansions(skill);
            if (cards.length) {
                player.loseToDiscardpile(cards);
            }
        },
        "_priority": 0,
    },
    ronghe: {
        enable: "phaseUse",
        usable: 1,
        filter(event, player) {
            return player.countExpansions("fenlie") > 0;
        },
        async content(event, trigger, player) {
            const result = await player.chooseCardButton(
                player.getExpansions("fenlie"), 1, "选择移去一张“裂”", true
            ).forResultLinks();
            await player.loseToDiscardpile(result);
            await player.gainMaxHp();
            await player.recover();
        },
        "_priority": 0,
    },
    liexi: {
        group: ["liexi_1", "liexi_2"],
        subSkill: {
            1: {
                trigger: {
                    player: "useCardToPlayered"
                },
                forced: true,
                filter(event, player) {
                    return event.card.name == "sha";
                },
                *content(event, trigger, player) {
                    if (player.countExpansions("fenlie") >= 3){
                        trigger.getParent().directHit.add(trigger.target);
                    }
                },
                mod: {
                    cardUsable(card, player, num) {
                        if (card.name == "sha") {
                            return 2 ** player.countExpansions("fenlie");
                        }
                    },
                    maxHandcardBase(player, num) {
                        return 4;
                    }
                }
            },
            2: {
                usable: 1,
                trigger: {
                    player: "useCardToPlayered"
                },
                filter(event, player) {
                    return event.card.name == "sha";
                },
                logTarget: "target",
                *content(event, trigger, player) {
                    "step 0";
                    for (let i = 1; i <= player.countExpansions("fenlie"); i++) {
                        player.discardPlayerCard(trigger.target, "h", true);
                    }
                    "step 1";
                    for (let i = 1; i <= player.countExpansions("fenlie"); i++) {
                        player.judge(function(card) {
                            if (get.color(card) == "red") {
                                trigger.target.loseHp(1);
                            }
                            else {
                                player.discardPlayerCard(trigger.target, "he", true);
                            }
                        });
                    }
                }
            }
        }
    }
};

export default skills;