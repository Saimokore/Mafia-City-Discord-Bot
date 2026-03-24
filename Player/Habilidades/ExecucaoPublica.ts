import { InteractionResponse, LabelBuilder, ModalBuilder, ModalSubmitInteraction, StringSelectMenuBuilder, UserSelectMenuBuilder, type StringSelectMenuInteraction } from "discord.js";
import { Game } from '../../Managers/GameManager.js';
import { Habilidade } from "../Habilidade.js";
import type { Action } from "../Action.js";
import type { Player } from "../Player.js";

export class ExecucaoPublica extends Habilidade {

    constructor(usos?: number, status?: string) {
        super("ExecucaoPublica", "Instantanea", usos || 1, "Dia", ["Astral", "Instantanea", "Especial"], status || "DISPONIVEL");
    }

    public override async ativar(game: Game, action: Action): Promise<boolean> {
        return false;
    }

    public async resolverOferta(game: Game, ofertaId: string): Promise<void> {}

    public async buildModal(interaction: StringSelectMenuInteraction, game: Game, quemUsouId: string): Promise<ModalBuilder | void> {

        // Checar se matou um jogador não cidade neste jogo.
    
        const modal = new ModalBuilder()
            .setCustomId('skill_modal_' + this.getNome())
            .setTitle('Usando habilidade: ' + this.getNome());

        const targetLabel = new LabelBuilder()
            .setLabel('Quem é o alvo?')
            .setUserSelectMenuComponent(
                new UserSelectMenuBuilder()
                    .setCustomId(`select_target_${this.getNome()}`)
                    .setPlaceholder('Selecione o seu alvo...')
                    .setMinValues(1)
                    .setMaxValues(1)
            )
        
        const classeLabel = new LabelBuilder()
            .setLabel('Qual a classe do alvo?')
            .setStringSelectMenuComponent(
                new StringSelectMenuBuilder()
                    .setCustomId(`select_classe_${this.getNome()}`)
                    .setPlaceholder('Selecione o seu alvo...')
                    .setOptions({
                        label: "Cidade Justiceiro",
                        value: "Cidade_Justiceiro"
                    },
                    {
                        label: "Cidade Investigação",
                        value: "Cidade_Investigacao"
                    },
                    {
                        label: "Cidade Proteção",
                        value: "Cidade_Protecao"
                    },
                    {
                        label: "Cidade Suporte",
                        value: "Cidade_Suporte"
                    },
                    {
                        label: "Mafia Líder",
                        value: "Mafia_Lider"
                    },
                    {
                        label: "Mafia Assassino",
                        value: "Mafia_Assassino"
                    },
                    {
                        label: "Mafia Disrupcao",
                        value: "Mafia_Disrupcao"
                    },
                    {
                        label: "Neutro",
                        value: "Neutro"
                    },
                )
            )


        modal.addLabelComponents(targetLabel, classeLabel);
        
        return modal;
    }

    protected override async processarUsoModal(interaction: ModalSubmitInteraction, game: Game, emissor: Player, alvo: Player, habilidadeInstance: Habilidade): Promise<InteractionResponse<boolean> | undefined> {

        const selectedUsers = interaction.fields.getSelectedUsers(`select_${this.getNome()}`);
        const alvoId = selectedUsers?.firstKey()?.toString(); // pega o primeiro, se tiver mais de um temos que fazer um map

        console.log("selectvalue: " + alvoId)
        if (!alvoId) {
            console.error("Select value não encontrado");
            return interaction.reply({content: "Nenhum valor selecionado"});
        }

        await game.getSkillManager().criarAction(emissor.getId(), this.getId()!, this.getTipo(), [alvoId])
        console.log("Modal submetido, alvo:", alvoId);
        return interaction.reply({ content: `Habilidade ${this.getNome()} usada com sucesso!` });
    }
}