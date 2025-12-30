import { lib, game, ui, get, ai, _status } from "../../../noname.js";
import "../character/index.js";

export async function precontent(config, pack) {
	lib.translate.mc1_character_config = "MC-1";

	const faction_datas = {
		wang: {
			color: "#991111",
			translate: "亡"
		}
	};

	for (let i in faction_datas) {
		lib.group.push(i);
		lib.translate[i] = faction_datas[i].translate;
		lib.translate[`${i}Color`] = faction_datas[i].color;
	}
}