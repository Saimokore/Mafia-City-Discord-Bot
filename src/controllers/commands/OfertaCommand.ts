import {
    ActionRowBuilder,
    MessageFlags,
    StringSelectMenuBuilder,
    type ChatInputCommandInteraction
} from "discord.js";
import { OfertaDAO } from "../../daos/OfertaDAO.js";
import type { Game } from "../../services/GameService.js";
import { OfertaView } from "../../views/components/OfertaView.js";

export class OfertaCommand {
    public static async execute(interaction: ChatInputCommandInteraction, game: Game): Promise<void> {
        const player = await game.getPlayerService().loadPlayer(interaction.user.id);
        const partida = await game.getPartida();
        if (!partida) {
            console.log("Partida não encontrada, interação falhou");
            return;
        }

        if (!player || !player.estaVivo()) {
            await interaction.reply({ content: "Você não pode agir agora." });
            return;
        }

        if (player.getUserChat() != interaction.channelId) {
            await interaction.reply({
                content: `Use o comando no seu chat privado <#${player.getUserChat()}>`,
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const ofertas = await OfertaDAO.getOfertasForPlayerId(partida.getGuildId(), player.getId());
        if (!ofertas || ofertas.length === 0) {
            console.error("Oferta não encontrada");
            await interaction.reply({ content: "Você não possui nenhuma oferta!" });
            return;
        }

        if (ofertas.length > 1) {
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId("offer_select")
                .setPlaceholder("Escolha uma oferta")
                .addOptions(ofertas.map(of => ({
                    label: of.nomeOferta,
                    value: of.id
                })));
            const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
            await interaction.reply({ components: [row] });
            return;
        }

        const oferta = ofertas[0];
        if (!oferta) {
            console.error("seila mano nao acho a oferta");
            return;
        }

        const emissor = await game.getPlayerService().loadPlayer(oferta.emissorId);
        if (!emissor) {
            console.error(`Emissor ${oferta.emissorId} não encontrado para a oferta ${oferta.id}.`);
            await interaction.reply({ content: "Não foi possível carregar o emissor desta oferta." });
            return;
        }
        await interaction.reply(OfertaView.renderOferta(emissor, oferta.nomeOferta, oferta.id));
    }
}
