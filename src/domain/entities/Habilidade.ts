export abstract class Habilidade {
    private id?: string;
    private nome: string;
    private tipo: string;
    private status: string;
    private uso: number;
    private etapa: string;
    private modificadores?: string[];

    constructor(nome: string, tipo: string, uso?: number, etapa?: string, modificadores?: string[], status?: string) {
        this.nome = nome;
        this.tipo = tipo;
        this.uso = uso || 10000;
        this.etapa = etapa || "Dia";
        this.modificadores = modificadores ||  [];
        this.status = status || "DISPONIVEL";
    }

    public getId(): string | undefined {
        return this.id;
    }

    public setId(id: string): void {
        this.id = id;
    }

    public getNome(): string {
        return this.nome;
    }

    public getStatus(): string {
        return this.status;
    }

    public getEtapa(): string {
        return this.etapa;
    }
    
    public getUso(): number {
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

    public setStatus(status: string): void {
        this.status = status;
    }

    public setTipo(tipo: string): void {
        this.tipo = tipo;
    }

    public setModificadores(modificadores: string[]): void {
        this.modificadores = modificadores;
    }
}