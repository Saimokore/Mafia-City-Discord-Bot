import {
    ActionRowBuilder,
    EmbedBuilder,
    MessageFlags,
    StringSelectMenuBuilder,
    type Interaction
} from "discord.js";
import { OfertaDAO } from "../../daos/OfertaDAO.js";
import type { Game } from "../../services/GameService.js";
import { OfertaView } from "../../views/components/OfertaView.js";

export class OfertaInteractionHandler {
    public static async execute(interaction: Interaction, game: Game): Promise<void> {
        if (interaction.isButton() && interaction.customId.startsWith("offer_button")) {
            const partes = interaction.customId.split("_");
            const accept = partes[2] === "accept";
            const nomeOferta = partes[3];
            const offerId = partes[4];

            if (accept && nomeOferta === "Arrependimento") {
                const playerAlvo = await game.getPlayerService().loadPlayer(interaction.user.id);
                if (!playerAlvo || !playerAlvo.getCargo()) {
                    console.error("Player alvo não encontrado no jogo para oferta de Arrependimento.");
                    await interaction.reply({
                        content: "Erro interno ao processar a oferta. Player não encontrado.",
                        flags: MessageFlags.Ephemeral
                    });
                    return;
                }
                const cargoInstancia = playerAlvo.getCargo();

                if (cargoInstancia && cargoInstancia.getAlinhamento() !== "Cidade") {
                    const habilidadesAtivas = (playerAlvo.getHabilidades() || [])
                        .filter(h => h.getStatus() !== "IMPEDIDA");
                    if (habilidadesAtivas.length === 0) {
                        await interaction.reply({
                            content: "Você não tem habilidades ativas para perder!",
                            flags: MessageFlags.Ephemeral
                        });
                        return;
                    }

                    const selectMenu = new StringSelectMenuBuilder()
                        .setCustomId(`offer_choose_loss_${offerId}`)
                        .setPlaceholder("Escolha uma habilidade para bloquear...")
                        .addOptions(habilidadesAtivas.map(hab => ({
                            label: hab.getNome(),
                            value: hab.getId()!
                        })));
                    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
                    await interaction.reply({
                        content: "Como você não é da Cidade, aceitar o Arrependimento exige um sacrifício. **Escolha uma habilidade para perder acesso até o Evangelista morrer:**",
                        components: [row],
                        flags: MessageFlags.Ephemeral
                    });
                    return;
                }
            }

            await OfertaDAO.updateOferta(offerId!, accept);
            const embed = new EmbedBuilder()
                .setTitle(`A Oferta ${nomeOferta} foi ${accept ? "aceita" : "recusada"}!`)
                .setColor(accept ? "#36a121" : "#b92626");
            await interaction.update({ embeds: [embed], components: [] });
            return;
        }

        if (interaction.isStringSelectMenu() && interaction.customId.startsWith("offer_choose_loss_")) {
            const offerId = interaction.customId.split("_")[3];
            const habilidadeIdEscolhida = interaction.values[0];
            const parametrosJson = JSON.stringify({ habilidadePerdidaId: habilidadeIdEscolhida });
            await OfertaDAO.updateOferta(offerId!, true, parametrosJson);

            const embed = new EmbedBuilder()
                .setTitle("Oferta de Arrependimento Aceita!")
                .setDescription("Você perdeu acesso à habilidade escolhida.")
                .setColor("#36a121");
            await interaction.update({ embeds: [embed], components: [], content: "" });
            return;
        }

        if (interaction.isStringSelectMenu() && interaction.customId.startsWith("offer_select")) {
            const ofertaId = interaction.values[0];
            const oferta = await OfertaDAO.getOfertaById(ofertaId!);
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
}
