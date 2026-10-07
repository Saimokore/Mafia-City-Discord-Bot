import {
    ActionRowBuilder,
    MessageFlags,
    StringSelectMenuBuilder,
    type ChatInputCommandInteraction
} from "discord.js";
import type { Game } from "../../services/GameService.js";

export class AcaoCommand {
    public static async execute(interaction: ChatInputCommandInteraction, game: Game): Promise<void> {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const player = await game.getPlayerService().loadPlayer(interaction.user.id);
        const partida = await game.getPartida();
        if (!partida) {
            console.log("Partida não encontrada, interação falhou");
            return;
        }

        if (!player || !player.estaVivo()) {
            await interaction.editReply({ content: "Você não pode agir agora." });
            return;
        }

        if (player.getUserChat() != interaction.channelId) {
            await interaction.editReply({ content: `Use o comando no seu chat privado <#${player.getUserChat()}>` });
            return;
        }

        const habilidades = player.getHabilidades();
        if (!habilidades || habilidades.length === 0) {
            await interaction.editReply({ content: "Você não possui habilidades para usar." });
            return;
        }
        const habilidadesFiltradas = habilidades.filter(hab =>
            hab.getTipo() === "Passiva" ||
            hab.getEtapa() != "Atemporal" ||
            hab.getEtapa() != partida.getTempoEtapa()
        );

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId("select_habilidade_inicial")
            .setPlaceholder("Escolha uma habilidade para usar hoje")
            .addOptions(habilidadesFiltradas.map(hab => ({
                label: hab.getNome(),
                description: `Tipo: ${hab.getTipo()}`,
                value: hab.getNome()
            })));

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
        await interaction.editReply({ components: [row] });
    }
}
