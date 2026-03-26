import { Game } from '../Managers/GameManager.js';
import { Cargo } from "./Cargo.js";
import { Habilidade } from "./Habilidade.js";
import { Carta } from "./Carta.js";
import { Alerta } from "./Alerta.js";
import { Prisma } from '@prisma/client';
import type { DadoExtra } from "./Tipos.js";

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

    private dadosExtra: DadoExtra[];

    private protecao: number; // Prot Invencibilidade(5) > Obliteracao(4) > Prot Poderosa (3) > Ataque Poderoso(2) > Prot Basica (1) > Ataque Basico (0)

    constructor(game: Game, player: PrismaPlayer) {
        this.id = player.id;
        this.userId = player.userId;
        this.username = player.username;


        if (player.cargo) {
            const habilidades = player.habilidades
                .map(h => game.getSkillManager().getHabilidadeInstance(h.nome, h.id, h.uso, h.status))
                .filter(h => h !== null);
            this.cargo = game.getSkillManager().getCargoInstance(player.cargo, habilidades) || null;
        } else {
            this.cargo = null;
        }
        
        this.protecao = player.protecao;
        this.isAlive = player.estaVivo;
        this.quantCartas = player.quantCartas;
        this.distrito = player.distrito;
        
        this.userChat = player.userChat || "";
        
        // this.items = player.itens?.map(i => new Habilidade(i.nome, i.tipo, i.uso, i.etapa)) || [];
        this.items = [];
        this.cartas = player.cartas?.map(c => new Carta(c.id, c.userId, c.destinatario, c.mensagem)) || [];
        this.alertas = player.alertas?.map(a => new Alerta(a.id, a.userId, a.etapa, a.alerta)) || [];

        this.status = JSON.parse(player.status || "[]");
        this.marcas = JSON.parse(player.marcas || "[]");
        this.dadosExtra = JSON.parse(player.dadosExtra || "[]");
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

    public getHabilidade(nome: string): Habilidade | undefined {
        return this.getHabilidades()?.find(h => h.getNome() === nome);
    }

    public getHabilidades(): Habilidade[] | undefined {
        return this.cargo?.getHabilidades();
    }

    public getClasse() {
        return `${this.getAlinhamento()} ${this.cargo?.getNomeClasse()}`;
    }

    public getDadosExtra(): DadoExtra[] {
        return this.dadosExtra;
    }

    public getId(): string {
        return this.id;
    }

    public getUserId(): string {
        return this.userId;
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

    public getCargo(): Cargo | null {
        return this.cargo;
    }

    public getDistrito(): number {
        return this.distrito;
    }
    
    public getProtecao(): number {
        return this.protecao;
    }

    public setEstaVivo(vivo: boolean) {
        this.isAlive = vivo;
    }

    public setProtecao(valor: number) {
        this.protecao = valor;
    }

    public setStatus(novoStatus: string[]) { // Ou string JSON, dependendo de como você tipou
        this.status = novoStatus;
    }

    public setDadosExtra(dados: DadoExtra[]) { // Ou string JSON
        this.dadosExtra = dados;
    }
}