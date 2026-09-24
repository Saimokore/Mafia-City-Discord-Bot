import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { Player } from "../../domain/entities/Player.js";

export class OfertaView {
    public static renderOferta(emissor: Player, nomeOferta: string, ofertaId: string) {
        const cargoNome = emissor.getCargo()?.getNome() || "Desconhecido";

        const embed = new EmbedBuilder()
            .setTitle(`Uma Oferta foi feita para você!`)
            .setDescription(`**${cargoNome}** está te oferecendo **${nomeOferta}**.`)
            .setColor("#2b2d31")
            .setFooter({ text: "Escolha com sabedoria. Esta decisão pode ser permanente para esta etapa." });

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`offer_button_accept_${nomeOferta}_${ofertaId}`)
                .setLabel("Aceitar")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`offer_button_deny_${nomeOferta}_${ofertaId}`)
                .setLabel("Recusar")
                .setStyle(ButtonStyle.Danger)
        );

        return {
            embeds: [embed],
            components: [row]
        };
    }
}