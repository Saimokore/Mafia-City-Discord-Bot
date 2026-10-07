import type { Message } from "discord.js";
import { AlertaDAO } from "../../daos/AlertaDAO.js";
import { PlayerDAO } from "../../daos/PlayerDAO.js";
import type { Game } from "../../services/GameService.js";

export class ConsultarJogadorCommand {
    public static async execute(message: Message, game: Game, id: string): Promise<void> {
        console.log(id);
        const player = await game.getPlayerService().loadPlayer(id);
        if (!player) {
            await message.reply("Você não está nesta partida!");
            return;
        }
        await message.reply(player.getInfo());
    }
}

export class NovoJogadorCommand {
    public static async execute(message: Message, fakeId: string): Promise<void> {
        const serverId = message.guild!.id;
        console.log("id: " + fakeId);

        const existingPlayer = await PlayerDAO.getPlayerByUserId(fakeId, serverId);
        if (existingPlayer) {
            await message.reply("Você já está no jogo!");
            return;
        }

        await PlayerDAO.createPlayer(serverId, fakeId, "testbro");
        await message.reply("Você entrou no jogo!");
    }
}

export class CriarAlertaCommand {
    public static async execute(message: Message, game: Game): Promise<void> {
        const partida = await game.getPartida();
        if (!partida) {
            await message.reply("Nenhuma partida ativa neste servidor.");
            return;
        }
        await AlertaDAO.createAlerta(
            message.guild!.id,
            message.author.id,
            partida.getEtapaAtual(),
            "Você recebeu uma oferta! Digite /offer para aceitar ou recusar."
        );
    }
}

export class PingCommand {
    public static async execute(message: Message): Promise<void> {
        await message.reply("🏓 Pong!");
    }
}
