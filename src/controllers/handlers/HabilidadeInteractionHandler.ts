import {
    MessageFlags,
    type Interaction
} from "discord.js";
import { HabilidadeDAO } from "../../daos/HabilidadeDAO.js";
import type { HabilidadeDinamica } from "../../domain/skills/HabilidadeDinamica.js";
import type { Game } from "../../services/GameService.js";

export class HabilidadeInteractionHandler {
    public static async execute(interaction: Interaction, game: Game): Promise<void> {
        if (interaction.isStringSelectMenu() && interaction.customId === "select_habilidade_inicial") {
            const nomeHabilidade = interaction.values[0];
            const userId = interaction.user.id;
            if (!nomeHabilidade) {
                await interaction.update({ content: "Habilidade inválida selecionada.", components: [] });
                return;
            }

            const habilidadeInstance = await game.getPlayerService().getHabilidadePlayer(userId, nomeHabilidade);
            if (!habilidadeInstance) return;

            const modal = await habilidadeInstance.buildModal(interaction, game, userId);
            if (!modal) {
                console.error("Erro ao construir o modal para a habilidade:", nomeHabilidade);
                return;
            }
            await interaction.showModal(modal);
            return;
        }

        if (interaction.isModalSubmit() && interaction.customId.startsWith("skill_modal_")) {
            const partes = interaction.customId.split("_");
            const nomeHabilidade = partes[2];
            if (!nomeHabilidade) {
                console.error("Nome da habilidade não encontrado no customId do modal:", interaction.customId);
                await interaction.reply({ content: "Habilidade inválida. Tente novamente.", flags: MessageFlags.Ephemeral });
                return;
            }

            const habilidade = await HabilidadeDAO.getHabilidade(nomeHabilidade, interaction.user.id, interaction.guildId!);
            if (!habilidade) {
                console.error("Habilidade não encontrada select");
                await interaction.reply("Erro, habilidade não encontrada");
                return;
            }

            const habilidadeInstance = await game.getPlayerService().getHabilidadePlayer(interaction.user.id, nomeHabilidade);
            if (!habilidadeInstance) {
                console.error("Habilidade não encontrada para o modal submetido:", nomeHabilidade);
                await interaction.reply({ content: "Habilidade não encontrada. Tente novamente.", flags: MessageFlags.Ephemeral });
                return;
            }
            await habilidadeInstance.resolverModal(interaction, game);
            return;
        }

        if ((interaction.isStringSelectMenu() || interaction.isModalSubmit()) && interaction.customId.startsWith("skill_input_")) {
            await interaction.deferUpdate();
            const partes = interaction.customId.split("_");
            const nomeHabilidade = partes[2];
            const emissorId = partes[3];

            const alvoPlayer = await game.getPlayerService().loadPlayer(interaction.user.id);
            const emissorPlayer = await game.getPlayerService().loadPlayer(emissorId!);
            if (!alvoPlayer || !emissorPlayer) {
                await interaction.followUp({ content: "❌ Erro: Jogador não encontrado.", flags: MessageFlags.Ephemeral });
                return;
            }

            const habilidade = emissorPlayer.getHabilidade(nomeHabilidade!);
            if (habilidade) {
                await (habilidade as HabilidadeDinamica).resolverInput(game, interaction, emissorPlayer);
                await interaction.editReply({ content: "✅ Resposta registrada!", components: [] });
            }
        }
    }
}
