import { ActionRowBuilder, UserSelectMenuBuilder, StringSelectMenuBuilder, ModalBuilder, ModalSubmitInteraction, LabelBuilder, StringSelectMenuInteraction, TextInputBuilder } from "discord.js";
import { type DefinicaoHabilidade, type Efeito, type Condicao, type Gatilho, TipoGatilho, TipoSujeito, TipoInput } from "../ECA.js";
import { Game } from "../../Managers/GameManager.js";
import { Habilidade } from "../Habilidade.js";
import { Player } from "../Player.js";
import { Action } from "../Action.js";
import { access } from "node:fs";
import { OfertaDAO } from "../../DAOs/OfertaDAO.js";
import { ConditionEvaluator } from "./ConditionEvaluator.js";
import { EffectHandler } from "./EffectHandler.js";
import { SkillModalBuilder } from "./SkillModalBuilder.js";

export enum PoderAtaqueProtecao {
    AtaqueBasico = 1,
    ProtecaoBasica = 2,
    AtaquePoderoso = 3,
    ProtecaoPoderosa = 4,
    Obliteracao = 5,
    Invencibilidade = 6
}

export class HabilidadeDinamica extends Habilidade {
    private regras: DefinicaoHabilidade;
    private conditionEval: ConditionEvaluator;
    private effectHandler: EffectHandler;
    private skillModalBuilder: SkillModalBuilder;

    constructor(regras: DefinicaoHabilidade, usosAgendados?: number, statusAtual?: string) {
        super(regras.nome, regras.tipo, usosAgendados || regras.usosMaximos, regras.etapa, regras.modificadores, statusAtual);
        this.regras = regras;
        this.conditionEval = new ConditionEvaluator();
        this.effectHandler = new EffectHandler();
        this.skillModalBuilder = new SkillModalBuilder();
    }

    public async ativarHabilidade(game: Game, action: Action): Promise<boolean> {
        return await this.ativar(game, action);
    }

    public async buildModal(interaction: StringSelectMenuInteraction, game: Game, quemUsouId: string) {
        return this.skillModalBuilder.build(this.regras, interaction);
    }

    public async resolverModal(interaction: ModalSubmitInteraction, game: Game) {
        
        const variaveis: Record<string, unknown> = {};
        
        const alvos = [];
        const emissor = await game.getPlayerManager().loadPlayer(interaction.user.id);
        
        if (!emissor?.estaVivo()) {
            return interaction.reply({ content: "❌ **Erro:** Você não está vivo ou não faz parte da partida!" });
        }

        if (!emissor.getHabilidade(this.getNome())) {
            return interaction.reply({ content: "❌ **Erro:** Você não possui essa habilidade." });
        }

        for (const input of this.regras.inputs ?? []) {
            const customId = `input_${this.getNome()}_${input.idVariavel}`;            

            if (input.tipoInput === TipoInput.SelecionarJogador) {

                const id = interaction.fields.getSelectedUsers(customId)?.firstKey()?.toString();
                variaveis[input.idVariavel] = id;

                const player = await game.getPlayerManager().loadPlayer(id!);
                if (!player) break;

                alvos.push(player);

            } else if (input.tipoInput === TipoInput.SelecionarJogadores) {

                const ids = interaction.fields.getSelectedUsers(customId)?.keys() ?? [];
                variaveis[input.idVariavel] = ids;

                for (const id of ids) {
                    const alvo = await game.getPlayerManager().loadPlayer(id);
                    if (!alvo) {
                        console.error(`Player com ID ${id} não encontrado ao resolver modal da habilidade ${this.getNome()}`);
                        continue;
                    }
                    const erroAlvo = this.validarAlvo(alvo, emissor.getId());
                    if (erroAlvo) {
                        console.error(`Erro ao validar alvo selecionado: ${erroAlvo}`)
                        continue;
                    }
                    alvos.push(alvo);
                }

            } else if (input.tipoInput === TipoInput.SelecionarClasse || input.tipoInput === TipoInput.SelecionarCargo) {

                const valorSelecionado = interaction.fields.getStringSelectValues(customId)[0];
                
                variaveis[input.idVariavel] = valorSelecionado;

                if (valorSelecionado && typeof valorSelecionado === "string" && valorSelecionado.includes('_')) {
                    const partes = valorSelecionado.split('_');
                    
                    variaveis[`${input.idVariavel}_alinhamento`] = partes[0]; // Cidade
                    variaveis[`${input.idVariavel}_nome`] = partes.slice(1).join('_'); // Justiceiro
                }
            } else {
                // TEXTO ou NUMERO
                variaveis[input.idVariavel] = interaction.fields.getTextInputValue(customId);
            }
        }

        return await this.processarUsoModal(interaction, game, emissor, variaveis, alvos);
    }

