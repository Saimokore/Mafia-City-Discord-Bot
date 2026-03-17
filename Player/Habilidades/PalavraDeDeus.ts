import { MessageFlags, type ModalSubmitInteraction } from "discord.js";
import { PlayerDAO } from "../../DAOs/PlayerDAO.js";
import type { Game } from "../../Game.js";
import { Habilidade } from "../Habilidade.js";
import { ActionDAO } from "../../DAOs/ActionDAO.js";
import { Prisma } from '@prisma/client';

export type PrismaAction = Prisma.ActionGetPayload<{
    include: {
        alvos: true,
        habilidade: true
    }
}>;


export class PalavraDeDeus extends Habilidade {
    constructor(usos?: number, status?: string) {
        super("Palavra de Deus", "Ofensiva", 10000, "Noite", [], status || "DISPONIVEL");
    }

     public override async ativar(game: Game, action: PrismaAction): Promise<void> {
        const alvoId = action.alvos[0]!.id;
        if (!alvoId) {
            console.error(`Nenhum player encontrado para guildId ${game.getGuildId()}`);
            return;
        }
        
        this.atacarPlayer(game, alvoId, action);
    }

    public override async resolverModal(interaction: ModalSubmitInteraction, game: Game, quemUsouId: string) {
        const selectedUsers = interaction.fields.getSelectedUsers(`select_${this.getNome()}`);
        if (!selectedUsers) return await interaction.reply({ content: "Ocorreu um erro ao buscar suas ofertas. Tente novamente mais tarde.", flags: MessageFlags.Ephemeral });
        const alvoId = selectedUsers.firstKey()!.toString(); // pega o primeiro, se tiver mais de um temos que fazer um map

        const emissorPlayer = await PlayerDAO.getPlayerById(quemUsouId, game.getGuildId());
        const alvosValidos = [];
        if (!emissorPlayer) {
            console.error(`Player emissor não encontrado para id ${quemUsouId} e guildId ${game.getGuildId()}`);
            return await interaction.reply({ content: "Ocorreu um erro ao buscar suas ofertas. Tente novamente mais tarde.", flags: MessageFlags.Ephemeral });
        }

        const jogadorAlvo = await PlayerDAO.getPlayerById(alvoId, game.getGuildId());
        console.log("jogadorAlvo: " + jogadorAlvo?.id)
        if (!jogadorAlvo) {
            return interaction.reply({ content: "❌ **Erro:** Esse usuário não está participando da partida atual!" });
        }

        if (!jogadorAlvo.estaVivo) {
            return interaction.reply({ content: "👻 **Erro:** Você só pode mirar em jogadores vivos." });
        }

        if (alvoId === interaction.user.id) {
            // mudar dependendo da habilidade
            // return interaction.reply({ content: "❌ **Erro:** Você não pode usar essa habilidade em si mesmo!" });
        }

        const habilidade = emissorPlayer.habilidades.find(hab => hab.nome === this.getNome());

        let dadosExtraEmissor = JSON.parse(emissorPlayer.dadosExtra || "[]");

        if (!Array.isArray(dadosExtraEmissor)) {
            console.warn(`[Aviso] dadosExtra de ${quemUsouId} não era um array. Resetando para [].`);
            dadosExtraEmissor = [];
        }
        
        let index = dadosExtraEmissor.findIndex((d: any) => d.tipo === "ALVOS_RECUSADOS");

        const listaAlvos = dadosExtraEmissor[index].alvos;
        
        if (!listaAlvos.includes(alvoId)) {
            return interaction.reply({ content: "Alvo não recusou \"Arrependimento\", use a habilidade evangelho primeiro!"})
        }
        
        await ActionDAO.createAction(quemUsouId, game.getGuildId(), await game.getEtapaAtual(), habilidade!.id, [alvoId]);
        console.log("Modal submetido, alvo:", alvoId);
        return interaction.reply({ content: `Habilidade ${this.getNome()} usada com sucesso!` });
    }

}