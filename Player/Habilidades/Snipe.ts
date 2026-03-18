import { LabelBuilder, ModalBuilder, ModalSubmitInteraction, StringSelectMenuBuilder, StringSelectMenuInteraction, UserSelectMenuBuilder } from "discord.js";
import type { Game } from "../../Game.js";
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

export class Snipe extends Habilidade {

    constructor(usos?: number, status?: string) {
        super("Snipe", "Ofensiva", usos || 2, "Noite", ["Dormente"], status || "DISPONIVEL");
    }

    public override async ativar(game: Game, action: PrismaAction): Promise<boolean> {
        const parsedParams = JSON.parse(action.parametrosAcao || "{}");
        const acertouClasse = parsedParams.acertouClasse || false;

        const alvo = action.alvos[0]!.id;
        if (await this.atacarPlayer(game, alvo, action)) {
            await game.getSkillManager().criarAlerta(action.userId, "Matou o mano parabens");
            if (acertouClasse) {
                // Devolve o uso
                const valorUsoTotal = action.habilidade.uso + 1;
                await HabilidadeDAO.updateHabilidade(action.habilidade.id, { uso: valorUsoTotal });
            }
            return true;
        } else {
            await game.getSkillManager().criarAlerta(action.userId, "Nao matou o mano parabens");
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
        const selectedUsers = interaction.fields.getSelectedUsers(`select_target_${this.getNome()}`);
        const selectedClass = interaction.fields.getStringSelectValues(`select_classe_${this.getNome()}`)

        const partesClass = selectedClass[0]!.split('_');
        const alinhamento = partesClass[0];
        const classe = partesClass[1];
        const custoAcao = 1;

        let poderAtaque = 0;

        const alvoId = selectedUsers?.firstKey()?.toString(); // pega o primeiro, se tiver mais de um temos que fazer um map
        if (!alvoId) return interaction.reply({content: "Nenhum valor selecionado"});

        console.log("selectvalue: " + alvoId)

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

        let parametrosAcao = {};
        const cargo = game.getSkillManager().getCargoInstance(jogadorAlvo.cargo!);
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

        const emissor = await PlayerDAO.getPlayerById(emissorId, game.getGuildId());
        if (!emissor) {
            console.error("Player não encontrado modal");
            return interaction.reply({content: "Erro, contate o host do jogo"});
        }
        const habilidade = emissor.habilidades.find(hab => hab.nome === this.getNome());
        if (!habilidade) return interaction.reply({content: "Erro, ao achar habilidade contate o host do jogo"});

        if (habilidade.uso < custoAcao) {
            return interaction.reply({content: "Você usou não tem usos disponíveis dessa habilidade!"})
        }

        await game.getSkillManager().criarAction(emissorId, habilidade.id, this.getTipo(), [alvoId], JSON.stringify(parametrosAcao))
        console.log("Modal submetido, alvo:", alvoId);
        return interaction.reply({ content: `Habilidade ${this.getNome()} usada com sucesso!` });
    }
}