import { StringSelectMenuInteraction, ActionRowBuilder, StringSelectMenuBuilder, 
    ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle,
    ButtonInteraction, MessageFlags, type ModalActionRowComponentBuilder,
    LabelBuilder, UserSelectMenuBuilder, ModalSubmitInteraction,
    } from 'discord.js';
import { Game } from '../Game.js';
import { PartidaDAO } from '../DAOs/PartidaDAO.js';
import { AlertaDAO } from '../DAOs/AlertaDAO.js';
import { PlayerDAO } from '../DAOs/PlayerDAO.js';
import { ActionDAO } from '../DAOs/ActionDAO.js';
import { OfertaDAO } from '../DAOs/OfertaDAO.js';
import { HabilidadeDAO } from '../DAOs/HabilidadeDAO.js';

export class Habilidade {
    private nome: string;
    private uso?: number;
    private tipo: string;
    private etapa?: string;
    private modificadores?: string[];

    constructor(nome: string, tipo: string, uso?: number, etapa?: string, modificadores?: string[]) {
        this.nome = nome;
        this.tipo = tipo;
        this.uso = uso || 0;
        if (etapa) {
            this.etapa = etapa;
        }
        if (modificadores) {
            this.modificadores = modificadores;
        }
    }

    public async usarHabilidade(game: Game, quemUsou: string, alvo?: string[]): Promise<string | void> {
        const partida = await PartidaDAO.getPartida(game.getGuildId());
        if (!partida) {
            console.error(`Partida não encontrada para guildId ${game.getGuildId()}`);
            return;
        }

        // if (quemUsou) {
        //     if (this.modificadores?.includes("Imparavel")) {
        //         console.log(`${quemUsou} estava bloqueado, mas a habilidade ${this.getNome()} é Imparável!`);
        //     } else {
        //         console.log(`${quemUsou} foi bloqueado e perdeu a ação.`);
        //         game.sendMensagemPlayer(quemUsou, "🚫 Você foi bloqueado esta noite e sua ação falhou!");
        //         return;
        //     }
        // }
        
        if (this.modificadores?.includes("Dormente")) {
            // Usa a instância do jogo que foi passada
            const etapaAtual = await PartidaDAO.getPartida(game.getGuildId()).then(partida => partida?.etapaAtual || 1);
            if (!etapaAtual) {
                console.error(`Partida não encontrada para ${game.getGuildId()}`);
                return;
            }

            if (etapaAtual < 4) {
                console.error("Habilidade não pode ser usada antes do dia 2.");
                return;
            }
        }
        
        if (this.modificadores?.includes("Astral")) {
            // Então não é uma visita
        }
        
        await this.ativar(game, quemUsou, alvo);
    }

    public async ativar(game: Game, quemUsou: string, alvos?: string[]): Promise<string | void> {}

