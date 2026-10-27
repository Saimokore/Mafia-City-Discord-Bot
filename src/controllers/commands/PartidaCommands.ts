import { InteractionResponse, MessageFlags, type ChatInputCommandInteraction, type Message } from "discord.js";
import { GuildConfigDAO } from "../../daos/GuildConfigDAO.js";
import { PartidaDAO } from "../../daos/PartidaDAO.js";
import { PlayerDAO } from "../../daos/PlayerDAO.js";
import type { Game } from "../../services/GameService.js";
import type { ICommand } from "./ICommand.js";

export class CriarPartidaCommand implements ICommand<ChatInputCommandInteraction, [game: Game]> {
    public readonly name = "creategame";

    public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const serverId = interaction.guildId!;

        // checa se a partida existe ou se ta finalizada
        if (!await this.checkStatusPartida(interaction, serverId)) return;

        // checa se os canais de diurno e anúncio tao configurados
        if (!await this.checkCanaisConfig(interaction, serverId)) return;

        await PartidaDAO.createPartida(serverId);
        await interaction.reply("Uma nova partida foi criada! O lobby está aberto. Digitem `/join` para entrar!");
    }

    public async checkStatusPartida(interaction: ChatInputCommandInteraction, serverId: string): Promise<boolean> {
        const partidaExistente = await PartidaDAO.getPartida(serverId);

        if (partidaExistente && partidaExistente.status !== "FINALIZADA") {
            await interaction.reply({ content: "Já existe uma partida criada neste servidor. Use `/endgame` para finalizar a partida atual antes de criar uma nova.", flags: MessageFlags.Ephemeral });
            return false;
        }
        if (partidaExistente?.status === "FINALIZADA") {
            await interaction.reply({ content: "Existe uma partida finalizada neste servidor. Use `/deletegame` para deletar a partida finalizada antes de criar uma nova.", flags: MessageFlags.Ephemeral });
            return false;
        }

        return true;
    }

    public async checkCanaisConfig(interaction: ChatInputCommandInteraction, serverId: string): Promise<boolean> {
        const config = await GuildConfigDAO.getConfig(serverId);
        if (!config?.canalDiurnoId) {
            await interaction.reply({
                content: "❌ Antes de continuar, defina o canal diurno usando `/setdiurno` no canal desejado.",
                flags: MessageFlags.Ephemeral
            });
            return false;
        }

        if (!config.canalAnuncioId) {
            await interaction.reply({
                content: "❌ Antes de continuar, defina o canal de anúncios usando `/setanuncio` no canal desejado.",
                flags: MessageFlags.Ephemeral
            });
            return false;
        }

        return true;
    }
}

export class EntrarPartidaCommand implements ICommand<ChatInputCommandInteraction, [game: Game]> {
    public readonly name = "join";

    public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const serverId = interaction.guildId!;
        const existingPlayer = await PlayerDAO.getPlayerByUserId(interaction.user.id, serverId);
        if (existingPlayer) {
            await interaction.reply({ content: "Você já está no jogo!", flags: MessageFlags.Ephemeral });
            return;
        }

        await PlayerDAO.createPlayer(serverId, interaction.user.id, interaction.user.username);
        await interaction.reply("Você entrou no jogo!");
    }
}

export class SairPartidaCommand implements ICommand<ChatInputCommandInteraction, [game: Game]> {
    public readonly name = "leave";

    public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const removedPlayer = await PlayerDAO.deletePlayer(interaction.user.id);
        if (!removedPlayer) {
            await interaction.reply({ content: "Você não está no jogo!", flags: MessageFlags.Ephemeral });
            return;
        }
        await interaction.reply("Você saiu do jogo!");
    }
}

export class AvancarEtapaCommand implements ICommand<ChatInputCommandInteraction, [game: Game]> {
    public readonly name = "avancaretapa";

    public async execute(interaction: ChatInputCommandInteraction, game: Game): Promise<void> {
        await game.avancarEtapa();
        await interaction.reply("⏩ Etapa avançada.");
    }
}

export class EncerrarPartidaCommand implements ICommand<ChatInputCommandInteraction, [game: Game]> {
    public readonly name = "endgame";

    public async execute(interaction: ChatInputCommandInteraction, game: Game): Promise<void> {
        const serverId = interaction.guildId!;
        const status = await PartidaDAO.getPartida(serverId).then(partida => partida?.status);
        if (status === "FINALIZADA") {
            await interaction.reply({ content: "A partida já foi finalizada. Use `/deletegame` para deletar a partida finalizada.", flags: MessageFlags.Ephemeral });
            return;
        }

        await game.terminarJogo();
        await interaction.reply("Jogo terminado neste servidor!");
    }
}

export class DeletarPartidaCommand implements ICommand<ChatInputCommandInteraction, [game: Game]> {
    public readonly name = "deletegame";

    public async execute(interaction: ChatInputCommandInteraction, game: Game): Promise<void> {
        const serverId = interaction.guildId!;
        const status = await PartidaDAO.getPartida(serverId).then(partida => partida?.status);
        if (status !== "FINALIZADA") {
            await interaction.reply({ content: "Você só pode deletar uma partida que foi finalizada. Finalize a partida primeiro usando `/endgame`.", flags: MessageFlags.Ephemeral });
            return;
        }

        await game.deletarJogo();
        await interaction.reply("Jogo deletado neste servidor!");
    }
}

export class ReiniciarPartidaCommand implements ICommand<ChatInputCommandInteraction, [game: Game]> {
    public readonly name = "restartgame";

    public async execute(interaction: ChatInputCommandInteraction, game: Game): Promise<void> {
        await game.terminarJogo();
        await game.deletarJogo();
        await PartidaDAO.createPartida(interaction.guildId!);
        await interaction.reply("Jogo reiniciado neste servidor! O lobby está aberto. Digitem `/join` para entrar!");
    }
}
