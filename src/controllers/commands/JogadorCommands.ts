import { MessageFlags, type ChatInputCommandInteraction, type Message } from "discord.js";
import { AlertaDAO } from "../../daos/AlertaDAO.js";
import { PlayerDAO } from "../../daos/PlayerDAO.js";
import type { Game } from "../../services/GameService.js";
import type { ICommand } from "./ICommand.js";

export class ConsultarJogadorCommand implements ICommand<ChatInputCommandInteraction, [game: Game]> {
    public readonly name = "me";

    public async execute(interaction: ChatInputCommandInteraction, game: Game): Promise<void> {
        const id = interaction.options.getString("player_id") ?? interaction.user.id;
        const player = await game.getPlayerService().loadPlayer(id);
        if (!player) {
            await interaction.reply({ content: "Você não está nesta partida!", flags: MessageFlags.Ephemeral });
            return;
        }
        await interaction.reply({ content: player.getInfo(), flags: MessageFlags.Ephemeral });
    }
}

export class NovoJogadorCommand implements ICommand<ChatInputCommandInteraction, [game: Game]> {
    public readonly name = "newplayer";

    public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const fakeId = interaction.options.getString("player_id", true);
        const serverId = interaction.guildId!;
        const existingPlayer = await PlayerDAO.getPlayerByUserId(fakeId, serverId);
        if (existingPlayer) {
            await interaction.reply({ content: "Você já está no jogo!", flags: MessageFlags.Ephemeral });
            return;
        }

        await PlayerDAO.createPlayer(serverId, fakeId, "testbro");
        await interaction.reply({ content: "Você entrou no jogo!", flags: MessageFlags.Ephemeral });
    }
}

export class CriarAlertaCommand implements ICommand<ChatInputCommandInteraction, [game: Game]> {
    public readonly name = "criaralerta";

    public async execute(interaction: ChatInputCommandInteraction, game: Game): Promise<void> {
        const partida = await game.getPartida();
        if (!partida) {
            await interaction.reply({ content: "Nenhuma partida ativa neste servidor.", flags: MessageFlags.Ephemeral });
            return;
        }
        await AlertaDAO.createAlerta(
            interaction.guildId!,
            interaction.user.id,
            partida.getEtapaAtual(),
            "Você recebeu uma oferta! Digite /offer para aceitar ou recusar."
        );
        await interaction.reply({ content: "✅ Alerta criado.", flags: MessageFlags.Ephemeral });
    }
}

export class PingCommand implements ICommand<ChatInputCommandInteraction, [game: Game]> {
    public readonly name = "ping";

    public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.reply("🏓 Pong!");
    }
}