    public async ofertar(game: Game, emissorId: string, alvos: string[], nomeOferta: string, item?: string, parametros?: string): Promise<void> {
        console.log(`Criando oferta do jogador ${emissorId} para os alvos ${alvos.join(", ")} com a habilidade ${this.getNome()} e oferta ${nomeOferta}.`);
        
        const partida = await game.getPartida();
        if (!partida) return;

        for (const alvo of alvos) {
            await game.getPlayerManager().criarOferta(emissorId, alvo, this.getNome(), nomeOferta, item, parametros);
            await AlertaDAO.createAlerta(game.getGuildId(), alvo, partida.getEtapaAtual(), `Você recebeu a oferta: ${nomeOferta}! Digite /offer para responder.`);
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
        const selectValue = selectedUsers?.firstKey()?.toString(); // pega o primeiro, se tiver mais de um temos que fazer um map

        console.log("selectvalue: " + selectValue)
        if (!selectValue) {
            console.error("Select value não encontrado");
            return interaction.reply({content: "Nenhum valor selecionado"});
        }

        const jogadorAlvo = await PlayerDAO.getPlayerById(selectValue, game.getGuildId());
        console.log("jogadorAlvo: " + jogadorAlvo?.id)
        if (!jogadorAlvo) {
            return interaction.reply({ content: "❌ **Erro:** Esse usuário não está participando da partida atual!" });
        }

        if (!jogadorAlvo.estaVivo) {
            return interaction.reply({ content: "👻 **Erro:** Você só pode mirar em jogadores vivos." });
        }

        if (selectValue === interaction.user.id) {
            // mudar dependendo da habilidade
            // return interaction.reply({ content: "❌ **Erro:** Você não pode usar essa habilidade em si mesmo!" });
        }

        // const inputValues = interaction.fields.getTextInputValue('input');
        const partida = await game.getPartida();
        if (!partida) {
            console.error("Partida não encontrada modal");
            return interaction.reply({content: "Erro, contate o host do jogo"});
        }
        const emissor = await PlayerDAO.getPlayerById(emissorId, game.getGuildId());
        if (!emissor) {
            console.error("Player não encontrado modal");
            return interaction.reply({content: "Erro, contate o host do jogo"});
        }
        const habilidade = emissor.habilidades.find(hab => hab.nome === this.getNome());

        await ActionDAO.createAction(emissorId, game.getGuildId(), partida.getEtapaAtual(), habilidade!.id, [selectValue]);
        console.log("Modal submetido, alvo:", selectValue);
        return interaction.reply({ content: `Habilidade ${this.getNome()} usada com sucesso!` });
    }

    protected async visitarPlayer(game: Game, alvo: string, alertado: boolean): Promise<void> {
        if (alertado) {
            console.log(`alvo foi visitado e alertado.`);
        }
        // depois avisar player q visitou exceto exceções
        const partida = await game.getPartida();
        if (!partida) {
            console.error(`Partida não encontrada para guildId ${game.getGuildId()}`);
            return;
        }
        if (alertado) {
            await AlertaDAO.createAlerta(game.getGuildId(), alvo, partida.getEtapaAtual(), `Você foi visitado essa noite!`);
        }
    }

    protected async bloquearPlayer(game: Game, alvo: string): Promise<void> {
        // depois avisar player q foi bloqueado exceto exceções
        const partida = await game.getPartida();
        if (!partida) {
            console.error(`Partida não encontrada para guildId ${game.getGuildId()}`);
            return;
        }
        await PlayerDAO.updatePlayer(alvo, game.getGuildId(), { status: "BLOQUEADO" });
        await AlertaDAO.createAlerta(game.getGuildId(), alvo, partida.getEtapaAtual(), `Você foi bloqueado essa noite!`);
    }

    protected async atacarPlayer(game: Game, alvo: string, poderAtaque: number): Promise<void> {
        // Prot Invencibilidade(5) > Obliteracao(4) > Prot Poderosa (3) > Ataque Poderoso(2) > Prot Basica (1) > Ataque Basico (0)
        const playerAlvo = await PlayerDAO.getPlayerById(alvo, game.getGuildId());
        if (!playerAlvo) {
            console.error(`Player alvo não encontrado para id ${alvo} e guildId ${game.getGuildId()}`);
            return;
        }
        if (poderAtaque > playerAlvo.protecao) {
            console.log(`Alvo ${alvo} tem proteção inferior e pode ser atacado.`);
            await PlayerDAO.updatePlayer(alvo, playerAlvo.guildId, { estaVivo: false })
            return;
        } else {
            console.log(`Alvo ${alvo} tem proteção suficiente para resistir ao ataque.`);
            await PlayerDAO.updatePlayer(alvo, playerAlvo.guildId, { protecao: 0 });
            if (playerAlvo.cargo === "Bigode") {
                console.log(`Alvo ${alvo} é um Bigode e tem proteção especial.`);
                await PlayerDAO.updatePlayer(alvo, playerAlvo.guildId, { protecao: 1 });
            }
        }
    }

    public async criarAction(game: Game, userId: string, habilidade: Habilidade, alvos?: string[]): Promise<void> {
        game.getPlayerManager().criarAction(userId, habilidade, alvos);
    }

    public getNome(): string {
        return this.nome;
    }

    public getEtapa(): string {
        if (!this.etapa) {
            throw new Error("Habilidade não possui etapa definida.");
        }
        return this.etapa;
    }
    
    public getUso(): number {
        if (this.uso === undefined) {
            throw new Error("Habilidade não possui uso definido.");
        }
        return this.uso;
    }

    public getTipo(): string {
        return this.tipo;
    }

    public getPrioridade(): number {
        switch (this.tipo) {
            case "Instantanea":
                return 10;
            case "Prioridade":
                return 4;
            case "Defensiva":
            case "Protecao":
                return 3;
            case "Ofensiva":
                return 2;
            case "Descoberta":
            case "Investigação":
            case "Suporte":
                return 1;
            default:                
                return 0;
        }
    }

    public getModificadores(): string[] | null {
        if (!this.modificadores) {
            console.log(`Habilidade ${this.getNome()} não possui modificadores.`);
            return null;
        }
        return this.modificadores;
    }

    public setEtapa(etapa: string): void {
        this.etapa = etapa;
    }

    public setUso(uso: number): void {
        this.uso = uso;
    }

    public setTipo(tipo: string): void {
        this.tipo = tipo;
    }

    public setModificadores(modificadores: string[]): void {
        this.modificadores = modificadores;
    }
}

export class Evangelho extends Habilidade {
    constructor() {
        super("Evangelho", "Comunicacao", 10000, "Dia");
    }

