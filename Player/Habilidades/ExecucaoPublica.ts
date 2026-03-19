import { LabelBuilder, ModalBuilder, ModalSubmitInteraction, StringSelectMenuBuilder, UserSelectMenuBuilder, type StringSelectMenuInteraction } from "discord.js";
import { Game } from '../../Managers/GameManager.js';
import { Habilidade } from "../Habilidade.js";
import { PlayerDAO } from "../../DAOs/PlayerDAO.js";
import { Prisma } from '@prisma/client';
import { HabilidadeDAO } from "../../DAOs/HabilidadeDAO.js";

export type PrismaAction = Prisma.ActionGetPayload<{
    include: {
        alvos: true,
        habilidade: {
            include: {
                actions: true
            }
        }
    }
}>;

export class ExecucaoPublica extends Habilidade {

    constructor(usos?: number, status?: string) {
        super("ExecucaoPublica", "Instantanea", usos || 1, "Dia", ["Astral", "Instantanea", "Especial"], status || "DISPONIVEL");
    }

    public override async ativar(game: Game, action: PrismaAction): Promise<boolean> {
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

    public async resolverModal(interaction: ModalSubmitInteraction, game: Game, emissorId: string) {
        const selectedUsers = interaction.fields.getSelectedUsers(`select_${this.getNome()}`);
        const alvoId = selectedUsers?.firstKey()?.toString(); // pega o primeiro, se tiver mais de um temos que fazer um map

        console.log("selectvalue: " + alvoId)
        if (!alvoId) {
            console.error("Select value não encontrado");
            return interaction.reply({content: "Nenhum valor selecionado"});
        }

        const jogadorAlvo = await game.getPlayerManager().loadPlayer(alvoId);
        console.log("jogadorAlvo: " + jogadorAlvo?.getId())
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

        const emissor = await game.getPlayerManager().loadPlayer(emissorId);
        if (!emissor) {
            console.error("Player não encontrado modal");
            return interaction.reply({content: "Erro, contate o host do jogo"});
        }
        const habilidade = emissor.getHabilidades()?.find(hab => hab.getNome() === this.getNome()) || null;
        if (!habilidade) {
            console.error("Instancia da habilidade não encontrada");
            return interaction.reply({content: "Erro, contate o host do jogo"});;
        }

        const habId = await game.getSkillManager().getHabilidadeId(habilidade, emissor.getId());

        await game.getSkillManager().criarAction(emissorId, habId, this.getTipo(), [alvoId])
        console.log("Modal submetido, alvo:", alvoId);
        return interaction.reply({ content: `Habilidade ${this.getNome()} usada com sucesso!` });
    }
}