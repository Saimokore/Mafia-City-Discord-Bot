import { InteractionResponse, LabelBuilder, ModalBuilder, ModalSubmitInteraction, StringSelectMenuBuilder, StringSelectMenuInteraction, UserSelectMenuBuilder } from "discord.js";
import { Game } from '../../Managers/GameManager.js';
import { Habilidade } from "../Habilidade.js";
import { HabilidadeDAO } from "../../DAOs/HabilidadeDAO.js";
import type { Player } from "../Player.js";
import type { Action } from "../Action.js";


export class Snipe extends Habilidade {

    constructor(usos?: number, status?: string) {
        super("Snipe", "Ofensiva", usos || 2, "Noite", ["Dormente"], status || "DISPONIVEL");
    }

    public override async ativar(game: Game, action: Action): Promise<boolean> {
        const parsedParams = JSON.parse(action.getParametros());
        const acertouClasse = parsedParams.acertouClasse || false;
        const habilidade = action.getHabilidade();
        if (!habilidade) return false;

        const alvo = action.getAlvos()[0];
        if (!alvo) return false;

        if (await this.atacarPlayer(game, alvo, action)) {
            await game.getSkillManager().criarAlerta(action.getUserId(), "Matou o mano parabens");
            if (acertouClasse) {
                // Devolve o uso
                const valorUsoTotal = habilidade!.getUso() + 1;
                await HabilidadeDAO.updateHabilidade(habilidade.getId()!, { uso: valorUsoTotal });
            }
            return true;
        } else {
            await game.getSkillManager().criarAlerta(action.getUserId(), "Nao matou o mano parabens");
            return false;
        }
        
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
                        label: "Mafia Disrupção",
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

    protected override async processarUsoModal(interaction: ModalSubmitInteraction, game: Game, emissor: Player, alvo: Player, habilidadeInstance: Habilidade): Promise<InteractionResponse<boolean>> {
        const selectedClass = interaction.fields.getStringSelectValues(`select_classe_${this.getNome()}`)
        
        const partesClass = selectedClass[0]!.split('_');
        const alinhamento = partesClass[0];
        const classe = partesClass[1];
        const custoAcao = 1;
        
        let parametrosAcao = {};
        const cargo = alvo.getCargo();
        if (cargo?.getAlinhamento() === alinhamento) {
            //ataque vira poderoso
            parametrosAcao = { 
                poderAtaque: 2
            };
            
            if (cargo?.getNome() === classe) {
                // acertou a classe e agora ela não gasta usos
                parametrosAcao = { 
                    poderAtaque: 2,
                    acertouClasse: true
                };
            }
        }

        const habilidade = emissor.getHabilidades()?.find(hab => hab.getNome() === this.getNome());
        if (!habilidade) return interaction.reply({content: "Erro, ao achar habilidade contate o host do jogo"});

        if (habilidade.getUso() < custoAcao) {
            return interaction.reply({content: "Você não tem usos disponíveis dessa habilidade!"})
        }

        await game.getSkillManager().criarAction(emissor.getUserId(), habilidade.getId()!, this.getTipo(), [alvo.getId()], JSON.stringify(parametrosAcao))
        console.log("Modal submetido, alvo:", alvo.getId());

        return interaction.reply({ content: `Habilidade ${this.getNome()} usada com sucesso!` });
    }
}