    public async ativar(game: Game, quemUsou: string, alvo?: string[]): Promise<void> {
        if (!alvo) {
            console.error("Habilidade requer um alvo.");
            return;
        } else if (alvo.length > 1) {
            console.error("Habilidade Evangelho só pode ter um alvo.");
            return;
        }
        await this.ofertar(game, quemUsou, alvo, "Arrependimento");
        console.log(`Habilidade ${this.getNome()} usada por ${quemUsou} com alvo ${alvo}.`);
    }

    public override async resolverOferta(game: Game, ofertaId: string): Promise<void> {
        const oferta = await OfertaDAO.getOfertaById(ofertaId);
        if (!oferta) {
            console.error(`Oferta não encontrada para o ID: ${ofertaId}`);
            return;
        }

        const alvo = oferta.alvoId;
        const emissor = oferta.emissorId;
        const status = oferta.status === "ACEITA" ? true : false;
        const parametros = oferta.parametros ? JSON.parse(oferta.parametros) : null;

        // Criar alerta para o emissor sobre a resposta do alvo
        await game.getPlayerManager().criarAlerta(emissor, `Sua oferta para ${alvo} foi ${status ? "ACEITA" : "RECUSADA"}.`)
        console.log(`A oferta para ${alvo} foi ${status ? "ACEITA" : "RECUSADA"}.`);

        const playerAlvo = await PlayerDAO.getPlayerById(alvo, game.getGuildId());
        if (!playerAlvo || !playerAlvo.cargo) return;

        await this.updateListaRecusados(game, emissor, alvo, status)

        const cargoAlvo = game.getPlayerManager().getCargoInstance(playerAlvo.cargo);

        if (status) {
            if (cargoAlvo?.getAlinhamento() !== "Cidade") {
                const habId = String(parametros?.habilidadePerdidaId);
                
                if (habId) {
                    await HabilidadeDAO.updateHabilidade(habId, { status: "IMPEDIDA" });

                    const dadosExtra = JSON.parse(playerAlvo.dadosExtra || "[]");
                    dadosExtra.push({
                        tipo: "IMPEDIDA_EVANGELHO",
                        habilidadeId: habId,
                        evangelistaId: emissor
                    });
                    await PlayerDAO.updatePlayer(alvo, game.getGuildId(), { dadosExtra: JSON.stringify(dadosExtra) });
                    
                    game.sendMensagemPlayer(alvo, "🚫 Sua habilidade ficará bloqueada até o Evangelista morrer.");
                }
            } else {
                // CIDADE: Fica Bloqueado na noite atual
                await this.bloquearPlayer(game, alvo);
            }
        } else {
            game.sendMensagemPlayer(alvo, "Você recusou a palavra e seus pecados pesam sobre você...");
        }
    }

