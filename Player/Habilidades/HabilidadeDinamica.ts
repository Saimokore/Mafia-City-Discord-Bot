import { ActionRowBuilder, UserSelectMenuBuilder, StringSelectMenuBuilder, ModalBuilder, ModalSubmitInteraction, LabelBuilder, StringSelectMenuInteraction, TextInputBuilder } from "discord.js";
import type { DefinicaoHabilidade, Efeito, Condicao } from "../ECA.js";
import { Game } from "../../Managers/GameManager.js";
import { Habilidade } from "../Habilidade.js";
import { Player } from "../Player.js";
import { Action } from "../Action.js";
import { access } from "node:fs";

export class HabilidadeDinamica extends Habilidade {
    private regras: DefinicaoHabilidade;

    constructor(regras: DefinicaoHabilidade, usosAgendados?: number, statusAtual?: string) {
        super(regras.nome, regras.tipo, usosAgendados || regras.usosMaximos, regras.etapa, regras.modificadores, statusAtual);
        this.regras = regras;
    }

    public override async buildModal(interaction: StringSelectMenuInteraction, game: Game, quemUsouId: string) {
        // Se não precisa de input, a habilidade ativa direto (ex: passivas ou habilidades simples)
        if (!this.regras.inputs || this.regras.inputs.length === 0) return null; 

        const modal = new ModalBuilder()
            .setCustomId('skill_modal_' + this.getNome())
            .setTitle('Usando habilidade: ' + this.getNome());

        for (const input of this.regras.inputs) {
            
            if (input.tipoInput === "SELECIONAR_JOGADOR") {
                const menu = new LabelBuilder()
                    .setLabel(input.texto)
                    .setUserSelectMenuComponent(
                        new UserSelectMenuBuilder()
                            .setCustomId(`input_${this.getNome()}_${input.idVariavel}`)
                            .setPlaceholder(input.texto)
                            .setMinValues(1)
                            .setMaxValues(1)
                    )
                modal.addLabelComponents(menu);
            }

            if (input.tipoInput === "SELECIONAR_CLASSE") {
                const menu = new LabelBuilder()
                    .setLabel(input.texto)
                    .setStringSelectMenuComponent(
                        new StringSelectMenuBuilder()
                            .setCustomId(`input_${this.getNome()}_${input.idVariavel}`)
                            .setPlaceholder(input.texto)
                            .addOptions([
                                { label: "Cidade Justiceiro", value: "Cidade_Justiceiro" },
                                { label: "Mafia Lider", value: "Mafia_Lider" }
                                // ... Puxaria a lista de classes do seu sistema
                            ])
                    )
                modal.addLabelComponents(menu);
            }

            if (input.tipoInput === "SELECIONAR_CARGO") {
                const menu = new LabelBuilder()
                    .setLabel(input.texto)
                    .setStringSelectMenuComponent(
                        new StringSelectMenuBuilder()
                            .setCustomId(`input_${this.getNome()}_${input.idVariavel}`)
                            .setPlaceholder(input.texto)
                            .addOptions([
                                { label: "Cargo", value: "Cargo" },
                                // ... Puxaria a lista de cargos do seu sistema
                            ])
                    )
                modal.addLabelComponents(menu);
            }

            if (input.tipoInput === "NUMERO" || input.tipoInput === "TEXTO") {
                const menu = new LabelBuilder()
                    .setLabel(input.texto)
                    .setTextInputComponent(
                        new TextInputBuilder()
                            .setCustomId(`input_${this.getNome()}_${input.idVariavel}`)
                    )
                modal.addLabelComponents(menu);
            }
        }

        return modal;
    }

