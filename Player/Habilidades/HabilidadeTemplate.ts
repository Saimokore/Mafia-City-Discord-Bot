import { LabelBuilder, ModalBuilder, ModalSubmitInteraction, UserSelectMenuBuilder, type StringSelectMenuInteraction } from "discord.js";
import { Game } from '../../Managers/GameManager.js';
import { Habilidade } from "../Habilidade.js";
import { PlayerDAO } from "../../DAOs/PlayerDAO.js";
import { Prisma } from '@prisma/client';

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

export class HabilidadeT extends Habilidade {

    constructor(usos?: number, status?: string) {
        super("NomeHabilidade", "Ofensiva", usos || 2, "Noite", ["Dormente"], status || "DISPONIVEL");
    }

    public override async ativar(game: Game, action: PrismaAction): Promise<boolean> {
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

    public async resolverModal(interaction: ModalSubmitInteraction, game: Game, emissorId: string) {
        const selectedUsers = interaction.fields.getSelectedUsers(`select_${this.getNome()}`);
        const alvoId = selectedUsers?.firstKey()?.toString(); // pega o primeiro, se tiver mais de um temos que fazer um map

        console.log("selectvalue: " + alvoId)
        if (!alvoId) {
            console.error("Select value não encontrado");
            return interaction.reply({content: "Nenhum valor selecionado"});
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

        const emissor = await PlayerDAO.getPlayerById(emissorId, game.getGuildId());
        if (!emissor) {
            console.error("Player não encontrado modal");
            return interaction.reply({content: "Erro, contate o host do jogo"});
        }
        const habilidade = emissor.habilidades.find(hab => hab.nome === this.getNome());

        await game.getSkillManager().criarAction(emissorId, habilidade!.id, this.getTipo(), [alvoId])
        console.log("Modal submetido, alvo:", alvoId);
        return interaction.reply({ content: `Habilidade ${this.getNome()} usada com sucesso!` });
    }
}