    public async updateListaRecusados(game: Game, emissor: string, alvo: string, aceitou: boolean) {
        const playerEmissor = await PlayerDAO.getPlayerById(emissor, game.getGuildId());
        if (!playerEmissor) return;

        let dadosExtraEmissor = JSON.parse(playerEmissor.dadosExtra || "[]");

        if (!Array.isArray(dadosExtraEmissor)) {
            console.warn(`[Aviso] dadosExtra de ${emissor} não era um array. Resetando para [].`);
            dadosExtraEmissor = [];
        }
        
        let index = dadosExtraEmissor.findIndex((d: any) => d.tipo === "ALVOS_RECUSADOS");

        if (index === -1) {
            dadosExtraEmissor.push({ tipo: "ALVOS_RECUSADOS", alvos: [] });
            index = dadosExtraEmissor.length - 1;
        }

        const listaAlvos = dadosExtraEmissor[index].alvos;
        const alvoJaEstaNaLista = listaAlvos.includes(alvo);

        if (!aceitou) {
            if (!alvoJaEstaNaLista) {
                listaAlvos.push(alvo);
            }
        } else {
            if (alvoJaEstaNaLista) {
                dadosExtraEmissor[index].alvos = listaAlvos.filter((a: string) => a !== alvo);
            }
        }

        await PlayerDAO.updatePlayer(emissor, game.getGuildId(), { dadosExtra: JSON.stringify(dadosExtraEmissor) });
    }
}

export class PalavraDeDeus extends Habilidade {
    constructor() {
        super("Palavra de Deus", "Ofensiva", 10000, "Noite");
    }

    public override async ativar(game: Game, emissor: string, alvo?: string[]): Promise<void> {
        if (!alvo || alvo.length === 0) {
            console.error("Habilidade requer um alvo.");
            return;
        } else if (alvo.length > 1) {
            console.error("Habilidade Palavra de Deus só pode ter um alvo.");
            return;
        }
        const alvoId = alvo[0];
        const player = await PlayerDAO.getPlayerById(alvoId!, game.getGuildId());
        if (!player) {
            console.error(`Nenhum player encontrado para guildId ${game.getGuildId()}`);
            return;
        }
        
        const oferta = player.ofertas.find(o => o.habilidade === this.getNome() && o.emissorId === emissor); // isso deve dar problema depois
        if (!oferta) {
            console.error(`Nenhuma oferta encontrada para habilidade ${this.getNome()} do emissor ${emissor} para o alvo ${alvoId}.`);
            return;
        }


    }

    public override async buildModal(interaction: StringSelectMenuInteraction, game: Game, emissor: string): Promise<ModalBuilder | void> {
        const emissorPlayer = await PlayerDAO.getPlayerById(emissor, game.getGuildId());
        const alvosValidos = [];
        if (!emissorPlayer) {
            console.error(`Player emissor não encontrado para id ${emissor} e guildId ${game.getGuildId()}`);
            await interaction.reply({ content: "Ocorreu um erro ao buscar suas ofertas. Tente novamente mais tarde.", flags: MessageFlags.Ephemeral });
            return;
        }

        const ofertas = emissorPlayer.ofertas.filter(o => o.habilidade === this.getNome() && o.status === "RECUSADA");
        for (const oferta of ofertas) {
            const playerAlvo = await PlayerDAO.getPlayerById(oferta.alvoId, game.getGuildId());
            if (!playerAlvo) {
                console.error(`Player alvo não encontrado para id ${oferta.alvoId} e guildId ${game.getGuildId()}`);
                continue;
            }
            alvosValidos.push(playerAlvo);
        }

        if (alvosValidos.length === 0) {
            await interaction.reply({ content: "Não há alvos vivos que recusaram \"Arrependimento\" para esta habilidade." });
            return;
        }

       const modal = new ModalBuilder()
            .setCustomId('skill_modal_' + this.getNome())
            .setTitle('Usando habilidade: ' + this.getNome());

        const targetLabel = new LabelBuilder()
            .setLabel('Quem é o alvo?')
            .setStringSelectMenuComponent(
                new StringSelectMenuBuilder()
                    .setCustomId('select')
                    .setPlaceholder('Selecione o seu alvo...')
                    .addOptions(
                        alvosValidos.map(p => ({
                            label: p.username,
                            value: p.userId
                        })
                    )
            )   
        )

        modal.addLabelComponents(targetLabel);
        
        return modal;
    }