    public override async resolverModal(interaction: ModalSubmitInteraction, game: Game) {
        
        // Essa caixinha vai guardar tudo que o usuário respondeu
        const variaveisColetadas: Record<string, any> = {};
        let alvoPrincipalId: string | null = null;

        for (const input of this.regras.inputs || []) {
            const customId = `input_${this.getNome()}_${input.idVariavel}`;

            if (input.tipoInput === "SELECIONAR_JOGADOR") {
                const selected = interaction.fields.getSelectedUsers(customId);
                const id = selected?.firstKey()?.toString();
                variaveisColetadas[input.idVariavel] = id;
                
                // O primeiro input de jogador tem que ser o alvo principal
                if (!alvoPrincipalId) alvoPrincipalId = id!; 
            }

            if (input.tipoInput === "SELECIONAR_CLASSE" || input.tipoInput === "SELECIONAR_CARGO") {
                const selected = interaction.fields.getStringSelectValues(customId);
                variaveisColetadas[input.idVariavel] = selected[0];
            }

            if (input.tipoInput === "TEXTO" || input.tipoInput === "NUMERO") {
                const textoDigitado = interaction.fields.getTextInputValue(customId);
                variaveisColetadas[input.idVariavel] = textoDigitado;
            }
        }

        const emissor = await game.getPlayerManager().loadPlayer(interaction.user.id);
        const alvo = alvoPrincipalId ? await game.getPlayerManager().loadPlayer(alvoPrincipalId) : null;
        
        if (!emissor || !emissor.estaVivo()) {
            return interaction.reply({ content: "❌ **Erro:** Você não está vivo ou não faz parte da partida!" });
        }

        const habilidade = emissor.getHabilidade(this.getNome());
        if (!habilidade) {
            return interaction.reply({ content: "❌ **Erro:** Você não possui essa habilidade." });
        }

        const erroAlvo = this.validarAlvo(alvo, emissor.getId());
        if (erroAlvo) {
            // Se a validação retornou um texto de erro, nós paramos aqui e avisamos o usuário!
            return interaction.reply({ content: erroAlvo });
        }

        return await this.processarUsoModal(interaction, game, emissor, alvo!, variaveisColetadas);
    }

    // O gatilho principal quando alguém aperta "Confirmar" no Modal
    protected override async processarUsoModal(interaction: ModalSubmitInteraction, game: Game, emissor: Player, alvo: Player, variaveisColetadas: Record<string, any>) {
        
        const gatilhoAoUsar = this.regras.gatilhos.find(g => g.evento === "AO_USAR");
        if (!gatilhoAoUsar) return interaction.reply({ content: "Essa habilidade não é ativa." });

        // 5. Registra a ação no banco com tudo que o JSON mandou
        if (!this.getId()) return interaction.reply({ content: "ID de Habilidade não encontrado, contate um host do jogo." });

        const parametrosParaOBanco = JSON.stringify(variaveisColetadas);
        const action = await game.getSkillManager().criarAction(emissor.getId(), this.getId()!, this.getTipo(), [alvo], JSON.stringify(parametrosParaOBanco));
        if (this.getTipo() === "Instantanea") {
            await this.ativar(game, action, "AO_USAR");
        }
        
        return interaction.reply({ content: `Habilidade **${this.getNome()}** armada com sucesso!` });
    }

    private async avaliarCondicoes(condicoes: Condicao[] | undefined, emissor: Player, alvo: Player, variaveisColetadas: Record<string, any>): Promise<boolean> {
        if (!condicoes || condicoes.length === 0) return true; // Sem condição = Executa sempre

        for (const condicao of condicoes) {
            
            // Descobre quem é o alvo da checagem
            const jogadorChecado = condicao.sujeito === "EMISSOR" ? emissor : alvo;
            let valorReal: any;

            // Busca o atributo no objeto do Player
            switch (condicao.atributo) {
                case "ALINHAMENTO": valorReal = jogadorChecado.getAlinhamento(); break;
                case "ESTA_VIVO": valorReal = jogadorChecado.estaVivo(); break;
                case "PROTECAO": valorReal = jogadorChecado.getProtecao(); break;
                case "CLASSE": valorReal = jogadorChecado.getClasse(); break;
                case "CARGO": valorReal = jogadorChecado.getCargo()?.getNome(); break;
            }

            // Trata o valor esperado (se for uma referência cruzada como "EMISSOR.ALINHAMENTO")
            let valorEsperado = condicao.valorEsperado;
            if (valorEsperado === "EMISSOR.ALINHAMENTO") valorEsperado = emissor.getAlinhamento();

            if (typeof valorEsperado === "string" && valorEsperado.startsWith("TEXTO.")) {
                const nomeDaVariavel = valorEsperado.split(".")[1];
                valorEsperado = variaveisColetadas[nomeDaVariavel!];
            }

            if (typeof valorEsperado === "string" && valorEsperado.startsWith("NUMERO.")) {
                const nomeDaVariavel = valorEsperado.split(".")[1];
                const numeroParsed = parseInt(nomeDaVariavel!);
                if (isNaN(numeroParsed)) break; // isso parece errado
                valorEsperado = variaveisColetadas[nomeDaVariavel!];
            }

            // Compara usando o operador do JSON
            if (condicao.operador === "IGUAL_A" && valorReal !== valorEsperado) return false;
            if (condicao.operador === "DIFERENTE_DE" && valorReal === valorEsperado) return false;
            if (condicao.operador === "MAIOR_QUE" && valorReal < valorEsperado) return false; // tem que ver isso aqui depois
        }

        return true; // Se não parou em nenhum false, é porque passou em tudo!
    }

