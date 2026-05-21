import { lib, game, ui, get, ai, _status } from "../../../noname.js";

/** @type { importCharacterConfig['character'] } */
const characters = {
    slime: {
        sex: "none",
        group: "qun",
        hp: 4,
        skills: ["fenlie", "weigong", "liexi"]
    },
    skeleton: {
        sex: "male",
        group: "wang",
        hp: 4,
        skills: ["feishi", "qianggong", "zhijian"]
    },
    zombie: {
        sex: "male",
        group: "wang",
        hp: 4,
        skills: ["riye", "bianzhong", "zhaohuan"],
        isZhugong: true
    },
    creeper: {
        sex: "none",
        group: "qun",
        hp: 4,
        skills: ["zibao"]
    },
    cavespider: {
        sex: "none",
        group: "qun",
        hp: 3,
        skills: ["dusu", "qiantao"]
    },
    allay: {
        sex: "none",
        group: "qun",
        hp: 3,
        skills: ["zhiliao", "tongxin"]
    },
    steve: {
        sex: "male",
        group: "qun",
        hp: 3,
        maxHp: 4,
        skills: ["chuangshi", "rushi", "bengkui"]
    },
    warden: {
        sex: "none",
        group: "qun",
        hp: 8,
        skills: ["jianxiao", "huixiang", "heian"]
    },
    pillager: {
        sex: "male",
        group: "lve",
        hp: 4,
        skills: ["jingnu", "lveduo", "jielve"],
        isZhugong: true
    },
    witch: {
        sex: "female",
        group: "qun",
        hp: 4,
        skills: ["zhimo", "niangzao", "zhiyao"],
        doubleGroup: ["qun", "lve"]
    },
    phantom: {
        sex: "none",
        group: "qun",
        hp: 4,
        skills: ["xiangkong", "yexi"]
    }
};

for (let i in characters) {
	characters[i].img = "extension/MC-1/image/character/" + i + ".jpg";
}

export default characters;