    public override async resolverModal(interaction: ModalSubmitInteraction, game: Game, quemUsouId: string) {
        const selectValues = interaction.fields.getStringSelectValues('select');
        // const inputValues = interaction.fields.getTextInputValue('input');

        console.log("Modal submetido:", selectValues);
        return interaction.reply({ content: `Habilidade ${this.getNome()} usada com sucesso!` });
    }

}

export class Snipe extends Habilidade {
    constructor() {
        super("Snipe", "Ofensiva", 2, "Noite", ["Dormente"]);
    }

    public async ativar(game: Game, quemUsou: string, alvo?: string[]): Promise<void> {
        
    }
}

export class ExecucaoPublica extends Habilidade {
    constructor() {
        super("Execução Pública", "Instantânea", 1, "Dia", ["Astral", "Instantânea", "Especial"]);
    }

    public async ativar(game: Game, quemUsou: string, alvo?: string[]): Promise<void> {

    }

    public override async buildModal(interaction: StringSelectMenuInteraction, game: Game, quemUsouId: string): Promise<ModalBuilder | void> {
        const players = await PlayerDAO.getPlayers(game.getGuildId());
        if (!players || players.length === 0) {
            console.error("Players não encontrados");
            return;
        } 
        const alvosValidos = players.filter(p => p.estaVivo && p.userId !== quemUsouId);

        if (alvosValidos.length === 0) {
            await interaction.reply({ content: "Não há alvos válidos para esta habilidade." });
            return;
        }

       const modal = new ModalBuilder()
            .setCustomId('skill_modal_' + this.getNome())
            .setTitle('Usando habilidade: ' + this.getNome());

        const targetLabel = new LabelBuilder()
            .setLabel('Quem é o alvo?')
            .setStringSelectMenuComponent(
                new StringSelectMenuBuilder()
                    .setCustomId('select')
                    .setPlaceholder('Selecione o seu alvo...')
                    .addOptions(
                        alvosValidos.map(p => ({
                            label: p.username,
                            value: p.userId
                        })
                    )
            )   
        )

        const targetCargoLabel = new LabelBuilder()
            .setLabel('Qual o cargo do alvo?')
            .setStringSelectMenuComponent(
                new StringSelectMenuBuilder()
                    .setCustomId('select')
                    .setPlaceholder('Selecione o seu alvo...')
                    .addOptions(
                        alvosValidos.map(p => ({
                            label: p.username,
                            value: p.userId
                        })
                    )
            )   
        )

        modal.addLabelComponents(targetLabel);
        
        return modal;
    }
}

export class Reputacao extends Habilidade {
    constructor() {
        super("Reputação", "Passiva");
    }

    public async ativar(game: Game, quemUsou: string, alvo?: string[]): Promise<void> {

    }
}

export class Prender extends Habilidade {
    constructor() {
        super("Prender", "Prioridade", 10000, "Noite", ["Imparavel"]);
    }

    public async ativar(game: Game, quemUsou: string, alvo?: string[]): Promise<void> {

    }
}

export class Pacificacao extends Habilidade {
    constructor() {
        super("Pacificacao", "Prioridade", 3, "Noite", ["Dormente", "Imparavel"]);
    }

