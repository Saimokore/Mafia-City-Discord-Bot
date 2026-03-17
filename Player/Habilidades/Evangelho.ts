import { HabilidadeDAO } from "../../DAOs/HabilidadeDAO.js";
import { OfertaDAO } from "../../DAOs/OfertaDAO.js";
import { PlayerDAO } from "../../DAOs/PlayerDAO.js";
import type { Game } from "../../Game.js";
import { Habilidade } from "../Habilidade.js";
import { Prisma } from '@prisma/client';

export type PrismaAction = Prisma.ActionGetPayload<{
    include: {
        alvos: true,
        habilidade: true
    }
}>;

export class Evangelho extends Habilidade {
    constructor(usos?: number, status?: string) {
        super("Evangelho", "Comunicacao", usos || 10000, "Dia", [], status || "DISPONIVEL");
    }

    public override async ativar(game: Game, action: PrismaAction): Promise<void> {
        const alvosId = action.alvos.map(a => a.id);

        await this.ofertar(game, action.userId, action.alvos.map(a => a.id), "Arrependimento");
        console.log(`Habilidade ${this.getNome()} usada por ${action.userId} com alvo ${alvosId}.`);
    }

    public override async resolverOferta(game: Game, ofertaId: string): Promise<void> {
        const oferta = await OfertaDAO.getOfertaById(ofertaId);
        if (!oferta) {
            console.error(`Oferta não encontrada para o ID: ${ofertaId}`);
            return;
        }

        if (oferta.status === "PENDENTE") await OfertaDAO.updateOferta(ofertaId, false);

        const alvo = oferta.alvoId;
        const status = oferta.status === "ACEITA" ? true : false;
        const parametros = oferta.parametros ? JSON.parse(oferta.parametros) : null;
        const emissor = await game.getPlayerManager().loadPlayer(oferta.emissorId);
        if (!emissor) return;

        // Criar alerta para o emissor sobre a resposta do alvo
        await game.getSkillManager().criarAlerta(emissor.getId(), `Sua oferta para ${alvo} foi ${status ? "ACEITA" : "RECUSADA"}.`)
        console.log(`A oferta para ${alvo} foi ${status ? "ACEITA" : "RECUSADA"}.`);

        const playerAlvo = await PlayerDAO.getPlayerById(alvo, game.getGuildId());
        if (!playerAlvo || !playerAlvo.cargo) return;

        await this.updateListaRecusados(game, emissor.getId(), alvo, status)

        const cargoAlvo = game.getSkillManager().getCargoInstance(playerAlvo.cargo);

        if (status) {
            if (cargoAlvo?.getAlinhamento() !== "Cidade") {
                const habId = String(parametros?.habilidadePerdidaId);
                
                if (habId) {
                    await HabilidadeDAO.updateHabilidade(habId, { status: "IMPEDIDA" });

                    const dados = {
                        tipo: "IMPEDIDA_EVANGELHO",
                        habilidadeId: habId,
                        evangelistaId: emissor
                    }
                    await game.getPlayerManager().storeDadosExtra(emissor, JSON.stringify(dados))
                    
                    game.sendMensagemPlayer(alvo, "🚫 Sua habilidade ficará bloqueada até o Evangelista morrer.");
                }
            } else {
                // CIDADE: Fica Bloqueado na noite atual
                await this.bloquearPlayer(game, alvo);
            }
        } else {
            game.sendMensagemPlayer(alvo, "Você recusou a palavra e seus pecados pesam sobre você...");
        }
    }

    public async updateListaRecusados(game: Game, emissor: string, alvo: string, aceitou: boolean) {
        const playerEmissor = await PlayerDAO.getPlayerById(emissor, game.getGuildId());
        if (!playerEmissor) return;

        let dadosExtraEmissor = JSON.parse(playerEmissor.dadosExtra || "[]");

        if (!Array.isArray(dadosExtraEmissor)) {
            console.warn(`[Aviso] dadosExtra de ${emissor} não era um array. Resetando para [].`);
            dadosExtraEmissor = [];
        }
        
        let index = dadosExtraEmissor.findIndex((d: any) => d.tipo === "ALVOS_RECUSADOS");

        if (index === -1) {
            dadosExtraEmissor.push({ tipo: "ALVOS_RECUSADOS", alvos: [] });
            index = dadosExtraEmissor.length - 1;
        }

        const listaAlvos = dadosExtraEmissor[index].alvos;
        const alvoJaEstaNaLista = listaAlvos.includes(alvo);

        if (!aceitou) {
            if (!alvoJaEstaNaLista) {
                listaAlvos.push(alvo);
            }
        } else {
            if (alvoJaEstaNaLista) {
                dadosExtraEmissor[index].alvos = listaAlvos.filter((a: string) => a !== alvo);
            }
        }

        await PlayerDAO.updatePlayer(emissor, game.getGuildId(), { dadosExtra: JSON.stringify(dadosExtraEmissor) });
    }
}