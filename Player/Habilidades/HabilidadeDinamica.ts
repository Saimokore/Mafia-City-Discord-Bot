import { ModalSubmitInteraction, StringSelectMenuInteraction } from "discord.js";
import { type DefinicaoHabilidade, type Efeito, TipoGatilho, TipoSujeito, TipoInput } from "../ECA.js";
import { Game } from "../../Managers/GameManager.js";
import { Habilidade } from "../Habilidade.js";
import { Player } from "../Player.js";
import { Action } from "../Action.js";
import { OfertaDAO } from "../../DAOs/OfertaDAO.js";
import { ConditionEvaluator } from "./ConditionEvaluator.js";
import { EffectHandler, type ResultadoAcaoAnterior } from "./EffectHandler.js";
import { SkillModalBuilder } from "./SkillModalBuilder.js";

export enum PoderAtaque {
    AtaqueBasico = 1,
    AtaquePoderoso = 3,
    Obliteracao = 5,
}

export enum NivelProtecao {
    ProtecaoBasica = 2,
    ProtecaoPoderosa = 4,
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

    public async ativarHabilidade(game: Game, gatilhoAtivo: Action, eventoDisparo: string): Promise<boolean> {
        return await this.ativar(game, gatilhoAtivo, eventoDisparo);
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

        const emissor = await game.getPlayerManager().loadPlayer(oferta.emissorId);
        if (!emissor) return;

        const variaveis = oferta.parametros ? JSON.parse(oferta.parametros) : {};

        const gatilhoEsperado = statusResposta === "ACEITA" ? TipoGatilho.AoOfertaAceita : TipoGatilho.AoOfertaRecusada;
        
        const gatilho = this.regras.gatilhos.find(g => g.evento === gatilhoEsperado);
        if (!gatilho) return;

        await this.executarEfeitos(game, gatilho.efeitos, emissor, variaveis, null);
    }

    // vai ser pra resolver todos os inputs provenientes dos players, tipo selecionar alvo, classe, cargo, ou responder texto/numero
    public async resolverInput(game: Game, interaction: StringSelectMenuInteraction | ModalSubmitInteraction, emissor?: Player): Promise<void> {
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

        const gatilho = this.regras.gatilhos.find(g => g.evento === TipoGatilho.AoResolverInput);
        if (!gatilho) return;

        if (emissor) {
            await this.executarEfeitos(game, gatilho.efeitos, emissor, variaveis, null);
        }
    }

    public async ativar(game: Game, gatilhoAtivo: Action | null, eventoDisparo: string, emissorOpcional?: Player): Promise<boolean> {
        
        const defGatilho = this.regras.gatilhos?.find(g => g.evento === eventoDisparo);
        if (!defGatilho) return false;

        const variaveis = gatilhoAtivo ? gatilhoAtivo.getPayload() : {};

        let emissor = emissorOpcional || null;
        if (gatilhoAtivo && !emissor) {
            emissor = await game.getPlayerManager().loadPlayer(gatilhoAtivo.getDonoId());
        }
        if (!emissor) return false;

        const avaliador = new ConditionEvaluator();
        if (defGatilho.condicoes && defGatilho.condicoes.length > 0) {
            const passouGlobais = await avaliador.avaliar(game, defGatilho.condicoes, emissor, emissor, variaveis);
            
            if (!passouGlobais) {
                if (defGatilho.aoFalhar) {
                    await this.executarEfeitos(game, defGatilho.aoFalhar, emissor, variaveis, gatilhoAtivo);
                }
                return false;
            }
        }

        await this.executarEfeitos(game, defGatilho.efeitos, emissor, variaveis, gatilhoAtivo);
        return true;
    }

    private async executarEfeitos(game: Game, efeitos: Efeito[], emissor: Player, variaveis: Record<string, unknown>, gatilhoAtivo: Action | null, resultadoAnterior?: ResultadoAcaoAnterior) {
        const avaliador = new ConditionEvaluator();

        for (const efeito of efeitos) {
            let alvosDoEfeito: Player[] = [];

            if (efeito.alvo === TipoSujeito.Emissor) {
                alvosDoEfeito.push(emissor);
            } else if (efeito.alvo === TipoSujeito.TodosJogadores) {
                const todos = await game.getPlayerManager().getAllPlayers();
                if (todos) alvosDoEfeito = todos;
            } else if (typeof efeito.alvo === "string" && efeito.alvo.startsWith("VARIAVEL.")) {
                const nomeVar = (efeito.alvo as string).replace("VARIAVEL.", "");
                const idAlvo = variaveis[nomeVar] as string;
                
                if (idAlvo) {
                    const playerAlvo = await game.getPlayerManager().loadPlayer(idAlvo);
                    if (playerAlvo) alvosDoEfeito.push(playerAlvo);
                }
            }

            if (alvosDoEfeito.length === 0) continue;

            for (const alvo of alvosDoEfeito) {
                const passou = await avaliador.avaliar(game, efeito.condicoes, emissor, alvo, variaveis, resultadoAnterior);
                
                if (passou) {
                    const ctx = {
                        game, 
                        efeito, 
                        emissor, 
                        alvo, 
                        variaveis,
                        gatilho: gatilhoAtivo,
                        habilidade: this,
                        origemEventoId: gatilhoAtivo?.getOrigemEventoId()
                    };

                    const resultado = await this.effectHandler.executar(ctx);
                    
                    if (efeito.aoSuceder) {
                        await this.executarEfeitos(game, efeito.aoSuceder, emissor, variaveis, gatilhoAtivo, resultado);
                    }
                } else {
                    if (efeito.aoFalhar) {
                        await this.executarEfeitos(game, efeito.aoFalhar, emissor, variaveis, gatilhoAtivo, { foiSucedida: false });
                    }
                }
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

    public async atacarPlayer(game: Game, poderAtaque: PoderAtaque, alvo: Player, assassino: Player): Promise<boolean> {
        console.log(`[HabilidadeDinamica] Poder de ataque: ${poderAtaque} e proteção do alvo: ${alvo.getProtecao()}`);
        alvo.triggerGatilho(game, TipoGatilho.AoSerAtacado);

        if (poderAtaque >= alvo.getProtecao()) {
            await game.getSkillManager().criarAlerta(assassino, "Você eliminou o alvo!");
            await game.processarMortePlayer(alvo, assassino);
            return true;
        } else {
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
 

        await game.getSkillManager().criarGatilho(
            emissor.getId(),
            this.getTipo() === "Instantanea" ? TipoGatilho.AoUsar : TipoGatilho.AoAvancarEtapa,
            this.getId()!,
            variaveis
        );
 
        if (this.getTipo() === "Instantanea") {
            await this.ativar(game, null, TipoGatilho.AoUsar, emissor);
        }
 
        return interaction.reply({ content: `Habilidade **${this.getNome()}** armada com sucesso!` });
    }

    public getConditionEvaluator(): ConditionEvaluator {
        return this.conditionEval;
    }
}