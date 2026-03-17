import * as Class from './Classe.js';
import { Player } from './Player.js';
import { Habilidade } from './Habilidade.js';

export class Cargo {
    private nome: string;
    private classe: Class.Classe;
    private raridade: string;
    private habilidades: Habilidade[];
    private complexidade: number;
    private protecaoInata: number;
    
    
    constructor(nome: string, classe: Class.Classe, raridade: string, habilidades: Habilidade[], complexidade: number, protecaoInata?: number) {
        this.nome = nome;
        this.classe = classe;
        this.raridade = raridade;
        this.habilidades = habilidades;
        this.complexidade = complexidade;
        this.protecaoInata = protecaoInata ? protecaoInata : 0;
    }

    public usarHabilidade(indice: number, quemUsou: Player, alvo?: Player): string | void {
        if (this.habilidades.length === 0) {
            console.error("Este cargo não possui habilidades.");
        }
        if (indice < 0 || indice >= this.habilidades.length) {
            console.error("Índice de habilidade inválido.");
        }
        // repetivel e gratis provavelmente entra aqui
    }
    
    public getNome(): string {
        return this.nome;
    }
    
    public setNome(nome: string): void {
        this.nome = nome;
    }
    
    public getNomeClasse(): string {
        return this.classe.getNome();
    }
    
    public getAlinhamento(): string {
        return this.classe.getAlinhamento();
    }
    
    public getRaridade(): string {
        return this.raridade;
    }
    
    public getHabilidades(): Habilidade[] {
        return this.habilidades;
    }
    
    public getProtecaoInata(): number {
        return this.protecaoInata;
    }
    
    public getComplexidade(): number {
        return this.complexidade;
    }

    public setClasse(classe: Class.Classe): void {
        this.classe = classe;
    }

    public setRaridade(raridade: string): void {
        this.raridade = raridade;
    }

    public setHabilidades(habilidades: Habilidade[]): void {
        this.habilidades = habilidades;
    }

    public setComplexidade(complexidade: number): void {
        this.complexidade = complexidade;
    }
}

// export class Detetive extends Cargo {
//     constructor() {
//         super("Detetive", new Class.CidadeInvestigacao(), "Comum", [new Hab.ProcessoDeEliminacao(), new Hab.InvestigacaoProfunda()], 1);
//     }
// }

// export class Bibliotecario extends Cargo {
//     constructor() {
//         super("Bibliotecario", new Class.CidadeInvestigacao(), "Comum", [new Hab.LevantamentoDeDados(), new Hab.ConsultaDeArquivos()], 2);
//     }
// }

// export class Vigilante extends Cargo {
//     constructor() {
//         super("Vigilante", new Class.CidadeInvestigacao(), "Comum", [new Hab.Vigilar(), new Hab.Rastrear()], 1);
//     }
// }

// export class GuardaCostas extends Cargo {
//     constructor() {
//         super("Guarda Costas", new Class.CidadeProtecao(), "Comum", [new Hab.ArmaduraCorporal(), new Hab.Escolta(), new Hab.EquiparSe()], 1);
//     }
// }

// export class Advogado extends Cargo {
//     constructor() {
//         super("Advogado", new Class.CidadeProtecao(), "Comum", [new Hab.Advocacia(), new Hab.Absolver(), new Hab.NegociarPena()], 2);
//     }
// }

// export class Cirurgiao extends Cargo {
//     constructor() {
//         super("Cirurgiao", new Class.CidadeProtecao(), "Comum", [new Hab.PraticasUrgentes(), new Hab.CuraMilagrosa()], 1);
//     }
// }

// export class Medium extends Cargo {
//     constructor() {
//         super("Medium", new Class.CidadeSuporte(), "Único", [new Hab.SextoSentido(), new Hab.Comunhao(), new Hab.SegundaChance()], 2);
//     }
// }

// export class Pescador extends Cargo {
//     constructor() {
//         super("Pescador", new Class.CidadeSuporte(), "Comum", [new Hab.Pescar()], 2);
//     }
// }

// export class AgenteDaCIA extends Cargo {
//     constructor() {
//         super("Agente da CIA", new Class.CidadeSuporte(), "Comum", [new Hab.MKULTRA(), new Hab.VivaMaisUmDia(), new Hab.VirarANoite()], 2);
//     }
// }

// export class Bombardeiro extends Cargo {
//     constructor() {
//         super("Bombardeiro", new Class.MafiaAssassino(), "Comum", [new Hab.Plantar(), new Hab.Detonar(), new Hab.OGrandeBotao()], 1);
//     }
// }

// export class Ventriloquista extends Cargo {
//     constructor() {
//         super("Ventriloquista", new Class.MafiaAssassino(), "Único", [new Hab.AtarCordas(), new Hab.Marcha(), new Hab.CortarAsCordas()], 2);
//     }
// }

// export class Hipnotista extends Cargo {
//     constructor() {
//         super("Hipnotista", new Class.MafiaDisrupcao(), "Comum", [new Hab.Hipnotizar(), new Hab.ProprioReflexo(), new Hab.PoderDaSugestao()], 2);
//     }
// }

// export class Espiao extends Cargo {
//     constructor() {
//         super("Espiao", new Class.MafiaDisrupcao(), "Comum", [new Hab.Escuta(), new Hab.Infiltrar(), new Hab.QuebraDeSeguranca()], 1);
//     }
// }

// export class Bobo extends Cargo {
//     constructor() {
//         super("Bobo", new Class.Neutro(), "Comum", [new Hab.AUltimaRisada(), new Hab.Pegadinha()], 1);
//     }
// }

// export class Carrasco extends Cargo {
//     constructor() {
//         super("Carrasco", new Class.Neutro(), "Comum", [new Hab.RancorEterno(), new Hab.CampanhaDeDifamacao(), new Hab.PrepararAForca()], 2);
//     }
// }

// export class SerialKiller extends Cargo {
//     constructor() {
//         super("Serial Killer", new Class.Neutro(), "Único", [new Hab.TendenciasPsicoticas(), new Hab.Assassinar(), new Hab.SedeDeSangue()], 1);
//     }
// }