export class Partida {
    private id: string;
    private guildId: string;
    private status: string;
    private etapaAtual: number;

    constructor(id: string, guildId: string, status: string, etapaAtual: number) {
        this.id = id;
        this.guildId = guildId;
        this.status = status;
        this.etapaAtual = etapaAtual;
    }

    public getId(): string {
        return this.id;
    }

    public getGuildId(): string {
        return this.guildId;
    }

    public getStatus(): string {
        return this.status;
    }

    public getEtapaAtual(): number {
        return this.etapaAtual;
    }
}