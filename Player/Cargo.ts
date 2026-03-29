import type { DefinicaoCargo } from './ECA.js';
import { ClassesDoJogo } from './Habilidades/classes.js';
import type { HabilidadeDinamica } from './Habilidades/HabilidadeDinamica.js';

export class Cargo {
    private definicao: DefinicaoCargo;
    private habilidades: HabilidadeDinamica[];

    constructor(definicao: DefinicaoCargo, habilidades: HabilidadeDinamica[]) {
        this.definicao = definicao;
        this.habilidades = habilidades;
    }

    public getNome(): string {
        return this.definicao.nome;
    }

    // Olha que genial: Ele vai no dicionário de classes sozinho!
    public getAlinhamento(): string {
        const classeDef = ClassesDoJogo[this.definicao.classe];
        return classeDef ? classeDef.alinhamento : "Desconhecido";
    }

    public getNomeClasse(): string {
        const classeDef = ClassesDoJogo[this.definicao.classe];
        return classeDef ? classeDef.nome : "Desconhecida";
    }

    public getProtecaoInata(): number {
        return this.definicao.protecaoInata;
    }

    public getHabilidades(): HabilidadeDinamica[] {
        return this.habilidades;
    }
}

// export class AtiradorDeElite extends Cargo {
//     constructor(habilidades?: Habilidade[]) {
//         super("Atirador de Elite", new Class.CidadeJusticeiro(), "Comum", habilidades || [new Snipe(), new ExecucaoPublica()], 2);
//     }
// }

// export class Xerife extends Cargo {
//     constructor() {
//         super("Xerife", new Class.CidadeJusticeiro(), "Comum", [new Hab.Reputacao(), new Hab.Prender(), new Hab.Pacificacao()], 2);
//     }
// }

// export class Bigode extends Cargo {
//     // lembrar q esse bicho vem com protecao basica
//     constructor() {
//         super("Bigode", new Class.MafiaLider(), "Único", [new Hab.PunhoDeFerro(), new Hab.Matar(), new Hab.Massacre()], 2, 1);
//     }
// }


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