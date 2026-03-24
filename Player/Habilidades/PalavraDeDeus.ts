import { InteractionResponse, MessageFlags, type ModalSubmitInteraction } from "discord.js";
import { Game } from '../../Managers/GameManager.js';
import { Habilidade } from "../Habilidade.js";
import { ActionDAO } from "../../DAOs/ActionDAO.js";
import type { Action } from "../Action.js";
import type { Player } from "../Player.js";

export class PalavraDeDeus extends Habilidade {
    constructor(usos?: number, status?: string) {
        super("Palavra de Deus", "Ofensiva", 10000, "Noite", [], status || "DISPONIVEL");
    }

     public override async ativar(game: Game, action: Action): Promise<boolean> {
        const alvo = action.getAlvos()[0]!;
        
        return this.atacarPlayer(game, alvo, action);
    }

    protected override async processarUsoModal(interaction: ModalSubmitInteraction, game: Game, emissor: Player, alvo: Player, habilidadeInstance: Habilidade): Promise<InteractionResponse<boolean> | undefined> {
        const habilidade = emissor.getHabilidade(this.getNome());

        let dadosExtraEmissor = emissor.getDadosExtra();

        let dadosAlvos = dadosExtraEmissor.find(d => d.tipo === "ALVOS_RECUSADOS");
        if (!dadosAlvos) {
            return interaction.reply({ content: "Você ainda não tem alvos que recusaram o arrependimento!" });
        }
        const listaAlvos = dadosAlvos.alvos;
        
        if (!listaAlvos.includes(alvo.getId())) {
            return interaction.reply({ content: "Alvo não recusou \"Arrependimento\", use a habilidade evangelho primeiro!"})
        }

        await ActionDAO.createAction(emissor.getId(), game.getGuildId(), this.getTipo(), await game.getEtapaAtual(), habilidade!.getId()!, [alvo.getId()]);
        console.log("Modal submetido, alvo:", alvo.getId());

        return interaction.reply({ content: `Habilidade ${this.getNome()} usada com sucesso!` });
    }

}