    public async ativar(game: Game, quemUsou: string, alvo?: string[]): Promise<void> {

    }
}

// export class ProcessoDeEliminacao extends Habilidade {
//     constructor() {
//         super("Processo de Eliminação", "Descoberta", 10000, "Noite");
//     }
// }

// export class InvestigacaoProfunda extends Habilidade {
//     constructor() {
//         super("Investigação Profunda", "Descoberta", 1, "Dia", ["Instantanea"]);
//     }
// }

// export class LevantamentoDeDados extends Habilidade {
//     constructor() {
//         super("Levantamento de Dados", "Descoberta", 10000, "Noite", ["Astral"]);
//     }
// }

// export class ConsultaDeArquivos extends Habilidade {
//     constructor() {
//         super("Consulta de Arquivos", "Descoberta", 2, "Noite", ["Astral"]);
//     }
// }

// export class Vigilar extends Habilidade {
//     constructor() {
//         super("Vigilar", "Descoberta", 10000, "Noite", ["Astral"]);
//     }
// }

// export class Rastrear extends Habilidade {
//     constructor() {
//         super("Rastrear", "Descoberta", 4, "Atemporal", ["Repetível"]);
//     }
// }

// export class ArmaduraCorporal extends Habilidade {
//     constructor() {
//         super("Armadura Corporal", "Passiva");
//     }
// }

// export class Escolta extends Habilidade {
//     constructor() {
//         super("Escolta", "Prioridade", 10000, "Noite", ["Imparavel"]);
//     }
// }

// export class EquiparSe extends Habilidade {
//     constructor() {
//         super("Equipar-se", "Foco", 2, "Noite");
//     }
// }

// export class Advocacia extends Habilidade {
//     constructor() {
//         super("Advocacia", "Passiva", 0, undefined, ["Astral"]);
//     }
// }

// export class Absolver extends Habilidade {
//     constructor() {
//         super("Absolver", "?", 0, "Noite", ["Astral", "Imparavel"]);
//     }
// }

// export class NegociarPena extends Habilidade {
//     constructor() {
//         super("Negociar Pena", "?", 0, "Noite", ["Gratis", "Imparavel"]);
//     }
// }

// export class PraticasUrgentes extends Habilidade {
//     constructor() {
//         super("Práticas Urgentes", "Utilidade", 10000, "Noite");
//     }
// }

// export class CuraMilagrosa extends Habilidade {
//     constructor() {
//         super("Cura Milagrosa", "Defensiva", 1, "Noite", ["Rapida"]);
//     }
// }

// export class SextoSentido extends Habilidade {
//     constructor() {
//         super("Sexto Sentido", "Passiva");
//     }
// }

// export class Comunhao extends Habilidade {
//     constructor() {
//         super("Comunhão", "Utilidade", 10000, "Atemporal");
//     }
// }

// export class SegundaChance extends Habilidade {
//     constructor() {
//         super("Segunda Chance", "Utilidade", 1, "Noite", ["Especial"]);
//     }
// }

// export class Pescar extends Habilidade {
//     constructor() {
//         super("Pescar", "Foco", 10000, "Atemporal");
//     }
// }

// export class MKULTRA extends Habilidade {
//     constructor() {
//         super("MKULTRA", "Passiva");
//     }
// }

// export class VivaMaisUmDia extends Habilidade {
//     constructor() {
//         super("Viva Mais Um Dia", "Comunicacao", 10000, "Dia");
//     }
// }

// export class VirarANoite extends Habilidade {
//     constructor() {
//         super("Virar a Noite", "Comunicacao", 4, "Dia", ["Gratis"]);
//     }
// }

export class PunhoDeFerro extends Habilidade {
    constructor() {
        super("Punho de Ferro", "Passiva", 0, undefined, ["Especial"]);
    }

    public async ativar(game: Game, quemUsou: string, alvo?: string[]): Promise<void> {

    }
}

export class Matar extends Habilidade {
    constructor() {
        super("Matar", "Ofensiva", 10000, "Noite", ["Dormente"]);
    }

    public async ativar(game: Game, quemUsou: string, alvo?: string[]): Promise<void> {

    }
}

export class Massacre extends Habilidade {
    constructor() {
        super("Massacre", "Ofensiva", 1, "Noite", ["Especial"]);
    }

