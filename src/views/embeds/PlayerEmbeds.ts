import { EmbedBuilder } from "discord.js";
import { Cargo } from "../../domain/entities/Cargo.js";

export class PlayerEmbeds {
    public static boasVindasPlayer(cargo: Cargo): EmbedBuilder {
        return new EmbedBuilder()
            .setTitle(`Bem-vindo à Cidade!`)
            .setDescription(`Seu cargo na partida é: **${cargo.getNome()}**.\n\n${cargo.getDescricao()}`)
            .setColor(0x2b2d31)
            .setFooter({ text: "Mantenha seu cargo em segredo!" });
    }

    public static relatorioDistribuicao(sucessos: number, falhas: number): EmbedBuilder {
        return new EmbedBuilder()
            .setTitle("Distribuição de Cargos Concluída")
            .setDescription(`Sucessos: ${sucessos}\n Falhas: ${falhas}`)
            .setColor(falhas > 0 ? 0xffa500 : 0x00ff00);
    }
}