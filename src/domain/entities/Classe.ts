import { Cargo } from './Cargo.js';

export class Classe {
    private alinhamento: string;
    private nome: string;
    private numeroSetor: number;

    constructor(alinhamento: string, nome: string) {
        this.alinhamento = alinhamento;
        this.nome = nome;
        this.numeroSetor = 0;
    }

    public getNome(): string {
        return this.nome;
    }

    public getAlinhamento(): string {
        return this.alinhamento;
    }

    public setNome(nome: string): void {
        this.nome = nome;
    }

    public setAlinhamento(alinhamento: string): void {
        this.alinhamento = alinhamento;
    }
}

export class Setor {
    private setorId: number;
    private cargos: Cargo[]; 

    constructor(setorId: number) {
        this.setorId = setorId;
        this.cargos = [];
    }

    public addCargo(novoCargo: Cargo): void {
        this.cargos.push(novoCargo);
    }

    public listarCargos(): Cargo[] {
        return this.cargos;
    }

    public buscarNome(nome: string): Cargo | undefined {
        return this.cargos.find(c => c.getNomeClasse() === nome);
    }

    public getSetorId(): number {
        return this.setorId;
    }

    public setSetorId(setorId: number): void {
        this.setorId = setorId;
    }
}

export class CidadeJusticeiro extends Classe {
    constructor() {
        super("Cidade", "Justiceiro");
    }
}

export class CidadeInvestigacao extends Classe {
    constructor() {
        super("Cidade", "Investigação");
    }
}

export class CidadeProtecao extends Classe {
    constructor() {
        super("Cidade", "Proteção");
    }
}

export class CidadeSuporte extends Classe {
    constructor() {
        super("Cidade", "Suporte");
    }
}

export class MafiaLider extends Classe {
    constructor() {
        super("Mafia", "Lider");
    }
}

export class MafiaAssassino extends Classe {
    constructor() {
        super("Mafia", "Assassino");
    }
}

export class MafiaDisrupcao extends Classe {
    constructor() {
        super("Mafia", "Disrupção");
    }
}

export class Neutro extends Classe {
    constructor() {
        super("Neutro", "");
    }
}
