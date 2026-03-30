import { type Efeito, TipoAcao } from "../ECA.js";
import { Game }        from "../../Managers/GameManager.js";
import { Player }      from "../Player.js";
import { Action }      from "../Action.js";
import { HabilidadeDinamica } from "./HabilidadeDinamica.js";

type EfeitoHandlerFn = (ctx: EfeitoContext) => Promise<void>;

interface EfeitoContext {
    game:      Game;
    efeito:    Efeito;
    emissor:   Player;
    alvo:      Player;
    variaveis: Record<string, unknown>;
    action?:   Action | undefined;
    habilidade: HabilidadeDinamica;
}

const criarOfertaHandler: EfeitoHandlerFn = async ({ habilidade, game, emissor, alvo, efeito }) => {
    await habilidade.ofertarPlayer(game, emissor.getId(), alvo, efeito.parametros.nomeOferta);
};

const atacarHandler: EfeitoHandlerFn = async ({ habilidade, game, alvo, emissor, action }) => {
    await habilidade.atacarPlayer(game, alvo, emissor, action);
};

const bloquearHandler: EfeitoHandlerFn = async ({ game, alvo }) => {
    const status = alvo.getStatus();
    if (!status.includes("BLOQUEADO")) {
        status.push("BLOQUEADO");
        await game.getPlayerManager().updatePlayer(alvo, { status: JSON.stringify(status) });
        await game.getSkillManager().criarAlerta(alvo, "Você foi bloqueado essa noite!");
    }
};

const adicionarMarcaHandler: EfeitoHandlerFn = async ({ game, alvo, efeito }) => {
    const marcas = alvo.getMarcas();
    if (!marcas.includes(efeito.parametros.marca)) {
        marcas.push(efeito.parametros.marca);
        await game.getPlayerManager().updatePlayer(alvo, { marcas: JSON.stringify(marcas) });
    }
};

const removerMarcaHandler: EfeitoHandlerFn = async ({ game, alvo, efeito }) => {
    const marcasFiltradas = (alvo.getMarcas() || []).filter(m => m !== efeito.parametros.marca);
    await game.getPlayerManager().updatePlayer(alvo, { marcas: JSON.stringify(marcasFiltradas) });
};

const impedirHabilidadeHandler: EfeitoHandlerFn = async ({ habilidade, game, alvo, emissor, efeito, variaveis }) => {
    await habilidade.impedirHabilidadeDinamica(game, alvo, emissor, efeito, variaveis);
};

const enviarAlertaHandler: EfeitoHandlerFn = async ({ game, alvo, efeito }) => {
    await game.getSkillManager().criarAlerta(alvo, efeito.parametros.texto);
};

const alterarUsoHandler: EfeitoHandlerFn = async ({ game, alvo, efeito }) => {
    const hab = alvo.getHabilidade(efeito.parametros.nomeHabilidade);
    if (!hab) {
        console.warn(`[EffectHandler/ALTERAR_USO] Habilidade "${efeito.parametros.nomeHabilidade}" não encontrada no alvo.`);
        return;
    }
    const delta      = Number(efeito.parametros.delta ?? -1);
    const usosAtuais = hab.getUso() ?? 0;
    const novoUsos   = Math.max(0, usosAtuais + delta);
    await game.getSkillManager().updateHabilidade(hab, { usosRestantes: novoUsos });
};

const protegerHandler: EfeitoHandlerFn = async ({ game, alvo, efeito }) => {
    const nivelAtual = alvo.getProtecao();
    const nivelNovo  = Number(efeito.parametros.nivelProtecao ?? 1);
    // Só aplica se a nova proteção for mais forte que a atual
    if (nivelNovo > nivelAtual) {
        await game.getPlayerManager().updatePlayer(alvo, { protecao: nivelNovo });
    }
};

const adicionarParametroHandler: EfeitoHandlerFn = async ({ game, alvo, efeito }) => {
    const dadosExtra = alvo.getDadosExtra() ?? [];
    dadosExtra.push(efeito.parametros);
    await game.getPlayerManager().updatePlayer(alvo, { dadosExtra: JSON.stringify(dadosExtra) });
};

const removerParametroHandler: EfeitoHandlerFn = async ({ game, alvo, efeito }) => {
    const dadosExtra   = alvo.getDadosExtra() ?? [];
    const dadosFiltrados = dadosExtra.filter((d: any) => d.tipo !== efeito.parametros.tipo);
    await game.getPlayerManager().updatePlayer(alvo, { dadosExtra: JSON.stringify(dadosFiltrados) });
};

const restaurarHabilidadeImpedidaHandler: EfeitoHandlerFn = async ({ game, alvo, emissor, efeito }) => {
    const tipoMaldicao  = efeito.parametros.tipoDadoExtra;
    const dadosExtraAlvo = alvo.getDadosExtra() || [];

    const marcaMaldicao = dadosExtraAlvo.find(
        m => m.tipo === tipoMaldicao && (m as any).emissorId === emissor.getId()
    );

    if (!marcaMaldicao) return;

    const habBloqueada = alvo.getHabilidades()?.find(h => h.getId() === (marcaMaldicao as any).habilidadeId);
    if (habBloqueada) {
        await game.getSkillManager().updateHabilidade(habBloqueada, { status: "DISPONIVEL" });
    }

    const novosDados = dadosExtraAlvo.filter(m => m !== marcaMaldicao);
    await game.getPlayerManager().updatePlayer(alvo, { dadosExtra: JSON.stringify(novosDados) });
};

const HANDLERS: Record<TipoAcao, EfeitoHandlerFn> = {
    [TipoAcao.CriarOferta]:                 criarOfertaHandler,
    [TipoAcao.Atacar]:                      atacarHandler,
    [TipoAcao.AlterarUso]:                  alterarUsoHandler,
    [TipoAcao.Proteger]:                    protegerHandler,
    [TipoAcao.Bloquear]:                    bloquearHandler,
    [TipoAcao.AdicionarMarca]:              adicionarMarcaHandler,
    [TipoAcao.AdicionarParametro]:          adicionarParametroHandler,
    [TipoAcao.EnviarAlerta]:                enviarAlertaHandler,
    [TipoAcao.RemoverMarca]:                removerMarcaHandler,
    [TipoAcao.ImpedirHabilidade]:           impedirHabilidadeHandler,
    [TipoAcao.RestaurarHabilidadeImpedida]: restaurarHabilidadeImpedidaHandler,
    [TipoAcao.RemoverParametro]:            removerParametroHandler,
};

export class EffectHandler {

    public async executar(ctx: EfeitoContext): Promise<void> {
        const handler = HANDLERS[ctx.efeito.acao as TipoAcao];

        if (!handler) {
            console.warn(`[EffectHandler] Ação desconhecida: "${ctx.efeito.acao}"`);
            return;
        }

        await handler(ctx);
    }
}