import { StringSelectMenuInteraction,ModalBuilder, LabelBuilder, UserSelectMenuBuilder, ModalSubmitInteraction } from 'discord.js';
import { Game } from '../Game.js';
import { PlayerDAO } from '../DAOs/PlayerDAO.js';
import { HabilidadeDAO } from '../DAOs/HabilidadeDAO.js';
import { Prisma } from '@prisma/client';

export type PrismaAction = Prisma.ActionGetPayload<{
    include: {
        alvos: true,
        habilidade: true
    }
}>;

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

    public async usarHabilidade(game: Game, action: PrismaAction): Promise<string | void> {
        // Custo padrão é 1
        const custo = action.parametrosAcao ? this.getCustoUso(action.parametrosAcao) : 1;
        const habilidade = action.habilidade;
        
        // Atualiza o uso da habilidade, habilidades reutilizaveis tem custo de 10000
        const valorUsoTotal = habilidade.uso - custo;
        await HabilidadeDAO.updateHabilidade(habilidade.id, { uso: valorUsoTotal });

        await this.ativar(game, action);
    }

    public getCustoUso(parametros: string): number {
        const parsedParams = JSON.parse(parametros || "{}");
        const custo = parsedParams.custoUso || 1;
        return custo;
    }

    public async ativar(game: Game, action: PrismaAction): Promise<string | void> {}

    public async ofertar(game: Game, emissorId: string, alvos: string[], nomeOferta: string, item?: string, parametros?: string): Promise<void> {
        console.log(`Criando oferta do jogador ${emissorId} para os alvos ${alvos.join(", ")} com a habilidade ${this.getNome()} e oferta ${nomeOferta}.`);
        
        const partida = await game.getPartida();
        if (!partida) return;

        for (const alvo of alvos) {
            await game.getPlayerManager().criarOferta(emissorId, alvo, this.getNome(), nomeOferta, item, parametros);
            await game.getPlayerManager().criarAlerta(alvo, `Você recebeu a oferta: ${nomeOferta}! Digite /offer para responder.`)
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

        await game.getPlayerManager().criarAction(emissorId, habilidade!.id, [selectValue]);
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
            await game.getPlayerManager().criarAlerta(alvo, `Você foi visitado essa noite!`);
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
        await game.getPlayerManager().criarAlerta(alvo, `Você foi bloqueado essa noite!`)
    }

    protected async atacarPlayer(game: Game, alvo: string, action: PrismaAction): Promise<void> {
        // Prot Invencibilidade(5) > Obliteracao(4) > Prot Poderosa (3) > Ataque Poderoso(2) > Prot Basica (1) > Ataque Basico (0)
        const poderAtaque = action.parametrosAcao

        const playerAlvo = await PlayerDAO.getPlayerById(alvo, game.getGuildId());
        if (!playerAlvo) {
            console.error(`Player alvo não encontrado para id ${alvo} e guildId ${game.getGuildId()}`);
            return;
        }
        if (poderAtaque > playerAlvo.protecao) {
            console.log(`Alvo ${alvo} tem proteção inferior e pode ser atacado.`);
            game.processarMortePlayer(alvo)
            return;
        } else {
            console.log(`Alvo ${alvo} tem proteção suficiente para resistir ao ataque.`);
            await PlayerDAO.updatePlayer(alvo, playerAlvo.guildId, { protecao: 0 });
            // depois checar para proteçoes inatas 
            if (playerAlvo.cargo === "Bigode") {
                console.log(`Alvo ${alvo} é um Bigode e tem proteção especial.`);
                await PlayerDAO.updatePlayer(alvo, playerAlvo.guildId, { protecao: 1 });
            }
        }
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

export class ExecucaoPublica extends Habilidade {
    constructor() {
        super("Execução Pública", "Instantânea", 1, "Dia", ["Astral", "Instantânea", "Especial"]);
    }

    public override async buildModal(interaction: StringSelectMenuInteraction, game: Game, quemUsouId: string): Promise<ModalBuilder | void> {
        
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

        const targetCargoLabel = new LabelBuilder()
            .setLabel('Qual o cargo do alvo?')
            .setUserSelectMenuComponent(
                new UserSelectMenuBuilder()
                    .setCustomId(`select_cargo_${this.getNome()}`)
                    .setPlaceholder('Selecione o seu alvo...')
                    .setMinValues(1)
                    .setMaxValues(1)
            )   
        

        modal.addLabelComponents(targetLabel, targetCargoLabel);
        
        return modal;
    }
}

export class Reputacao extends Habilidade {
    constructor() {
        super("Reputação", "Passiva");
    }

}

export class Prender extends Habilidade {
    constructor() {
        super("Prender", "Prioridade", 10000, "Noite", ["Imparavel"]);
    }
}

export class Pacificacao extends Habilidade {
    constructor() {
        super("Pacificacao", "Prioridade", 3, "Noite", ["Dormente", "Imparavel"]);
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

}

export class Matar extends Habilidade {
    constructor() {
        super("Matar", "Ofensiva", 10000, "Noite", ["Dormente"]);
    }

}

export class Massacre extends Habilidade {
    constructor() {
        super("Massacre", "Ofensiva", 1, "Noite", ["Especial"]);
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

