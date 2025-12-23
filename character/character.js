import { lib, game, ui, get, ai, _status } from "../../../noname.js";

/** @type { importCharacterConfig['character'] } */
const characters = {
    slime: {
        sex: "none",
        group: "qun",
        hp: 4,
        skills: ["fenlie", "ronghe", "liexi"]
    },
    skeleton: {
        sex: "male",
        group: "wang",
        hp: 4,
        skills: ["jinggong", "qianggong"]
    },
    zombie: {
        sex: "male",
        group: "wang",
        hp: 4,
        skills: ["riye", "ganran", "bianzhong"]
    }
};

for (let i in characters) {
	characters[i].img = "extension/MC-1/image/character/" + i + ".jpg";
}

export default characters;