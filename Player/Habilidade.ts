import { Game } from '../Game.js';
import { Modificador } from './Modificador.js';
import type { Player } from './Player.js';

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

    public usarHabilidade(game: Game, quemUsou: Player, alvo?: Player): string | void {
        
        if (this.modificadores?.includes("Dormente")) {
            // Usa a instância do jogo que foi passada
            if (game.getEtapa() < 4) {
                throw new Error("Habilidade não pode ser usada antes do dia 2.");
            }
        }
        
        if (this.modificadores?.includes("Astral")) {
            // Então não é uma visita
            console.log(`${quemUsou.getStatus()} usou uma habilidade Astral.`);
        }

    }

    // public abstract ativar(quemUsou: Player, alvo?: Player): string | void;


    private visitarPlayer(alvo: Player): void {
        console.log(`${alvo.getStatus()} foi visitado.`);
        // depois avisar player q visitou exceto exceções
    }

    private bloquearPlayer(alvo: Player): void {
        console.log(`${alvo.getStatus()} foi bloqueado.`);
        // depois avisar player q foi bloqueado exceto exceções
    }

    private atacarPlayer(alvo: Player, poderoso?: boolean): void {
        if (alvo)

        console.log(`${alvo.getStatus()} foi atacado.`);
        // depois avisar player q foi atacado exceto exceções
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

    public getModificadores(): string[] {
        if (!this.modificadores) {
            throw new Error("Habilidade não possui modificadores.");
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
        super("Evangelho", "Dia", 10000, "Comunicacao");
    }
}

export class PalavraDeDeus extends Habilidade {
    constructor() {
        super("Palavra de Deus", "Ofensiva", 10000, "Noite");
    }
}

export class Snipe extends Habilidade {
    constructor() {
        super("Snipe", "Ofensiva", 2, "Noite", ["Dormente"]);
    }
}

export class ExecucaoPublica extends Habilidade {
    constructor() {
        super("Execução Pública", "Instantânea", 1, "Dia", ["Astral", "Instantânea", "Especial"]);
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

export class ProcessoDeEliminacao extends Habilidade {
    constructor() {
        super("Processo de Eliminação", "Descoberta", 10000, "Noite");
    }
}

export class InvestigacaoProfunda extends Habilidade {
    constructor() {
        super("Investigação Profunda", "Descoberta", 1, "Dia", ["Instantanea"]);
    }
}

export class LevantamentoDeDados extends Habilidade {
    constructor() {
        super("Levantamento de Dados", "Descoberta", 10000, "Noite", ["Astral"]);
    }
}

export class ConsultaDeArquivos extends Habilidade {
    constructor() {
        super("Consulta de Arquivos", "Descoberta", 2, "Noite", ["Astral"]);
    }
}

export class Vigilar extends Habilidade {
    constructor() {
        super("Vigilar", "Descoberta", 10000, "Noite", ["Astral"]);
    }
}

export class Rastrear extends Habilidade {
    constructor() {
        super("Rastrear", "Descoberta", 4, "Atemporal", ["Repetível"]);
    }
}

export class ArmaduraCorporal extends Habilidade {
    constructor() {
        super("Armadura Corporal", "Passiva");
    }
}

export class Escolta extends Habilidade {
    constructor() {
        super("Escolta", "Prioridade", 10000, "Noite", ["Imparavel"]);
    }
}

export class EquiparSe extends Habilidade {
    constructor() {
        super("Equipar-se", "Foco", 2, "Noite");
    }
}

export class Advocacia extends Habilidade {
    constructor() {
        super("Advocacia", "Passiva", 0, undefined, ["Astral"]);
    }
}

export class Absolver extends Habilidade {
    constructor() {
        super("Absolver", "?", 0, "Noite", ["Astral", "Imparavel"]);
    }
}

export class NegociarPena extends Habilidade {
    constructor() {
        super("Negociar Pena", "?", 0, "Noite", ["Gratis", "Imparavel"]);
    }
}

export class PraticasUrgentes extends Habilidade {
    constructor() {
        super("Práticas Urgentes", "Utilidade", 10000, "Noite");
    }
}

export class CuraMilagrosa extends Habilidade {
    constructor() {
        super("Cura Milagrosa", "Defensiva", 1, "Noite", ["Rapida"]);
    }
}

export class SextoSentido extends Habilidade {
    constructor() {
        super("Sexto Sentido", "Passiva");
    }
}

export class Comunhao extends Habilidade {
    constructor() {
        super("Comunhão", "Utilidade", 10000, "Atemporal");
    }
}

export class SegundaChance extends Habilidade {
    constructor() {
        super("Segunda Chance", "Utilidade", 1, "Noite", ["Especial"]);
    }
}

export class Pescar extends Habilidade {
    constructor() {
        super("Pescar", "Foco", 10000, "Atemporal");
    }
}

export class MKULTRA extends Habilidade {
    constructor() {
        super("MKULTRA", "Passiva");
    }
}

export class VivaMaisUmDia extends Habilidade {
    constructor() {
        super("Viva Mais Um Dia", "Comunicacao", 10000, "Dia");
    }
}

export class VirarANoite extends Habilidade {
    constructor() {
        super("Virar a Noite", "Comunicacao", 4, "Dia", ["Gratis"]);
    }
}

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

export class Plantar extends Habilidade {
    constructor() {
        super("Plantar", "Utilidade", 10000, "Noite");
    }
}

export class Detonar extends Habilidade {
    constructor() {
        super("Detonar", "Ofensiva", 10000, "Noite", ["Astral"]);
    }
}

export class OGrandeBotao extends Habilidade {
    constructor() {
        super("O Grande Botão", "Utilidade", 1, "Dia", ["Dormente"]);
    }
}

export class AtarCordas extends Habilidade {
    constructor() {
        super("Atar Cordas", "Utilidade", 10000, "Noite");
    }
}

export class Marcha extends Habilidade {
    constructor() {
        super("Marcha", "Prioridade", 10000, "Noite", ["Imparavel"]);
    }
}

export class CortarAsCordas extends Habilidade {
    constructor() {
        super("Cortar as Cordas", "Ofensiva", 1, "Noite", ["Especial"]);
    }
}

export class Hipnotizar extends Habilidade {
    constructor() {
        super("Hipnotizar", "Utilidade", 10000, "Atemporal", ["Gratis"]);
    }
}

export class ProprioReflexo extends Habilidade {
    constructor() {
        super("Proprio Reflexo", "Utilidade", 2, "Atemporal");
    }
}

export class PoderDaSugestao extends Habilidade {
    constructor() {
        super("Poder da Sugestão", "Prioridade", 1, "Atemporal", ["Astral"]);
    }
}

export class Escuta extends Habilidade {
    constructor() {
        super("Escuta", "Utilidade", 3, "Noite", ["Repetivel"]);
    }
}

export class Infiltrar extends Habilidade {
    constructor() {
        super("Infiltrar", "Utilidade", 2, "Noite");
    }
}

export class QuebraDeSeguranca extends Habilidade {
    constructor() {
        super("Quebra de Segurança", "Instantanea", 1, "Atemporal", ["Instantaneo", "Gratis", "Especial"]);
    }
}

export class AUltimaRisada extends Habilidade {
    constructor() {
        super("A Última Risada", "Vitoria");
    }
}

export class Pegadinha extends Habilidade {
    constructor() {
        super("Pegadinha", "Utilidade", 10000, "Noite");
    }
}

export class RancorEterno extends Habilidade {
    constructor() {
        super("Rancor Eterno", "Vitoria");
    }
}

export class CampanhaDeDifamacao extends Habilidade {
    constructor() {
        super("Campanha de Difamação", "Passiva");
    }
}

export class PrepararAForca extends Habilidade {
    constructor() {
        super("Preparar a Forca", "Utilidade", 1, "Atemporal");
    }
}

export class TendenciasPsicoticas extends Habilidade {
    constructor() {
        super("Tendências Psicóticas", "Passiva");
    }
}

export class Assassinar extends Habilidade {
    constructor() {
        super("Assassinar", "Ofensiva", 10000, "Noite", ["Dormente"]);
    }
}

export class SedeDeSangue extends Habilidade {
    constructor() {
        super("Sede de Sangue", "Foco", 1, "Noite", ["Gratis", "Especial"]);
    }
}

export class LuaCheia extends Habilidade {
    constructor() {
        super("Lua Cheia", "Passiva", 0, undefined, ["Especial"]);
    }
}

export class SentidoLunar extends Habilidade {
    constructor() {
        super("Sentido Lunar", "Descoberta", 10000, "Dia");
    }
}

export class Dilacerar extends Habilidade {
    constructor() {
        super("Dilacerar", "Ofensiva", 10000, "Noite", ["Dormente", "Especial", "Imparavel"]);
    }
}