    // O método ativar (AVANCAR ETAPA) usaria a mesma lógica, mas aplicando os efeitos de fato!
    public override async ativar(game: Game, action: Action, gatilhoDisparo: string = "AO_AVANCAR_ETAPA"): Promise<boolean> {
    
        const gatilhoResolucao = this.regras.gatilhos.find(g => g.evento === gatilhoDisparo);
        if (!gatilhoResolucao) return true; // Se não tem, retorna sucesso sem fazer nada.

        const emissor = await game.getPlayerManager().loadPlayer(action.getEmissorUserId());
        const alvos = [];
        for (const alvo of action.getAlvos()) {
            const alvoInstance = await game.getPlayerManager().loadPlayer(alvo);
            if (!alvoInstance)  {
                console.error(`Não carregou player com ID ${alvo}`);
                continue;
            }
            alvos.push(alvoInstance);
        }

        if (!emissor || !alvos) return false;

        const variaveisColetadas = action.getParametros() ? JSON.parse(action.getParametros()) : {};

        for (const alvo of alvos) {
            for (const efeito of gatilhoResolucao.efeitos) {
                const condicoesPassaram = await this.avaliarCondicoes(efeito.condicoes, emissor, alvo, variaveisColetadas);
                
                if (condicoesPassaram) { 
                    switch (efeito.acao) {
                        case "CRIAR_OFERTA":
                            await this.ofertarPlayer(game, emissor.getId(), alvo, efeito.parametros.nomeOferta);
                            break;
                        case "ATACAR":
                            await this.atacarPlayer(game, alvo, emissor, action);
                            break;
                        case "BLOQUEAR":
                            await this.bloquearPlayer(game, alvo);
                            break;
                    }
                }
            }
        }

        return true;
    }

    public override async resolverOferta(game: Game, ofertaId: string): Promise<void> {
        const oferta = await game.getSkillManager().getOferta();
        if (!oferta) {
            console.error(`Oferta não encontrada para o ID: ${ofertaId}`);
            return;
        }

        if (oferta.status === "PENDENTE") await OfertaDAO.updateOferta(ofertaId, false);

        const status = oferta.status === "ACEITA" ? true : false;
        const parametros = oferta.parametros ? JSON.parse(oferta.parametros) : null;

        const playerAlvo = await game.getPlayerManager().loadPlayer(oferta.alvoId);
        const emissor = await game.getPlayerManager().loadPlayer(oferta.emissorId);
        if (!emissor) return;
        if (!playerAlvo || !playerAlvo.getCargo()) return;

        // Criar alerta para o emissor sobre a resposta do alvo
        await game.getSkillManager().criarAlerta(emissor, `Sua oferta para ${playerAlvo.getUsername()} foi ${status ? "ACEITA" : "RECUSADA"}.`)
        console.log(`A oferta para ${playerAlvo.getUsername()} foi ${status ? "ACEITA" : "RECUSADA"}.`);


        await this.updateListaRecusados(game, emissor, playerAlvo, status)

        const cargoAlvo = playerAlvo.getCargo();

        if (status) {
            if (cargoAlvo?.getAlinhamento() !== "Cidade") {
                const habId = String(parametros?.habilidadePerdidaId);
                
                if (habId) {
                    await HabilidadeDAO.updateHabilidade(habId, { status: "IMPEDIDA" });

                    const dados: DadoImpedidaEvangelho = {
                        tipo: "IMPEDIDA_EVANGELHO",
                        habilidadeId: habId,
                        evangelistaId: emissor.getId()
                    }
                    await game.getPlayerManager().storeDadosExtra(emissor, dados)
                    
                    game.sendMensagemPlayer(playerAlvo, "🚫 Sua habilidade ficará bloqueada até o Evangelista morrer.");
                }
            } else {
                // CIDADE: Fica Bloqueado na noite atual
                await this.bloquearPlayer(game, playerAlvo);
            }
        } else {
            game.sendMensagemPlayer(playerAlvo, "Você recusou a palavra e seus pecados pesam sobre você...");
        }
    }
}