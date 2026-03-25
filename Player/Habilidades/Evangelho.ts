import { HabilidadeDAO } from "../../DAOs/HabilidadeDAO.js";
import { OfertaDAO } from "../../DAOs/OfertaDAO.js";
import { PlayerDAO } from "../../DAOs/PlayerDAO.js";
import { Game } from '../../Managers/GameManager.js';
import { Habilidade } from "../Habilidade.js";
import type { DadoImpedidaEvangelho } from "../Tipos.js";
import type { Action } from "../Action.js";
import type { Player } from "../Player.js";


export class Evangelho extends Habilidade {
    constructor(usos?: number, status?: string) {
        super("Evangelho", "Comunicacao", usos || 10000, "Dia", [], status || "DISPONIVEL");
    }

    public override async ativar(game: Game, action: Action): Promise<boolean> {
        const alvos = action.getAlvos();

        await this.ofertar(game, action.getUserId(), alvos, "Arrependimento");
        console.log(`Habilidade ${this.getNome()} usada por ${action.getUserId()} com alvo ${alvos.forEach(a => a.getId() + " ")}.`);
        return true;
    }
    
    public override async resolverOferta(game: Game, ofertaId: string): Promise<void> {
        const oferta = await OfertaDAO.getOfertaById(ofertaId);
        if (!oferta) {
            console.error(`Oferta não encontrada para o ID: ${ofertaId}`);
            return;
        }

        if (oferta.status === "PENDENTE") await OfertaDAO.updateOferta(ofertaId, false);

        const status = oferta.status === "ACEITA" ? true : false;
        const parametros = oferta.parametros ? JSON.parse(oferta.parametros) : null;

        const playerAlvo = await game.getPlayerManager().loadPlayer(oferta.alvoId);
        const emissor = await game.getPlayerManager().loadPlayer(oferta.emissorId);
        if (!emissor) return;
        if (!playerAlvo || !playerAlvo.getCargo()) return;

        // Criar alerta para o emissor sobre a resposta do alvo
        await game.getSkillManager().criarAlerta(emissor, `Sua oferta para ${playerAlvo.getUsername()} foi ${status ? "ACEITA" : "RECUSADA"}.`)
        console.log(`A oferta para ${playerAlvo.getUsername()} foi ${status ? "ACEITA" : "RECUSADA"}.`);


        await this.updateListaRecusados(game, emissor, playerAlvo, status)

        const cargoAlvo = playerAlvo.getCargo();

        if (status) {
            if (cargoAlvo?.getAlinhamento() !== "Cidade") {
                const habId = String(parametros?.habilidadePerdidaId);
                
                if (habId) {
                    await HabilidadeDAO.updateHabilidade(habId, { status: "IMPEDIDA" });

                    const dados: DadoImpedidaEvangelho = {
                        tipo: "IMPEDIDA_EVANGELHO",
                        habilidadeId: habId,
                        evangelistaId: emissor.getId()
                    }
                    await game.getPlayerManager().storeDadosExtra(emissor, dados)
                    
                    game.sendMensagemPlayer(playerAlvo, "🚫 Sua habilidade ficará bloqueada até o Evangelista morrer.");
                }
            } else {
                // CIDADE: Fica Bloqueado na noite atual
                await this.bloquearPlayer(game, playerAlvo);
            }
        } else {
            game.sendMensagemPlayer(playerAlvo, "Você recusou a palavra e seus pecados pesam sobre você...");
        }
    }

    public async updateListaRecusados(game: Game, playerEmissor: Player, alvo: Player, aceitou: boolean) {
        const alvoId = alvo.getUserId();

        let dadosExtraEmissor = playerEmissor.getDadosExtra();

        let dadosExtraAlvos = dadosExtraEmissor.find(m => m.tipo === "ALVOS_RECUSADOS");

        if (!dadosExtraAlvos || dadosExtraAlvos.tipo != "ALVOS_RECUSADOS") {
            if (!aceitou) {
                dadosExtraEmissor.push({ tipo: "ALVOS_RECUSADOS", alvos: [alvoId] });
            }
        } else {
            const listaAlvos = dadosExtraAlvos.alvos;
            const alvoJaEstaNaLista = listaAlvos.includes(alvoId);
    
            if (!aceitou) {
                if (!alvoJaEstaNaLista) {
                    listaAlvos.push(alvoId);
                }
            } else {
                if (alvoJaEstaNaLista) {
                    dadosExtraAlvos.alvos = listaAlvos.filter((a: string) => a !== alvoId);
                }
            }
    
            await PlayerDAO.updatePlayer(playerEmissor.getId(), { dadosExtra: JSON.stringify(dadosExtraEmissor) });
        }
    }
}