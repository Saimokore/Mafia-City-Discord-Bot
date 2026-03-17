import { Game } from "../Game.js";
import { Cargo } from "./Cargo.js";
import { Habilidade } from "./Habilidade.js";
import { Carta } from "./Carta.js";
import { Alerta } from "./Alerta.js";
import { Prisma } from '@prisma/client';
import { HabilidadeDAO } from "../DAOs/HabilidadeDAO.js";
import { PlayerDAO } from "../DAOs/PlayerDAO.js";

export type PrismaPlayer = Prisma.PlayerGetPayload<{
    include: {
        cartas: true,
        alertas: true,
        habilidades: true,
        itens: true
    }
}>;

export class Player {
    private id: string;
    private userId: string;
    private username: string;

    private isAlive: boolean;
    private distrito: number;

    private cartas: Carta[];
    private quantCartas: number;
    
    private cargo: Cargo | null;

    private status: string[];
    private marcas: string[];
    private items: Habilidade[];
    private alertas: Alerta[];

    private userChat: string;

    private dadosExtra: string[];
    
    private protecao: number; // Prot Invencibilidade(5) > Obliteracao(4) > Prot Poderosa (3) > Ataque Poderoso(2) > Prot Basica (1) > Ataque Basico (0)

    constructor(game: Game, player: PrismaPlayer) {
        this.id = player.id;
        this.userId = player.userId;
        this.username = player.username;

        if (player.cargo) {
            this.cargo = game.getSkillManager().getCargoInstance(player.cargo) || null;

            if (this.cargo && player.habilidades) {
                const habilidades = player.habilidades
                    .map(h => game.getSkillManager().getHabilidadeInstance(h.nome, h.uso, h.status))
                    .filter(h => h !== null);
                
                this.cargo.setHabilidades(habilidades);
            }
        } else {
            this.cargo = null;
        }
        
        this.protecao = player.protecao;
        this.isAlive = player.estaVivo;
        this.quantCartas = player.quantCartas;
        this.distrito = player.distrito;
        
        this.userChat = player.userChat || "";
        
        this.items = player.itens?.map(i => new Habilidade(i.nome, i.tipo, i.uso, i.etapa)) || [];
        this.cartas = player.cartas?.map(c => new Carta(c.id, c.userId, c.destinatario, c.mensagem)) || [];
        this.alertas = player.alertas?.map(a => new Alerta(a.id, a.userId, a.etapa, a.alerta)) || [];

        this.status = JSON.parse(player.status || "[]");
        this.marcas = JSON.parse(player.marcas || "[]");
        this.dadosExtra = JSON.parse(player.dadosExtra || "[]");
    }

    public async processarMorte(game: Game) {
        const cargo = this.getCargo();
        if (!cargo) return;

        if (cargo.getNome() === "Evangelista") {
            const todosJogadores = await game.getPlayerManager().getAllPlayers();
            if (!todosJogadores || todosJogadores.length === 0) {
                console.error("Players não encontrados");
                return;
            }
            
            for (const player of todosJogadores) {
                let dadosExtra = player.getDadosExtra();
                
                const dadosExtraMaldiçao = dadosExtra.find((m: any) => m.tipo === "IMPEDIDA_EVANGELHO" && m.evangelistaId === this.id);
                
                if (dadosExtraMaldiçao) {
                    await HabilidadeDAO.updateHabilidade(dadosExtraMaldiçao.habilidadeId, { status: "ATIVA" });
                    
                    const novasMarcas = dadosExtra.filter((m: any) => m !== dadosExtraMaldiçao);
                    await PlayerDAO.updatePlayer(player.userId, game.getGuildId(), { marcas: JSON.stringify(novasMarcas) });
                    
                    // await this.sendMensagemPlayer(player.userId, "🔔 O Evangelista faleceu! Sua habilidade perdida foi restaurada e pode ser usada novamente.");
                    // checar se devo realmente avisar o player que ele possui sua habilidade denovo, provavel que não
                }
            }
        }
    }

    public getAlinhamento(): string | undefined {
        if (!this.cargo) return;
        return this.cargo.getAlinhamento();
    }

    public getStatus(): string {
        return `Nome: ${this.username}
        Cargo: ${this.cargo ? this.cargo.getNome() : "Sem cargo"}
        Vivo: ${this.isAlive}
        Cartas: ${this.quantCartas}
        Distrito: ${this.distrito}
        Proteção: ${this.protecao || "Nenhuma"}
        Status: ${JSON.stringify(this.status) || "Nenhum"}
        Marcas: ${JSON.stringify(this.marcas) || "Nenhuma"}
        Itens: ${this.items.map(i => i.getNome()).join(", ") || "Nenhum"}
        Habilidades: ${this.cargo ? this.cargo.getHabilidades().map(h => h.getNome()).join(", ") : "Nenhuma"}
        Alertas: ${this.alertas.map(a => a.getAlerta()).join(", ") || "Nenhum"}`;
    }

    public getHabilidades() {
        return this.cargo?.getHabilidades();
    }

    public getDadosExtra() {
        return this.dadosExtra;
    }

    public getId(): string {
        return this.id;
    }

    public estaVivo(): boolean {
        return this.isAlive;
    }

    public getUserChat(): string {
        return this.userChat;
    }

    public getUsername(): string {
        return this.username;
    }

    public getCargo(): Cargo | undefined {
        if (!this.cargo) return;
        return this.cargo;
    }

    public isPlayerAlive(): boolean {
        return this.isAlive;
    }

    public getDistrito(): number {
        return this.distrito;
    }
    
}