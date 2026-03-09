import { StringSelectMenuInteraction, ActionRowBuilder, StringSelectMenuBuilder, 
    ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle,
    ButtonInteraction,
    MessageFlags,
    type ModalActionRowComponentBuilder,
    LabelBuilder,
    ModalSubmitInteraction} from 'discord.js';
import { platform } from 'node:os';
import { db } from '../database.js';
import { Game } from '../Game.js';
import { Modificador } from './Modificador.js';
import { Player } from './Player.js';
import { Partida } from './Partida.js';

export abstract class Habilidade {
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
        const partida = await db.getPartida(game.getGuildId());
        if (!partida) {
            console.error(`Partida não encontrada para guildId ${game.getGuildId()}`);
            return;
        }

        if (game.isBloqueado(quemUsou)) {
            if (this.modificadores?.includes("Imparavel")) {
                console.log(`${quemUsou} estava bloqueado, mas a habilidade ${this.getNome()} é Imparável!`);
            } else {
                console.log(`${quemUsou} foi bloqueado e perdeu a ação.`);
                game.sendMensagemPlayer(quemUsou, "🚫 Você foi bloqueado esta noite e sua ação falhou!");
                return;
            }
        }
        
        if (this.modificadores?.includes("Dormente")) {
            // Usa a instância do jogo que foi passada
            const etapaAtual = await db.getPartida(game.getGuildId()).then(partida => partida?.etapaAtual || 1);
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
        
        this.ativar(game, quemUsou, alvo);
    }

    public async ativar(game: Game, quemUsou: string, alvos?: string[]): Promise<string | void> {}

    public ofertar(game: Game, quemOfertou: string, alvos: string[], nomeOferta: string, item?: string, parametros?: string): void {
        // depois tem que ter um jeito de limitar isso pra certas habilidades e tal
        for (const alvo of alvos) {
            game.getPlayerManager().criarOferta(quemOfertou, alvo, this.getNome(), nomeOferta, item, parametros);
        }
    }

    public async resolverOferta(game: Game, ofertaId: string): Promise<void> {}

    public async buildModal(interaction: StringSelectMenuInteraction, game: Game, quemUsouId: string): Promise<ModalBuilder | void> {
        const jogadores = await db.getPlayers(game.getGuildId());
        const alvosValidos = jogadores//.filter(p => p.estaVivo && p.userId !== quemUsouId);

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

        modal.addLabelComponents(targetLabel);
        
        return modal;
    }