    public async resolverOferta(game: Game, ofertaId: string, statusResposta: "ACEITA" | "RECUSADA"): Promise<void> {
        
        const oferta = await OfertaDAO.getOfertaById(ofertaId);
        if (!oferta) return;

        const playerAlvo = await game.getPlayerManager().loadPlayer(oferta.alvoId);
        const emissor = await game.getPlayerManager().loadPlayer(oferta.emissorId);
        if (!emissor || !playerAlvo) return;

        const variaveis = oferta.parametros ? JSON.parse(oferta.parametros) : {};

        const gatilhoEsperado = statusResposta === "ACEITA" ? TipoGatilho.AoOfertaAceita : TipoGatilho.AoOfertaRecusada;
        
        const gatilho = this.regras.gatilhos.find(g => g.evento === gatilhoEsperado);
        if (!gatilho) return;

        await this.executarEfeitos(game, gatilho.efeitos, emissor, playerAlvo, variaveis);
    }

    // vai ser pra resolver todos os inputs provenientes dos players, tipo selecionar alvo, classe, cargo, ou responder texto/numero
    public async resolverInput(game: Game, interaction: StringSelectMenuInteraction | ModalSubmitInteraction, alvo: Player, emissor?: Player): Promise<void> {
        const variaveis: Record<string, unknown> = {};
        
        // skill_input_Evangelho_1234_habilidade_sacrificada
        const partes = interaction.customId.split('_');
        const idVariavel = partes.slice(4).join('_'); 

        if (interaction.isStringSelectMenu()) {
            variaveis[idVariavel] = interaction.values[0];
        } else if (interaction.isModalSubmit()) {
            variaveis[idVariavel] = interaction.fields.getTextInputValue(idVariavel);
        }

        variaveis["customId"] = idVariavel;

        const regraInput = this.regras.inputs?.find(input => input.idVariavel === idVariavel);
        if (regraInput?.validacao) {
            const condicoesOk = await this.conditionEval.avaliar(game, regraInput.validacao, emissor!, alvo, variaveis);
            if (!condicoesOk) {
                await interaction.reply({ content: `❌ **Erro:** A validação do input ${regraInput.texto} falhou. Verifique os requisitos e tente novamente.` });
                return;
            }
        }

        const gatilho = this.regras.gatilhos.find(g => g.evento === TipoGatilho.AoResolverInput);
        if (!gatilho) return;

        if (emissor) {
            await this.executarEfeitos(game, gatilho.efeitos, emissor, alvo, variaveis);
        }
    }

    public async ativar(game: Game, action: Action | null, gatilhoDisparo: string = TipoGatilho.AoAvancarEtapa, emissorOpcional?: Player): Promise<boolean> {
        
        const gatilho = this.regras.gatilhos.find(g => g.evento === gatilhoDisparo);
        if (!gatilho) return true;

        const emissor = action ? await game.getPlayerManager().loadPlayer(action.getEmissorUserId()) : emissorOpcional;
        if (!emissor) return false;

        const alvos = await this.resolverAlvos(game, gatilho.efeitos, action);

        if (alvos.length === 0) {
            const variaveis = this.parseParametros(action);
            await this.executarEfeitos(game, gatilho.efeitos, emissor, emissor, variaveis, action ?? undefined);
            return true;
        }

        const variaveis = this.parseParametros(action);

        for (const alvo of alvos) {
            await this.executarEfeitos(game, gatilho.efeitos, emissor, alvo, variaveis, action ?? undefined);
        }

        return true;
    }

    public async executarEfeitos(game: Game, efeitos: Efeito[], emissor: Player, alvo: Player, variaveis: Record<string, unknown>, action?: Action) {
        let resultadoAnterior = { foiSucedida: false };

        for (const efeito of efeitos) {
            const condicoesOk = await this.conditionEval.avaliar(game, efeito.condicoes, emissor, alvo, variaveis, resultadoAnterior);
            if (!condicoesOk) continue;
 
            resultadoAnterior = await this.effectHandler.executar({
                game, efeito, emissor, alvo, variaveis, action,
                habilidade: this,
            });

            if (efeito.aoSuceder && resultadoAnterior.foiSucedida) {
                await this.executarEfeitos(game, efeito.aoSuceder, emissor, alvo, variaveis, action);
            } else if (efeito.aoFalhar && !resultadoAnterior.foiSucedida) {
                await this.executarEfeitos(game, efeito.aoFalhar, emissor, alvo, variaveis, action);
            }
        }
    }

    // HELPERS

