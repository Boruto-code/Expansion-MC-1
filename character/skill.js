import { lib, game, ui, get, ai, _status } from "../../../noname.js";

/** @type { importCharacterConfig['skill'] } */
const skills = {
    poison: {
        mark: true,
        marktext: "毒",
        intro: {
            name: "中毒",
            content: "拥有“毒”标记的角色回合开始时，失去一点体力（若体力为1，则不执行）并移去1枚“毒”标记。",
        },
        forced: true,
        popup: false,
        trigger: {
            player: "phaseBegin"
        },
        content(event, player) {
            player.removeMark("poison");
            if (player.hp > 1) {
                player.loseHp();
            }
            if (player.countMark("poison") == 0) {
                player.removeSkill("poison");
            }
        },
    },
    speed: {
        mark: true,
        marktext: "迅",
        intro: {
            name: "迅捷",
            content: "本回合与其他角色的距离-1"
        },
        mod: {
            globalFrom(from, to, distance) {
                return distance - 1;
            }
        }
    },
    weakness: {
        mark: true,
        marktext: "虚",
        intro: {
            name: "虚弱",
            content: "直到回合结束时使用【杀】造成的伤害-1"
        },
        forced: true,
        trigger: { source: "damageBegin" },
        filter(event, player) {
            return event.card.name == "sha";
        },
        content(event, trigger, player) {
            trigger.num--;
        }
    },
    slowness: {
        mark: true,
        marktext: "缓",
        intro: {
            name: "缓慢",
            content: "直到回合结束时与其他角色的距离+1"
        },
        mod: {
            globalFrom(from, to, distance) {
                return distance + 1;
            }
        }
    },

    fenlie: {
        trigger: {
            player: "dying"
        },
        forced: true,
        content(event, trigger, player) {
            "step 0";
            player.loseMaxHp();
            player.recoverTo(player.maxHp);
            "step 1";
            player.addMark("fenlie", 1);
            player.draw(player.countMark("fenlie") - player.countCards("h"));
        },
        marktext: "裂",
        intro: {
            content: "当前有#个标记"
        },
        ai: {
            maixie: true
        }
    },
    weigong: {
        forced: true,
        trigger: {
            player: "loseAfter"
        },
        filter(event, player) {
            return player.countCards("h") < player.countMark("fenlie");
        },
        content() {
            let num = player.countMark("fenlie") - player.countCards("h");
            player.draw(num);
        },
        mod: {
            cardUsable(card, player, num) {
				if (card.name == "sha") {
					return 2 ** player.countMark("fenlie");
				}
			}
        }
    },

    feishi: {
        trigger: {
            player: "useCardToPlayered"
        },
        forced: true,
        filter(event, player) {
            return event.card.name == "sha" && event.target.hp <= event.target.maxHp / 2;
        },
        logTarget: "target",
        async content(event, trigger, player) {
            trigger.getParent().directHit.add(trigger.target);
        },
        mod: {
            targetInRange(card) {
                if (card.name == "sha") {
                    return true;
                }
            }
        }
    },
    qianggong: {
        enable: "chooseToUse",
        filterCard(card, player) {
            return get.color(card) == "black";
        },
        viewAs: { name: "sha" },
        viewAsFilter(player) {
            if (get.zhu(player, "shouyue")) {
                if (!player.countCards("hes")) {
                    return false;
                }
            } else {
                if (!player.countCards("hes", { color: "black" })) {
                    return false;
                }
            }
        },
        selectCard: [1, Infinity],
        position: "hes",
        prompt: "将任意张黑色牌当结算等量次的杀使用",
        check(card) {
            return 5 - get.value(card);
        },
        group: "qianggong_extra",
        subSkill: {
            extra: {
                trigger: {
                    player: "useCard"
                },
                forced: true,
                filter(event) {
                    return event.skill == "qianggong" && event.cards && event.cards.length > 1;
                },
                content() {
                    trigger.effectCount = trigger.cards.length;
                }
            }
        }
    },

    riye: {
        mark: true,
        marktext: "☯",
        zhuanhuanji: true,
        forced: true,
        intro: {
            content(storage, player, skill) {
                return `回合开始时，你选择一项：1.${storage ? "回复一点体力" : "失去一点体力"}；2.${storage ? "摸两张牌" : "弃置两张牌"}。`;
            }
        },
        trigger: {
            player: "phaseBegin"
        },
        async content(event, trigger, player) {
            await player.changeZhuanhuanji("riye");

            if (player.storage.riye) {
                const result = 
                    await player.chooseControl("失去一点体力", "弃置两张牌", function(event, player) {
                        if (player.hp > 2) {
                            return "失去一点体力";
                        } else {
                            return "弃置两张牌";
                        }
                    }).set("prompt", "日：失去一点体力或弃置两张牌").forResult();

                if (result.control == "失去一点体力") {
                    await player.loseHp();
                } else {
                    await player.chooseToDiscard(2, true);
                }
            } else {
                const result = 
                    await player.chooseControl("回复一点体力", "摸两张牌", function(event, player) {
                        if (player.hp == player.maxHp) {
                            return "摸两张牌";
                        } else {
                            return "回复一点体力";
                        }
                    }).set("prompt", "夜：回复一点体力或摸两张牌").forResult();

                if (result.control == "回复一点体力") {
                    await player.recover();
                } else {
                    await player.draw(2);
                }
            }
        }
    },
    ganran: {
        trigger: {
            source: "damageBegin4"
        },
        filter(event, player) {
            if (!event.source || event.player == player) {
				return false;
			}
			return event.num >= event.player.hp && !player.getStorage("ganran").includes(event.player);
        },
        logTarget: "player",
        content(event, trigger, player) {
            trigger.cancel();
            player.markAuto("ganran", [trigger.player]);
            trigger.player.changeGroup("wang");
        }
    },
    bianzhong: {
        forced: true,
        trigger: {
            global: "gameStart"
        },
        content(event, trigger, player) {
            player.judge(function(card) {
                const suit = get.suit(card);
                if (suit == "club") {
                    player.addSkills(["zhibao", "jinxi", "mcaozhan"]);
                } else if (suit == "spade") {
                    player.addSkills(["tongdi", "jinghua"]);
                    player.changeSkin("bianzhong", "zombie_villager");
                } else if (suit == "heart") {
                    player.removeSkill("riye");
                    player.addSkills(["shuizhan", "jianji", "riye_edit"]);
                    player.changeSkin("bianzhong", "drowned");
                } else {
                    player.removeSkill("riye");
                    player.addSkills(["fuhua", "jiqun", "riye_edit_2"]);
                    player.changeSkin("bianzhong", "husk");
                }
            });
        }
    },
    zhibao: {
        forced: true,
        trigger: {
            target: "useCardToBefore"
        },
        filter(event, player) {
            return event.card.name == "nanman"||event.card.name == "wanjian";
        },
        async content(event, trigger, player) {
            trigger.cancel();
        }
    },
    jinxi: {
        group: ["jinxi_1", "jinxi_2"],
        subSkill: {
            1: {
                trigger: {
                    global: "damageBegin4"
                },
                forced: true,
                frequent: true,
                filter(event, player) {
                    return get.distance(player, event.player) > 1 && event.source != player;
                },
                logTarget: "player",
                content(event, trigger, player) {
                    trigger.cancel();
                }
            },
            2: {
                trigger: {
                    global: "damageBegin1"
                },
                forced: true,
                frequent: true,
                filter(event, player) {
                    return event.player !== player && get.distance(event.player, player) <= 1;
                },
                content(event, trigger, player) {
                    trigger.num++;
                }
            }
        }
    },
    mcaozhan: {
        enable: "phaseUse",
        filterTarget(card, player, target) {
            return player.canCompare(target);
        },
        filter(event, player) {
            return player.countCards("h") > 0;
        },
        async content(event, trigger, player) {
            await player.addSkill("mcaozhan_compare");
            await player.chooseToCompare(event.target);
        },
        subSkill: {
            compare: {
                trigger: {
                    player: "chooseToCompareAfter"
                },
                forced: true,
                async content(event, trigger, player) {
                    const winner = trigger.result.winner;
                    const card1 = trigger["card1"], card2 = trigger["card2"];
                    if (winner?.isIn()) {
                        await winner.gain(winner == player ? card1 : card2);
                    } else {
                        await player.gain(card2);
                        await trigger.target.gain(card1);
                    }
                    await player.removeSkill("mcaozhan_compare");
                }
            }
        }
    },
    tongdi: {
        trigger: {
            source: "damageEnd",
            player: "damageEnd"
        },
        content(event, trigger, player) {
            "step 0";
            player.draw(trigger.num);
            "step 1";
            player.chooseTarget([1, trigger.num], false, `请选择至多${get.cnNumber(trigger.num)}名角色`);
            "step 2";
            for (let target of result.targets) {
                target.draw(trigger.num);
            }
        },
        ai: {
            maixie: true
        }
    },
    jinghua: {
        juexingji: true,
        forced: true,
        trigger: {
            player: "dyingEnd"
        },
        async content(event, trigger, player) {
            await player.loseMaxHp();
            await player.recoverTo(player.maxHp);
            await player.removeSkills(["riye", "tongdi"]);
            await player.addSkill("tongdi_upgrade");
            await player.changeGroup("qun");
        },
        ai: {
            maixie: true
        }
    },
    tongdi_upgrade: {
        trigger: {
            player: "damageEnd"
        },
        content(event, trigger, player) {
            "step 0";
            player.draw(2);
            "step 1";
            player.chooseTarget([1, 2], false, `请选择至多两名角色`);
            "step 2";
            for (let target of result.targets) {
                target.draw(2);
            }
        }
    },
    shuizhan: {
        group: ["shuizhan_1", "shuizhan_2"],
        subSkill: {
            1: {
                forced: true,
                trigger: {
                    player: "damageBegin2"
                },
                content(event, trigger, player) {
                    player.judge(function(card) {
                        if (get.color(card) == "red") {
                            trigger.num--;
                        } else {
                            player.draw(2);
                        }
                    })
                }
            },
            2: {
                forced: true,
                trigger: {
                    source: "damageBegin2"
                },
                logTarget: "player",
                content(event, trigger, player) {
                    player.judge(function(card) {
                        if (get.color(card) == "red") {
                            trigger.num++;
                        } else {
                            player.draw(2);
                        }
                    })
                }
            }
        }
    },
    jianji: {
        mod: {
            targetInRange(card) {
                if (card.name == "sha") {
                    return true;
                }
            },
            cardnature(card, player) {
                if (get.name(card) == "sha") {
                    return "thunder";
                }
            },
            globalFrom(from, to, distance) {
				return distance - 2;
			}
        }
    },
    riye_edit: {
        forced: true,
        trigger: {
            player: "phaseBegin"
        },
        async content(event, trigger, player) {
            const result = 
                await player.chooseControl("回复一点体力", "摸两张牌", function(event, player) {
                    if (player.hp == player.maxHp) {
                        return "摸两张牌";
                    } else {
                        return "回复一点体力";
                    }
                }).set("prompt", "回复一点体力或摸两张牌").forResult();

            if (result.control == "回复一点体力") {
                player.recover();
            } else {
                player.draw(2);
            }
        }
    },
    fuhua: {
        trigger: {
            source: "damageSource"
        },
        filter(event, player) {
            if (event._notrigger.includes(event.player)) {
				return false;
			}
			return event.card && event.card.name == "sha" && event.player != player && event.player.isIn();
        },
        content(event, trigger, player) {
            "step 0";
            trigger.player.addMark("poison");
            "step 1";
            trigger.player.addAdditionalSkill("poison");
            "step 2";
            player.discardPlayerCard("he", trigger.player, true);
        }
    },
    jiqun: {
        usable: 2,
        enable: "phaseUse",
        filter(event, player) {
            return player.countCards("h") > 0;
        },
        content(event, player) {
            "step 0";
            player.chooseToDiscard(1, true);
            "step 1";
            player.changeHujia(1, null, true);
        }
    },
    riye_edit_2: {
        mark: true,
        marktext: "☯",
        zhuanhuanji: true,
        forced: true,
        intro: {
            content(storage, player, skill) {
                return `回合结束时，${storage ? "你摸三张牌" : "所有角色弃置两张牌"}。`;
            }
        },
        trigger: {
            player: "phaseEnd"
        },
        async content(event, trigger, player) {
            player.changeZhuanhuanji("riye_edit_2");

            if (player.storage.riye_edit_2) {
                const players = game.filterPlayer();
                
                for (let i = 0; i < players.length; i++) {
                    players[i].chooseToDiscard(2, true);
                }
            } else {
                player.draw(3);
            }
        }
    },

    zibao: {
        forced: true,
        frequent: true,
        trigger: {
            player: "phaseEnd"
        },
        async content(event, trigger, player) {
            let result;
            if (player.getSeatNum() == 1) {
                result = await player
                    .chooseControl("与下家交换座次", "自爆！").forResult();
            } else if (player.getNext().getSeatNum() == 1) {
                result = await player
                    .chooseControl("与上家交换座次", "自爆！").forResult();
            } else {
                result = await player
                    .chooseControl("与上家交换座次", "与下家交换座次", "自爆！").forResult();
            }

            if (result.control == "与上家交换座次") {
                const preplayer = player.getPrevious();

                game.broadcastAll(function(target1, target2) {
                    game.swapSeat(target1, target2);
                }, player, player.getPrevious());

                preplayer.turnOver();
            } else if (result.control == "与下家交换座次") {
                const nextplayer = player.getNext();

                game.broadcastAll(function(target1, target2) {
                    game.swapSeat(target1, target2);
                }, player, player.getNext());

                nextplayer.insertPhase();
            } else {
                const targets = game.filterPlayer(function(current) {
                    return current != player && get.distance(player, current) <= 1;
                });

                for (let i = 0; i < targets.length; i++) {
                    targets[i].damage(5);
                }

                player.die();
            }
        },
        ai: {
            threaten: 8
        }
    },

    dusu: {
        group: ["dusu_1", "dusu_2"],
        subSkill: {
            1: {
                usable: 1,
                enable: "phaseUse",
                prompt: "选择一名其他角色，对其造成一点伤害并赋予其中毒I",
                filterTarget: lib.filter.notMe,
                content() {
                    "step 0";
                    target.damage();
                    "step 1";
                    target.addMark("poison");
                    "step 2";
                    target.addSkill("poison");
                }
            },
            2: {
                usable: 1,
                trigger: {
                    source: "damageSource"
                },
                filter(event, player) {
                    if (event._notrigger.includes(event.player)) {
                        return false;
                    }
                    return event.card && event.card.name == "sha" && event.player != player && event.player.isIn();
                },
                content() {
                    trigger.player.addMark("poison", 2);
                    trigger.player.addSkill("poison");
                }
            }
        }
    },
    qiantao: {
        usable: 1,
        forced: true,
        frequent: true,
        popup: false,
        trigger: {
            player: "damageBegin4"
        },
        logTarget: "player",
        filter(event, player) {
            return event.source.hasMark("poison") && !event.player.hasSkill("qiantao_used");
        },
        content(event, trigger, player) {
            trigger.cancel();
            player.addTempSkill("qiantao_used");
        },
        subSkill: {
            used: { charlotte: true }
        }
    },

    zhiliao: {
        forced: true,
        frequent: true,
        trigger: {
            player: "phaseZhunbeiBegin"
        },
        content(event, player) {
            player.recover(1);
        }
    },
    tongxin: {
        global: "tongxin_global",
        subSkill: {
            global: {
                enable: "phaseUse",
                filter(event, player) {
                    if (player != _status.currentPhase) {
						return false;
					}
					if (!player.countCards("h") || player.hasSkill("tongxin_used")) {
						return false;
					}
                    if (player.hasSkill("tongxin") && game.countPlayer(current => current.hasSkill("tongxin")) == 1) {
                        return false;
                    }
					return game.hasPlayer(current => current.hasSkill("tongxin"));
                },
                filterTarget(card, player, target) {
					return target.hasSkill("tongxin");
				},
				selectTarget() {
					if (game.countPlayer(current => current.hasSkill("tongxin")) > 1) {
						return 1;
					}
					return -1;
				},
                prompt() {
					const player = get.player(),
						targets = game.filterPlayer(current => {
							return current.hasSkill("tongxin");
						});
					let list = get.translation(targets);
					if (targets.length > 1) {
						list += "中的一人";
					}
					return `交给${list}一张牌并选择选项执行效果`;
				},
                prepare(cards, player, targets) {
					targets[0].logSkill("tongxin", [player]);
				},
                async content(event, trigger, player) {
                    const target = event.target;
                    player.addTempSkill("tongxin_used", "phaseUseAfter");

                    const give = (await player.chooseCard("h", "交给目标一张手牌", true).forResult()).cards[0];
                    await player.give(give, target, false);

                    const result = await player.chooseControl("类型", "牌名", "颜色", "花色", "点数").forResult();
                    if (result.control == "类型") {
                        await player.gain(get.discardPile(card => get.type(card) == get.type(give)), "gain2");
                        await target.gain(get.discardPile(card => get.type(card) == get.type(give)), "gain2");
                    } else if (result.control == "牌名") {
                        await player.gain(get.discardPile(card => get.name(card) == get.name(give)), "gain2");
                        await target.gain(get.discardPile(card => get.name(card) == get.name(give)), "gain2");
                    } else if (result.control == "颜色") {
                        await player.gain(get.discardPile(card => get.color(card) == get.color(give)), "gain2");
                        await target.gain(get.discardPile(card => get.color(card) == get.color(give)), "gain2");
                    } else if (result.control == "花色") {
                        await player.gain(get.discardPile(card => get.suit(card) == get.suit(give)), "gain2");
                        await target.gain(get.discardPile(card => get.suit(card) == get.suit(give)), "gain2");
                    } else {
                        await player.gain(get.discardPile(card => get.number(card) == get.number(give)), "gain2");
                        await target.gain(get.discardPile(card => get.number(card) == get.number(give)), "gain2");
                    }
                }
            },
            used: { charlotte: true }
        }
    },

    chuangshi: {
        group: ["chuangshi_1", "chuangshi_2", "chuangshi_3", "chuangshi_4", "chuangshi_5", "chuangshi_6", "chuangshi_7", "chuangshi_8", "chuangshi_9"],
        subSkill: {
            1: {
                usable: 1,
                enable: "phaseUse",
                async content(event, trigger, player) {
                    await player.gain(get.discardPile(true));
                }
            },
            2: {
                usable: 1,
                enable: "phaseUse",
                filter(event, player) {
                    return player.countCards("h") > 0;
                },
                async content(event, trigger, player) {
                    const result = await player.chooseCard("h", "将一张手牌置于牌堆顶", true).forResult();
                    await player.lose(result.cards, ui.cardPile, "invisible", "insert");
                }
            },
            3: {
                usable: 1,
                enable: "phaseUse",
                filter(event, player) {
                    return player.countCards("h") > 0;
                },
                filterTarget: lib.filter.notMe,
                async content(event, trigger, player) {
                    const result = await player.chooseCard("h", "交给目标一张牌", true).forResult();
                    await player.give(result.cards, event.target);
                }
            },
            4: {
                usable: 1,
                enable: "phaseUse",
                filter(event, player) {
                    return player.countCards("h") > 0;
                },
                content(event, trigger, player) {
                    "step 0";
                    const result = player.chooseCard("h", "将一张手牌置于武将牌上", true).forResult();
                    "step 1";
                    player.addToExpansion(result.cards, player, "giveAuto").gaintag.add("chuangshi_4");
                },
                marktext: "物",
                intro: {
                    content: "expansion",
                    markcount: "expansion",
                }
            },
            5: {
                usable: 1,
                enable: "phaseUse",
                filter(event, player) {
                    return player.countExpansions("chuangshi_4") > 0;
                },
                async content(event, trigger, player) {
                    const result = await player
                            .chooseCardButton(player.getExpansions("chuangshi_4"), [1, player.countExpansions("chuangshi_4")], "选择收回任意张“物”", true)
                            .forResult();
                    
                    await player.gain(result.links);
                }
            },
            6: {
                usable: 1,
                enable: "phaseUse",
                async content(event, trigger, player) {
                    await player.draw();
                }
            },
            7: {
                usable: 1,
                enable: "phaseUse",
                async content(event, trigger, player) {
                    await player.chooseToGuanxing(5).set("prompt", "探索：点击或拖动将牌移动到牌堆顶或牌堆底");
                    await player.draw();
                }
            },
            8: {
                usable: 1,
                enable: "phaseUse",
                filter(event, player) {
                    return player.countCards("h");
                },
                async content(event, trigger, player) {
                    const result = await player.chooseCard([1, 2], "h", "选择合成手牌", true).forResult();
                    const card1 = result.cards[0];
                    const suit = get.suit(card1, player),
                        number = get.number(card1, player);
                    
                    let name, nature = null;

                    await player.discard(result.cards);

                    if (result.cards.length == 1) {
                        switch (get.name(card1, player)) {
                            case "sha":
                                if (get.nature(card1, player) == "fire") {
                                    name = "huogong";
                                } else {
                                    name = "shan";
                                }
                                break;
                            case "shan":
                                name = "sha";
                                break;
                            case "tao":
                                name = "jiu";
                                break;
                            case "jiu":
                                name = "tao";
                                break;
                            case "shandian":
                                name = "sha";
                                nature = "thunder";
                                break;
                            case "huogong":
                                name = "sha";
                                nature = "fire";
                                break;
                            case "nanman":
                                name = "wanjian";
                                break;
                            case "wanjian":
                                name = "nanman";
                                break;
                            case "guohe":
                                name = "shunshou";
                                break;
                            case "shunshou":
                                name = "guohe";
                                break;
                            case "taoyuan":
                                name = "wugu";
                                break;
                            case "wugu":
                                name = "taoyuan";
                                break;
                            case "wuzhong":
                                let list = [];
                                for (let card of lib.inpile) {
                                    if (get.type(card) == "trick") {
                                        list.push(["锦囊", "", card]);
                                    }
                                }
                                const result = await player
                                    .chooseButton(["合成：转化成任意一张普通锦囊牌", [list, "vcard"]], false)
                                    .forResult();
                                name = result.links[0][2];
                                break;
                            default:
                                name = "tao";
                        }
                    } else {
                        if (get.name(card1, player) == "wugu" && get.name(result.cards[1], player) == "wuxie") {
                            name = "bingliang";
                        } else if (get.name(card1, player) == "wuxie" && get.name(result.cards[1], player) == "wuxie") {
                            let list = [];
                            for (let card of lib.inpile) {
                                if (get.type(card) == "trick") {
                                    list.push(["锦囊", "", card]);
                                }
                            }
                            const result = await player
                                .chooseButton(["合成：转化成任意一张普通锦囊牌", [list, "vcard"]], false)
                                .forResult();
                            name = result.links[0][2];
                        } else {
                            name = "wuxie";
                        }
                    }

                    const copy = await game.createCard2(name, suit, number, nature);
                    await player.gain(copy);
                }
            },
            9: {
                usable: 1,
                enable: "phaseUse",
                filter(event, player) {
                    return player.countCards("h") > 0;
                },
                async content(event, trigger, player) {
                    const result = await player
                        .chooseControl("雷", "火", "迫", "刺", "速", "迅", "锋", "坚", "重", "退")
                        .forResult();
                    if (result.control == "雷") {
                        await player.chooseToDiscard(1, true);
                        await player.addTempSkill("chuangshi_effect_1");
                    } else if (result.control == "火") {
                        await player.chooseToDiscard(1, true);
                        await player.addTempSkill("chuangshi_effect_2");
                    } else if (result.control == "迫") {
                        await player.chooseToDiscard(1, true);
                        await player.addTempSkill("chuangshi_effect_3");
                    } else if (result.control == "刺") {
                        await player.chooseToDiscard(1, true);
                        await player.addTempSkill("chuangshi_effect_4");
                    } else if (result.control == "速") {
                        await player.chooseToDiscard(1, true);
                        await player.addTempSkill("chuangshi_effect_5");
                    } else if (result.control == "迅") {
                        await player.chooseToDiscard(2, true);
                        await player.addTempSkill("chuangshi_effect_6");
                    } else if (result.control == "锋") {
                        await player.chooseToDiscard(2, true);
                        await player.addTempSkill("chuangshi_effect_7");
                    } else if (result.control == "坚") {
                        await player.chooseToDiscard(2, true);
                        await player.addTempSkill("chuangshi_effect_8");
                    } else if (result.control == "重") {
                        await player.chooseToDiscard(2, true);
                        await player.addTempSkill("chuangshi_effect_9");
                    } else if (result.control == "退") {
                        await player.chooseToDiscard(3, true);
                        await player.addTempSkill("chuangshi_effect_10");
                    }
                }
            },
            effect_1: {
                usable: 1,
                forced: true,
                frequent: true,
                popup: false,
                trigger: {
                    source: "damageBegin1"
                },
                filter(event, player) {
                    return event.card.name == "sha";
                },
                async content(event, trigger, player) {
                    game.setNature(trigger, "thunder");
                }
            },
            effect_2: {
                usable: 1,
                forced: true,
                frequent: true,
                popup: false,
                trigger: {
                    source: "damageBegin1"
                },
                filter(event, player) {
                    return event.card.name == "sha";
                },
                async content(event, trigger, player) {
                    game.setNature(trigger, "fire");
                }
            },
            effect_3: {
                usable: 1,
                forced: true,
                frequent: true,
                popup: false,
                trigger: {
                    player: "useCard"
                },
                filter(event, player) {
                    return event.card.name == "sha";
                },
                async content(event, trigger, player) {
                    await player.draw(2);
                }
            },
            effect_4: {
                usable: 1,
                forced: true,
                frequent: true,
                popup: false,
                trigger: {
                    player: "useCardToPlayered"
                },
                filter(event, player) {
                    return event.card.name == "sha" && event.target.countCards("h") > 0;
                },
                async content(event, trigger, player) {
                    await player.discardPlayerCard(trigger.target, "he", true);
                }
            },
            effect_5: {
                usable: 1,
                forced: true,
                frequent: true,
                popup: false,
                trigger: {
                    player: "useCardToEnd"
                },
                filter(event, player) {
                    return event.card.name == "sha";
                },
                async content(event, trigger, player) {
                    await player.removeSkill("chuangshi_effect_5");
                },
                mod: {
                    targetInRange(card) {
                        if (card.name == "sha") {
                            return true;
                        }
                    }
                }
            },
            effect_6: {
                usable: 1,
                forced: true,
                frequent: true,
                popup: false,
                trigger: {
                    player: "useCardToPlayered"
                },
                filter(event, player) {
                    return event.card.name == "sha";
                },
                async content(event, trigger, player) {
                    await trigger.getParent().directHit.add(trigger.target);
                }
            },
            effect_7: {
                usable: 1,
                forced: true,
                frequent: true,
                popup: false,
                trigger: {
                    source: "damageBegin1"
                },
                filter(event, player) {
                    return event.card.name == "sha";
                },
                async content(event, trigger, player) {
                    trigger.num++;
                }
            },
            effect_8: {
                usable: 1,
                forced: true,
                frequent: true,
                popup: false,
                trigger: {
                    player: "useCardAfter"
                },
                filter(event, player) {
                    return event.card.name == "sha";
                },
                async content(event, trigger, player) {
                    await player.gain(trigger.card, "gain2");
                }
            },
            effect_9: {
                usable: 1,
                forced: true,
                frequent: true,
                popup: false,
                trigger: {
                    player: "useCardToEnd"
                },
                filter(event, player) {
                    return event.card.name == "sha";
                },
                async content(event, trigger, player) {
                    await player.removeSkill("chuangshi_effect_9");
                },
                mod: {
                    selectTarget(card, player, range) {
                        range[1]++;
                    }
                }
            },
            effect_10: {
                usable: 1,
                forced: true,
                frequent: true,
                popup: false,
                trigger: {
                    source: "damageEnd"
                },
                filter(event, player) {
                    return event.card.name == "sha";
                },
                async content(event, trigger, player) {
                    await trigger.player.turnOver();
                }
            }
        }
    },
    bengkui: {
        mark: true,
        limited: true,
        unique: true,
        init(player) {
            player.storage.bengkui = false;
        },
        trigger: {
            player: "dying"
        },
        async content(event, trigger, player) {
            await player.awakenSkill("bengkui");
            const players = game.filterPlayer();
                
            for (let i = 0; i < players.length; i++) {
                await players[i].addSkillBlocker("bengkui");
                await players[i].addSkill("bengkui_ban");
                await players[i].discard(players[i].getCards("hej"));
                await players[i].draw(4);

                const delt = players[i].getHp(true) - 1;
                if (delt > 0) {
                    await players[i].loseHp(delt);
                } else if (delt < 0) {
                    await players[i].recover(-delt);
                }
            }
            await player.changeGroup("shen");
            player.changeSkin("bengkui", "steve_infinity");
            await player.addSkill("bengkui_effect");
            player.storage.bengkui = true;
        },
        skillBlocker(skill, player) {
            return !lib.skill[skill].charlotte && !lib.skill[skill].persevereSkill;
        },
        
        subSkill: {
            effect: {
                charlotte: true,
                forced: true,
                frequent: true,
                popup: false,
                trigger: {
                    player: "phaseBegin"
                },
                content() {
                    let winners = player.getFriends();
                    game.over(player == game.me || winners.includes(game.me));
                }
            },
            ban: {
                charlotte: true,
                mod: {
                    cardEnabled(card, player) {
                        if (card.name == "tao" || card.name == "taoyuan") {
                            return false;
                        }
                    }
                }
            }
        }
    },
    
    jianxiao: {
        usable: 1,
        enable: "phaseUse",
        prompt: "弃置所有手牌并选择一名其他角色",
        filterTarget: lib.filter.notMe,
        filter(event, player) {
            return player.countCards("h") > 0;
        },
        async content(event, trigger, player) {
            const cards = player.countCards("h");
            await player.discard(player.getCards("h"));
            const result = await event.target
                .chooseToDiscard("he", `弃置${get.cnNumber(cards + 1)}张牌或受到2点伤害`, cards + 1)
                .set("ai", function(card) {
                    if (get.type(card) != "basic") {
                        return 10 - get.value(card);
                    }
                    return 8 - get.value(card);
                })
                .forResult();
            "step 3";
            if (!result.bool) {
                await event.target.damage(2);
            }
        },
        check(event, player) {
            let enemies = game.countPlayer(function(current) {
                return get.attitude(player, current) < 0 && current.countCards("h") > 0;
            });
            if (enemies < 1) {
                return false;
            }
            return true;
        },
        ai: {
            damage: true,
            threaten: 2.2,
            expose: 0.6
        }
    },
    huixiang: {
        usable: 1,
        enable: "phaseUse",
        async content(event, trigger, player) {
            const players = game.filterPlayer(function(current) {
                return current.countCards("h") > 0;
            });
            let numbers = [];
            let maxs = 0, max = 0, min = 14;
            let maxplayer, minplayers = [];
                
            for (let target of players) {
                const result = await target
                    .chooseToDiscard(1, true)
                    .set("ai", function(card) {
                        return get.number(card) + (10 - get.value(card)) * 0.2;
                    })
                    .forResult();
                numbers.push(get.number(result.cards));
                if (get.number(result.cards) == max || maxs == 0) {
                    maxs++;
                }
                if (get.number(result.cards) > max) {
                    max = get.number(result.cards);
                    maxplayer = target;
                }
                if (get.number(result.cards) < min) {
                    min = get.number(result.cards);
                }
            }

            if (maxs == 1) {
                for (let target of players) {
                    if (target != maxplayer) {
                        await target.damage(maxplayer);
                    }
                }

                const result = await player
                    .chooseTarget(1, false, "选择一名没赢的其他角色赋予黑暗", (card, player, target) => {
                        return target != player && target != maxplayer && players.indexOf(target) != -1;
                    })
                    .forResult();

                if (result.bool) {
                    await result.targets[0].addTempSkill("heian", { player: "phaseEnd" });
                }
            } else {
                for (let i = 0; i < players.length; i++) {
                    if (numbers[i] > min) {
                        await players[i].chooseToDiscard(2, true);
                    }
                }
            }
        },
        ai: {
            damage: true,
            result: {
                target(player, target) {
                    return get.damageEffect(target, player);
                }
            },
            threaten: 1.6
        }
    },
    heian: {
        persevereSkill: true,
        forced: true,
        frequent: true,
        trigger: {
            player: "useCardAfter"
        },
        filter(event, player) {
            return player.isPhaseUsing();
        },
        async content(event, trigger, player) {
            await player.chooseToDiscard(1, true);
        },
        mod: {
            maxHandcardBase(player, num) {
                return num - 5;
            },
            cardEnabled(card, player) {
                if (get.type(card) == "equip") {
                    return false;
                }
            }
        },
        ai: {
            neg: true
        }
    },

    jingnu: {
        forced: true,
        mod: {
            targetInRange(card) {
                if (card.name == "sha") {
                    return true;
                }
            }
        }
    },
    lveduo: {
        group: ["lveduo_1", "lveduo_2"],
        subSkill: {
            1: {
                enable: "chooseToUse",
                filterCard(card) {
                    return get.color(card) == "black";
                },
                position: "hes",
                viewAs: { name: "shunshou" },
                viewAsFilter(player) {
                    if (!player.countCards("hes", { color: "black" })) {
                        return false;
                    }
                },
                prompt: "将一张黑色牌当顺手牵羊使用",
                check(card) {
                    return 6 - get.value(card);
                },
                mod: {
                    targetInRange(card) {
                        if (card.name == "shunshou") {
                            return true;
                        }
                    }
                }
            },
            2: {
                trigger: {
                    player: "damageEnd"
                },
                filter(event, player) {
                    return event.num > 0;
                },
                getIndex(event, player) {
                    return event.num;
                },
                async content(event, trigger, player) {
                    await player.chooseUseTarget("shunshou");
                }
            }
        }
    },
    jielve: {
        zhuSkill: true,
        limited: true,
        unique: true,
        mark: true,
        trigger: {
            player: "dying"
        },
        filter(event, player) {
            return player.hasZhuSkill("jielve");
        },
        content(event, trigger, player) {
            "step 0";
            player.awakenSkill("jielve");
            player.loseMaxHp();
            player.recoverTo(player.maxHp);
            "step 1";
            player.removeSkill("lveduo");
            player.addSkill("lveduo_upgrade");
        }
    },
    lveduo_upgrade: {
        usable(skill, player) {
            return game.countPlayer(current => {
                return current.group == "lve";
            });
        },
        enable: "phaseUse",
        prompt: "选择一名其他角色",
        filterTarget: lib.filter.notMe,
        content(event, trigger, player) {
            player.gainPlayerCard(target, true, "he", target.countCards("he"));
        }
    },

    zhimo: {
        forced: true,
        trigger: {
            player: "loseHp",
            player: "damageBegin4"
        },
        filter(event, player) {
            return event.name == "loseHp" || event.hasNature();
        },
        content(event, trigger, player) {
            trigger.cancel();
        }
    },
    niangzao: {
        groupSkill: "qun",
        usable: 1,
        enable: "phaseUse",
        filter(event, player) {
            return player.group == "qun";
        },
        async content(event, trigger, player) {
            const { control } = await player
                .chooseControl("变更势力", "中毒", "虚弱", "治疗", "迅捷")
                .forResult();

            if (control == "变更势力") {
                await player.changeGroup("lve");
            } else if (control == "中毒") {
                const { targets } = await player
                    .chooseTarget(1, true, "选择一名其他角色，赋予其中毒I", function(card, player, target) {
                        return player != target;
                    })
                    .forResult();

                await targets[0].addMark("poison");
                await targets[0].addSkill("poison");
            } else if (control == "虚弱") {
                const { targets } = await player
                    .chooseTarget(1, true, "选择一名其他角色，赋予其虚弱", function(card, player, target) {
                        return player != target;
                    })
                    .forResult();

                await targets[0].addTempSkill("weakness", { player: "phaseEnd" });
            } else if (control == "治疗") {
                await player.recover();
            } else {
                await player.addTempSkill("speed");
            }
        }
    },
    zhiyao: {
        groupSkill: "lve",
        group: ["zhiyao_1", "zhiyao_2"],
        subSkill: {
            1: {
                usable: 1,
                enable: "phaseUse",
                filter(event, player) {
                    return player.group == "lve";
                },
                async content(event, trigger, player) {
                    const { control } = await player
                        .chooseControl("掠夺", "伤害", "迟缓", "治疗", "迅捷")
                        .forResult();

                    if (control == "掠夺") {
                        await player.chooseUseTarget("shunshou");
                    } else if (control == "伤害") {
                        const { targets } = await player
                            .chooseTarget(1, true, "选择一名其他角色造成一点伤害", function(card, player, target) {
                                return player != target;
                            })
                            .forResult();

                        await targets[0].damage();
                    } else if (control == "迟缓") {
                        const { targets } = await player
                            .chooseTarget(1, true, "选择一名其他角色，赋予其缓慢", function(card, player, target) {
                                return player != target;
                            })
                            .forResult();

                        await targets[0].addTempSkill("slowness", { player: "phaseEnd" });
                    } else if (control == "治疗") {
                        const { targets } = await player
                            .chooseTarget(1, true, "选择一名角色回复一点体力")
                            .forResult();

                        await targets[0].recover();
                    } else {
                        await player.addTempSkill("speed");
                    }
                }
            },
            2: {
                forced: true,
                trigger: {
                    global: "dieAfter"
                },
                filter(event, player) {
                    return player.group == "lve";
                },
                content(event, trigger, player) {
                    player.changeGroup("qun");
                }
            }
        }
    }
};

export default skills;