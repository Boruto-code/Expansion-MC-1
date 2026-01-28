import { lib, game, ui, get, ai, _status } from "../../../noname.js";
import "../character/index.js";

export function precontent(config, pack) {
	lib.translate.mc1_character_config = "MC-1";

	game.addGroup("wang", "亡", "亡灵", { color: "#991111" });
	game.addGroup("lve", "掠", { color: "#959b9b"});
}