    public async ativar(game: Game, quemUsou: string, alvo?: string[]): Promise<void> {

    }
}

// export class Plantar extends Habilidade {
//     constructor() {
//         super("Plantar", "Utilidade", 10000, "Noite");
//     }
// }

// export class Detonar extends Habilidade {
//     constructor() {
//         super("Detonar", "Ofensiva", 10000, "Noite", ["Astral"]);
//     }
// }

// export class OGrandeBotao extends Habilidade {
//     constructor() {
//         super("O Grande Botão", "Utilidade", 1, "Dia", ["Dormente"]);
//     }
// }

// export class AtarCordas extends Habilidade {
//     constructor() {
//         super("Atar Cordas", "Utilidade", 10000, "Noite");
//     }
// }

// export class Marcha extends Habilidade {
//     constructor() {
//         super("Marcha", "Prioridade", 10000, "Noite", ["Imparavel"]);
//     }
// }

// export class CortarAsCordas extends Habilidade {
//     constructor() {
//         super("Cortar as Cordas", "Ofensiva", 1, "Noite", ["Especial"]);
//     }
// }

// export class Hipnotizar extends Habilidade {
//     constructor() {
//         super("Hipnotizar", "Utilidade", 10000, "Atemporal", ["Gratis"]);
//     }
// }

// export class ProprioReflexo extends Habilidade {
//     constructor() {
//         super("Proprio Reflexo", "Utilidade", 2, "Atemporal");
//     }
// }

// export class PoderDaSugestao extends Habilidade {
//     constructor() {
//         super("Poder da Sugestão", "Prioridade", 1, "Atemporal", ["Astral"]);
//     }
// }

// export class Escuta extends Habilidade {
//     constructor() {
//         super("Escuta", "Utilidade", 3, "Noite", ["Repetivel"]);
//     }
// }

// export class Infiltrar extends Habilidade {
//     constructor() {
//         super("Infiltrar", "Utilidade", 2, "Noite");
//     }
// }

// export class QuebraDeSeguranca extends Habilidade {
//     constructor() {
//         super("Quebra de Segurança", "Instantanea", 1, "Atemporal", ["Instantaneo", "Gratis", "Especial"]);
//     }
// }

// export class AUltimaRisada extends Habilidade {
//     constructor() {
//         super("A Última Risada", "Vitoria");
//     }
// }

// export class Pegadinha extends Habilidade {
//     constructor() {
//         super("Pegadinha", "Utilidade", 10000, "Noite");
//     }
// }

// export class RancorEterno extends Habilidade {
//     constructor() {
//         super("Rancor Eterno", "Vitoria");
//     }
// }

// export class CampanhaDeDifamacao extends Habilidade {
//     constructor() {
//         super("Campanha de Difamação", "Passiva");
//     }
// }

// export class PrepararAForca extends Habilidade {
//     constructor() {
//         super("Preparar a Forca", "Utilidade", 1, "Atemporal");
//     }
// }

// export class TendenciasPsicoticas extends Habilidade {
//     constructor() {
//         super("Tendências Psicóticas", "Passiva");
//     }
// }

// export class Assassinar extends Habilidade {
//     constructor() {
//         super("Assassinar", "Ofensiva", 10000, "Noite", ["Dormente"]);
//     }
// }

// export class SedeDeSangue extends Habilidade {
//     constructor() {
//         super("Sede de Sangue", "Foco", 1, "Noite", ["Gratis", "Especial"]);
//     }
// }

// export class LuaCheia extends Habilidade {
//     constructor() {
//         super("Lua Cheia", "Passiva", 0, undefined, ["Especial"]);
//     }
// }

// export class SentidoLunar extends Habilidade {
//     constructor() {
//         super("Sentido Lunar", "Descoberta", 10000, "Dia");
//     }
// }

// export class Dilacerar extends Habilidade {
//     constructor() {
//         super("Dilacerar", "Ofensiva", 10000, "Noite", ["Dormente", "Especial", "Imparavel"]);
//     }
// }