    public async resolverModal(interaction: ModalSubmitInteraction, game: Game, quemUsouId: string): Promise<void> {
        const selectValues = interaction.fields.getStringSelectValues('select');
        // const inputValues = interaction.fields.getTextInputValue('input');

        console.log("Modal submetido:", selectValues);
        await interaction.reply({ content: `Habilidade ${this.getNome()} usada com sucesso!` });
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
            await db.criarAlerta(game.getGuildId(), alvo, partida.getEtapaAtual(), `Você foi visitado essa noite!`);
        }
    }

    protected async bloquearPlayer(game: Game, alvo: string): Promise<void> {
        // depois avisar player q foi bloqueado exceto exceções
        const partida = await game.getPartida();
        if (!partida) {
            console.error(`Partida não encontrada para guildId ${game.getGuildId()}`);
            return;
        }
        await db.updatePlayer(alvo, game.getGuildId(), { status: "BLOQUEADO" });
        await db.criarAlerta(game.getGuildId(), alvo, partida.getEtapaAtual(), `Você foi bloqueado essa noite!`);
    }

    protected async atacarPlayer(game: Game, alvo: string, poderAtaque: number): Promise<void> {
        // Prot Invencibilidade(5) > Obliteracao(4) > Prot Poderosa (3) > Ataque Poderoso(2) > Prot Basica (1) > Ataque Basico (0)
        const playerAlvo = await db.getPlayerById(alvo, game.getGuildId());
        if (!playerAlvo) {
            console.error(`Player alvo não encontrado para id ${alvo} e guildId ${game.getGuildId()}`);
            return;
        }
        if (poderAtaque > playerAlvo.protecao) {
            console.log(`Alvo ${alvo} tem proteção inferior e pode ser atacado.`);
            await db.updatePlayer(alvo, playerAlvo.guildId, { estaVivo: false })
            return;
        } else {
            console.log(`Alvo ${alvo} tem proteção suficiente para resistir ao ataque.`);
            await db.updatePlayer(alvo, playerAlvo.guildId, { protecao: 0 });
            if (playerAlvo.cargo === "Bigode") {
                console.log(`Alvo ${alvo} é um Bigode e tem proteção especial.`);
                await db.updatePlayer(alvo, playerAlvo.guildId, { protecao: 1 });
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
            case "Prioridade":
                return 9;
                break;
            case "Instantânea":
                return 10;
                break;
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
        }
        this.ofertar(game, quemUsou, alvo, "Arrependimento");
        console.log(`Habilidade ${this.getNome()} usada por ${quemUsou} com alvo ${alvo}.`);
    }

    public override async resolverOferta(game: Game, ofertaId: string): Promise<void> {
        const oferta = await db.getOfertaById(ofertaId);
        const alvo = oferta!.alvoId;
        const emissor = oferta!.emissorId;
        const status = oferta!.status === "ACEITA" ? true : false;

        const parametros = oferta!.parametros ? JSON.parse(oferta!.parametros) : null;
        const habilidadePerdida = parametros?.habilidadePerdida;

        // Criar alerta para o emissor sobre a resposta do alvo
        game.sendMensagemPlayer(emissor, `Sua oferta para ${alvo} foi ${status ? "ACEITA" : "RECUSADA"}.`);
        // por enquanto msg para debug
        const playerAlvo = await db.getPlayerById(alvo, game.getGuildId());
        const partida = await game.getPartida();
        if (!partida) {
            console.error(`Partida não encontrada para guildId ${game.getGuildId()}`);
            return;
        }
        if (!playerAlvo) {
            console.error(`Player alvo não encontrado para id ${alvo} e guildId ${game.getGuildId()}`);
            return;
        }
        if (status) {
            const cargoAlvo = game.getPlayerManager().getCargoInstance(playerAlvo.cargo);
            if (!cargoAlvo) {
                console.error(`Cargo do player alvo é inválido: ${playerAlvo.cargo}`);
                return;
            }
            if (cargoAlvo.getAlinhamento() != "Cidade") {
                console.log(`Alvo ${alvo} aceitou a oferta e é do alinhamento ${cargoAlvo.getAlinhamento()}.`);
                try {
                    const habilidade = await db.getHabilidade(this.getNome(), alvo, game.getGuildId());
                } catch (e) {
                    console.error(`Erro ao buscar habilidadeId para ${this.getNome()} do player ${alvo} na guild ${game.getGuildId()}: ${e}`);
                    return;
                }
                try {
                    const playerAlvo = await db.getPlayerById(alvo, game.getGuildId());
                } catch (e) {
                    console.error(`Erro ao buscar player alvo após aceitar oferta: ${e}`);
                    return;
                }
                const habilidadeRemovida = playerAlvo.habilidades.find(h => h.nome === habilidadePerdida);
                if (!habilidadeRemovida) {
                    console.error(`Habilidade a ser perdida ${habilidadePerdida} não encontrada entre as habilidades do player alvo.`);
                    return;
                }

                await db.updateHabilidade(habilidadeRemovida.id, { status: "IMPEDIDA" });
            } else {
                console.log(`Alvo ${alvo} aceitou a oferta e é do alinhamento Cidade.`);
                await this.bloquearPlayer(game, alvo);
            }
        } else {
            await db.updateOferta(ofertaId, "RECUSADO");
        }
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
        const player = await db.getPlayerById(alvoId!, game.getGuildId());
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
        const emissorPlayer = await db.getPlayerById(game.getGuildId(), emissor);
        const alvosValidos = [];
        if (!emissorPlayer) {
            console.error(`Player emissor não encontrado para id ${emissor} e guildId ${game.getGuildId()}`);
            await interaction.reply({ content: "Ocorreu um erro ao buscar suas ofertas. Tente novamente mais tarde.", flags: MessageFlags.Ephemeral });
            return;
        }

        const ofertas = emissorPlayer.ofertas.filter(o => o.habilidade === this.getNome() && o.status === "RECUSADA");
        for (const oferta of ofertas) {
            const playerAlvo = await db.getPlayerById(oferta.alvoId, game.getGuildId());
            if (!playerAlvo) {
                console.error(`Player alvo não encontrado para id ${oferta.alvoId} e guildId ${game.getGuildId()}`);
                continue;
            }
            alvosValidos.push(playerAlvo);
        }

        if (alvosValidos.length === 0) {
            await interaction.reply({ content: "Não há alvos vivos com marca \"Arrependimento\" para esta habilidade." });
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

    public override async resolverModal(interaction: ModalSubmitInteraction, game: Game, quemUsouId: string): Promise<void> {
        const selectValues = interaction.fields.getStringSelectValues('select');
        // const inputValues = interaction.fields.getTextInputValue('input');

        console.log("Modal submetido:", selectValues);
        await interaction.reply({ content: `Habilidade ${this.getNome()} usada com sucesso!` });
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
        const jogadores = await db.getPlayers(game.getGuildId());
        const alvosValidos = jogadores//.filter(p => p.estaVivo && p.userId !== quemUsouId);

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

