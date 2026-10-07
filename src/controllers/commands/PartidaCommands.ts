import type { Message } from "discord.js";
import { GuildConfigDAO } from "../../daos/GuildConfigDAO.js";
import { PartidaDAO } from "../../daos/PartidaDAO.js";
import { PlayerDAO } from "../../daos/PlayerDAO.js";
import type { Game } from "../../services/GameService.js";

export class CriarPartidaCommand {
    public static async execute(message: Message): Promise<void> {
        const serverId = message.guild!.id;
        const partidaExistente = await PartidaDAO.getPartida(serverId);
        if (partidaExistente && partidaExistente.status !== "FINALIZADA") {
            await message.reply("Já existe uma partida criada neste servidor. Use `!endGame` para finalizar a partida atual antes de criar uma nova.");
            return;
        }
        if (partidaExistente?.status === "FINALIZADA") {
            await message.reply("Existe uma partida finalizada neste servidor. Use `!deleteGame` para deletar a partida finalizada antes de criar uma nova.");
            return;
        }

        const config = await GuildConfigDAO.getConfig(serverId);
        if (!config?.canalDiurnoId) {
            await message.reply("❌ Antes de criar uma partida, defina o canal diurno usando `!setdiurno` no canal desejado.");
            return;
        }
        if (!config.canalAnuncioId) {
            await message.reply("❌ Antes de criar uma partida, defina o canal de anúncios usando `!setanuncio` no canal desejado.");
            return;
        }

        await PartidaDAO.createPartida(serverId);
        await message.reply("Uma nova partida foi criada! O lobby está aberto. Digitem `!join` para entrar!");
    }
}

export class EntrarPartidaCommand {
    public static async execute(message: Message): Promise<void> {
        const serverId = message.guild!.id;
        const existingPlayer = await PlayerDAO.getPlayerByUserId(message.author.id, serverId);
        if (existingPlayer) {
            await message.reply("Você já está no jogo!");
            return;
        }

        await PlayerDAO.createPlayer(serverId, message.author.id, message.author.username);
        await message.reply("Você entrou no jogo!");
    }
}

export class SairPartidaCommand {
    public static async execute(message: Message): Promise<void> {
        const removedPlayer = await PlayerDAO.deletePlayer(message.author.id);
        if (!removedPlayer) {
            await message.reply("Você não está no jogo!");
            return;
        }
        await message.reply("Você saiu do jogo!");
    }
}

export class AvancarEtapaCommand {
    public static async execute(message: Message, game: Game): Promise<void> {
        if (game) {
            void game.avancarEtapa();
        } else {
            await message.reply("Nenhuma partida ativa neste servidor.");
        }
    }
}

export class EncerrarPartidaCommand {
    public static async execute(message: Message, game: Game): Promise<void> {
        const serverId = message.guild!.id;
        if (!game) {
            await message.reply("Nenhuma partida ativa neste servidor.");
            return;
        }
        if (await PartidaDAO.getPartida(serverId).then(partida => partida?.status) === "FINALIZADA") {
            await message.reply("A partida já foi finalizada. Use `!deletegame` para deletar a partida finalizada.");
            return;
        }

        void game.terminarJogo();
        await message.reply("Jogo terminado neste servidor!");
    }
}

export class DeletarPartidaCommand {
    public static async execute(message: Message, game: Game): Promise<void> {
        const serverId = message.guild!.id;
        if (!game) {
            await message.reply("Nenhuma partida ativa neste servidor.");
            return;
        }
        const status = await PartidaDAO.getPartida(serverId).then(partida => partida?.status);
        if (status !== "FINALIZADA") {
            await message.reply("Você só pode deletar uma partida que foi finalizada. Finalize a partida primeiro usando `!endGame`.");
            return;
        }

        void game.deletarJogo();
        await message.reply("Jogo deletado neste servidor!");
    }
}

export class ReiniciarPartidaCommand {
    public static async execute(message: Message, game: Game): Promise<void> {
        await game.terminarJogo();
        await game.deletarJogo();
        await PartidaDAO.createPartida(message.guild!.id);
        await message.reply("Jogo reiniciado neste servidor! O lobby está aberto. Digitem `!join` para entrar!");
    }
}
