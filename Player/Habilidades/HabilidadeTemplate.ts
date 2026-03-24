import { InteractionResponse, LabelBuilder, ModalBuilder, ModalSubmitInteraction, UserSelectMenuBuilder, type StringSelectMenuInteraction } from "discord.js";
import { Game } from '../../Managers/GameManager.js';
import { Habilidade } from "../Habilidade.js";
import { PlayerDAO } from "../../DAOs/PlayerDAO.js";
import { Prisma } from '@prisma/client';
import type { Action } from "../Action.js";
import type { Player } from "../Player.js";

export class HabilidadeT extends Habilidade {

    constructor(usos?: number, status?: string) {
        super("NomeHabilidade", "Ofensiva", usos || 2, "Noite", ["Dormente"], status || "DISPONIVEL");
    }

    public override async ativar(game: Game, action: Action): Promise<boolean> {
        return false;
    }

    public async resolverOferta(game: Game, ofertaId: string): Promise<void> {}

    public async buildModal(interaction: StringSelectMenuInteraction, game: Game, quemUsouId: string): Promise<ModalBuilder | void> {

        const modal = new ModalBuilder()
            .setCustomId('skill_modal_' + this.getNome())
            .setTitle('Usando habilidade: ' + this.getNome());

        const targetLabel = new LabelBuilder()
            .setLabel('Quem é o alvo?')
            .setUserSelectMenuComponent(
                new UserSelectMenuBuilder()
                    .setCustomId(`select_${this.getNome()}`)
                    .setPlaceholder('Selecione o seu alvo...')
                    .setMinValues(1)
                    .setMaxValues(1)
            )

        modal.addLabelComponents(targetLabel);
        
        return modal;
    }

    protected override async processarUsoModal(interaction: ModalSubmitInteraction, game: Game, emissor: Player, alvo: Player, habilidadeInstance: Habilidade): Promise<InteractionResponse<boolean> | undefined> {
        // cria a ação genérica e responde
        if (!this.getId()) return;
        await game.getSkillManager().criarAction(emissor.getId(), this.getId()!, this.getTipo(), [alvo.getId()]);
        
        return interaction.reply({ content: `Habilidade **${this.getNome()}** usada com sucesso!` });
    }
}