    public async ofertarPlayer(game: Game, emissorId: string, alvo: Player, nomeOferta: string, item?: string, parametros?: string): Promise<void> {
        console.log(`[HabilidadeDinamica] Criando oferta do jogador ${emissorId} para os alvos ${alvo.getUsername()} com a habilidade ${this.getNome()} e oferta ${nomeOferta}.`);
        
        const partida = await game.getPartida();
        if (!partida) return;

        await game.getSkillManager().criarOferta(emissorId, alvo, this, nomeOferta, item, parametros);
        await game.getSkillManager().criarAlerta(alvo, `Você recebeu a oferta: ${nomeOferta}! Digite /offer para responder.`)
    }

    public async atacarPlayer(game: Game, poderAtaque: PoderAtaqueProtecao, alvo: Player, assassino: Player, action?: Action): Promise<boolean> {
        console.log(`[HabilidadeDinamica] Poder de ataque: ${poderAtaque} e proteção do alvo: ${alvo.getProtecao()}`);
        alvo.triggerGatilho(game, TipoGatilho.AoSerAtacado);

        if (poderAtaque >= alvo.getProtecao()) {
            await game.getSkillManager().criarAlerta(assassino, "Você eliminou o alvo!");
            await game.processarMortePlayer(alvo, assassino);
            return true;
        } else {
            const protInata = alvo.getCargo()?.getProtecaoInata() ?? 0;
            await game.getPlayerManager().updatePlayer(alvo, { protecao: protInata });
            await game.getSkillManager().criarAlerta(alvo, "Você sente que foi protegido!");
            return false;
        }
    }
 
    public permiteAutoUso(): boolean {
        return this.regras.permiteAutoUso ?? false;
    }

    protected validarAlvo(alvo: Player | null, emissorId: string): string | null {
        if (!alvo)              return "❌ **Erro:** O jogador alvo não está participando da partida atual!";
        if (!alvo.estaVivo())   return "👻 **Erro:** Você só pode mirar em jogadores vivos.";
        if (alvo.getId() === emissorId && !this.permiteAutoUso())
            return "❌ **Erro:** Você não pode usar essa habilidade em si mesmo!";
        return null;
    }

    // HELPERS INTERNOS

    protected async visitarPlayer(game: Game, alvo: Player, alertado: boolean): Promise<void> {
        const partida = await game.getPartida();
        if (!partida) {
            console.error(`Partida não encontrada para guildId ${game.getGuildId()}`);
            return;
        }
        if (alertado) {
            await game.getSkillManager().criarAlerta(alvo, "Você foi visitado essa noite!");
        }
    }
 
    protected async bloquearPlayer(game: Game, alvo: Player): Promise<void> {
        const partida = await game.getPartida();
        if (!partida) {
            console.error(`Partida não encontrada para guildId ${game.getGuildId()}`);
            return;
        }
        await game.getPlayerManager().bloquearPlayer(alvo);
    }

    // METODOS INTERNOS

    protected async processarUsoModal(interaction: ModalSubmitInteraction, game: Game, emissor: Player, variaveis: Record<string, unknown>, alvos?: Player[]): Promise<unknown> {
        if (!this.getId()) {
            return interaction.reply({ content: "ID de Habilidade não encontrado, contate um host do jogo." });
        }
 

        const action = await game.getSkillManager().criarAction(
            emissor.getUserId(),
            this.getId()!,
            this.getTipo(),
            alvos,
            JSON.stringify(variaveis),
        );
 
        if (this.getTipo() === "Instantanea") {
            await this.ativar(game, action, TipoGatilho.AoUsar);
        }
 
        return interaction.reply({ content: `Habilidade **${this.getNome()}** armada com sucesso!` });
    }
 
    private async resolverAlvos(game: Game, efeitos: Efeito[], action: Action | null): Promise<Player[]> {
        if (efeitos.some(e => e.alvo === TipoSujeito.TodosJogadores)) {
            return (await game.getPlayerManager().getAllPlayers()) ?? [];
        }
 
        if (!action) return [];
 
        const alvos: Player[] = [];
        for (const alvoId of action.getAlvos()) {
            const player = await game.getPlayerManager().loadPlayer(alvoId);
            if (player) alvos.push(player);
            else console.error(`[HabilidadeDinamica] Não carregou player com ID ${alvoId}`);
        }
        return alvos;
    }
 
    private parseParametros(action: Action | null): Record<string, unknown> {
        try {
            return action?.getParametros() ? JSON.parse(action.getParametros()) : {};
        } catch {
            console.error("[HabilidadeDinamica] Falha ao parsear parâmetros da action");
            return {};
        }
    }

    public getConditionEvaluator(): ConditionEvaluator {
        return this.conditionEval;
    }
}