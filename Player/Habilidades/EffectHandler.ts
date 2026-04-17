import { type Efeito, TipoAcao, TipoInput } from "../ECA.js";
import { Game }        from "../../Managers/GameManager.js";
import { Player }      from "../Player.js";
import { Action }      from "../Action.js";
import { HabilidadeDinamica, PoderAtaque, NivelProtecao } from "./HabilidadeDinamica.js";
import { ActionRowBuilder, StringSelectMenuBuilder, TextChannel } from "discord.js";
import { OfertaDAO } from "../../DAOs/OfertaDAO.js";

export interface ResultadoAcaoAnterior {
    foiSucedida: boolean;
}

interface EfeitoContext<A extends TipoAcao = TipoAcao> {
    game:      Game;
    efeito:    Efeito<A>;
    emissor:   Player;
    alvo:      Player;
    variaveis: Record<string, unknown>;
    action?:   Action | undefined;
    habilidade: HabilidadeDinamica;
}

type EfeitoHandlerFn<A extends TipoAcao> = (ctx: EfeitoContext<A>) => Promise<ResultadoAcaoAnterior | void>;


const criarOfertaHandler: EfeitoHandlerFn<TipoAcao.CriarOferta> = async ({ habilidade, game, emissor, alvo, efeito }) => {
    await habilidade.ofertarPlayer(game, emissor.getId(), alvo, efeito.parametros!.nomeOferta);
};

const atacarHandler: EfeitoHandlerFn<TipoAcao.Atacar> = async ({ habilidade, game, alvo, emissor, action, efeito }) => {
    const poder = efeito.parametros?.poderAtaque ?? PoderAtaque.AtaqueBasico;
    const matou = await habilidade.atacarPlayer(game, poder, alvo, emissor, action);
    return { foiSucedida: matou };
};

const bloquearHandler: EfeitoHandlerFn<TipoAcao.Bloquear> = async ({ game, alvo }) => {
    const status = alvo.getStatus();
    if (!status.includes("BLOQUEADO")) {
        status.push("BLOQUEADO");
        await game.getPlayerManager().updatePlayer(alvo, { status: JSON.stringify(status) });
        await game.getSkillManager().criarAlerta(alvo, "Você foi bloqueado essa noite!");
    }
};

const adicionarStatusHandler: EfeitoHandlerFn<TipoAcao.AdicionarStatus> = async ({ game, alvo, efeito }) => {
    const status = alvo.getStatus();
    if (!status.includes(efeito.parametros!.nome)) {
        status.push(efeito.parametros!.nome);
        await game.getPlayerManager().updatePlayer(alvo, { status: JSON.stringify(status) });
    }
};

const removerStatusHandler: EfeitoHandlerFn<TipoAcao.RemoverStatus> = async ({ game, alvo, efeito }) => {
    const statusFiltrado = (alvo.getStatus() || []).filter(s => s !== efeito.parametros!.nome);
    await game.getPlayerManager().updatePlayer(alvo, { status: JSON.stringify(statusFiltrado) });
};

const impedirHabilidadeHandler: EfeitoHandlerFn<TipoAcao.ImpedirHabilidade> = async ({ habilidade, game, alvo, emissor, efeito, variaveis }) => {
    let nomeHabilidade: string = efeito.parametros!.nomeHabilidade;
 
    if (nomeHabilidade.startsWith("VARIAVEL.")) {
        const varName  = nomeHabilidade.split(".")[1]!;
        nomeHabilidade = variaveis[varName] as string;
    }

    const habAlvo = alvo.getHabilidade(nomeHabilidade);
    if (!habAlvo) return;

    await game.getSkillManager().updateHabilidade(habAlvo, { status: "IMPEDIDA" });

    const dadosExtra = alvo.getDadosExtra();
    dadosExtra.push({
        tipo:         efeito.parametros!.salvarDados,
        habilidadeId: habAlvo.getId()!,
        emissorId:    emissor.getId(),
    });
    await game.getPlayerManager().updatePlayer(alvo, { dadosExtra: JSON.stringify(dadosExtra) });
};

const criarAlertaHandler: EfeitoHandlerFn<TipoAcao.CriarAlerta> = async ({ game, alvo, efeito, variaveis }) => {
    const textoDinamico = processarTexto(efeito.parametros!.texto, variaveis);
    await game.getSkillManager().criarAlerta(alvo, textoDinamico);
};

const enviarAnuncioHandler: EfeitoHandlerFn<TipoAcao.EnviarAnuncio> = async ({ game, alvo, efeito, variaveis }) => {
    const textoDinamico = processarTexto(efeito.parametros!.texto, variaveis);
    await game.sendAnuncio(textoDinamico);
};

const alterarUsoHandler: EfeitoHandlerFn<TipoAcao.AlterarUso> = async ({ game, alvo, efeito, habilidade }) => {
    const habAlvo = (efeito.parametros as any)?.nomeHabilidade ? alvo.getHabilidade((efeito.parametros as any).nomeHabilidade) : habilidade;
    
    if (!habAlvo) {
        console.warn(`[EffectHandler/ALTERAR_USO] Habilidade não encontrada no alvo.`);
        return;
    }
    const quantidade = Number(efeito.parametros?.quantidade ?? -1);
    const usosAtuais = habAlvo.getUso() ?? 0;
    const novoUsos   = Math.max(0, usosAtuais + quantidade);
    await game.getSkillManager().updateHabilidade(habAlvo, { usosRestantes: novoUsos });
};

const protegerHandler: EfeitoHandlerFn<TipoAcao.Proteger> = async ({ game, alvo, efeito }) => {
    const nivelAtual = alvo.getProtecao();
    const nivelNovo  = Number(efeito.parametros?.nivelProtecao ?? 1);
    if (nivelNovo > nivelAtual) {
        await game.getPlayerManager().updatePlayer(alvo, { protecao: nivelNovo });
    }
};

const adicionarMarcaHandler: EfeitoHandlerFn<TipoAcao.AdicionarMarca> = async ({ game, alvo, emissor, efeito }) => {
    const marcas = alvo.getMarcas() ?? [];
    
    const novaMarca = {
        tipo: efeito.parametros!.nome, 
        emissorId: emissor.getId()
    };

    marcas.push(novaMarca);
    await game.getPlayerManager().updatePlayer(alvo, { marcas: JSON.stringify(marcas) });
};

// a marca normalmente só pode ser removida pelo proprio emissor
const removerMarcaHandler: EfeitoHandlerFn<TipoAcao.RemoverMarca> = async ({ game, emissor, alvo, efeito }) => {
    const marcas = alvo.getMarcas() ?? [];
    
    const marcasFiltradas = marcas.filter((m: any) => m.tipo !== efeito.parametros!.nome && m.emissorId !== emissor.getId());
    
    await game.getPlayerManager().updatePlayer(alvo, { marcas: JSON.stringify(marcasFiltradas) });
};

const restaurarHabilidadeImpedidaHandler: EfeitoHandlerFn<TipoAcao.RestaurarHabilidadeImpedida> = async ({ game, alvo, emissor, efeito }) => {
    const tipoMaldicao   = efeito.parametros!.tipoDadoExtra;
    const dadosExtraAlvo = alvo.getDadosExtra() || [];

    const marcaMaldicao = dadosExtraAlvo.find(
        (m: any) => m.tipo === tipoMaldicao && (m as any).emissorId === emissor.getId()
    );

    if (!marcaMaldicao) return;

    const habBloqueada = alvo.getHabilidades()?.find(h => h.getId() === (marcaMaldicao as any).habilidadeId);
    if (habBloqueada) {
        await game.getSkillManager().updateHabilidade(habBloqueada, { status: "DISPONIVEL" });
    }

    const novosDados = dadosExtraAlvo.filter((m: any) => m !== marcaMaldicao);
    await game.getPlayerManager().updatePlayer(alvo, { dadosExtra: JSON.stringify(novosDados) });
};

const criarInputHandler: EfeitoHandlerFn<TipoAcao.CriarInput> = async ({ habilidade, game, emissor, alvo, efeito }) => {
    const params = efeito.parametros!;
    const customId = `skill_input_${habilidade.getNome()}_${emissor.getId()}_${params.idVariavel}`;

    let componentes: any[] = [];

    if (params.tipoInput === TipoInput.SelecionarPropriaHabilidade) {
        const habilidades = alvo.getHabilidades()?.filter(h => h.getStatus() !== "IMPEDIDA") || [];
        
        if (habilidades.length === 0) {
            await game.getSkillManager().criarAlerta(alvo, "Você não possui habilidades ativas para sacrificar/selecionar.");
            return;
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder(params.texto)
            .addOptions(habilidades.map(hab => ({
                label: hab.getNome(),
                value: hab.getNome()
            })));

        componentes = [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)];
    }
    
    const channelId = alvo.getUserChat();

    if (!channelId) {
        console.warn(`[EffectHandler] Alvo ${alvo.getUsername()} não possui canal de chat registrado.`);
        return;
    }

    if ((game as any).isTeste) {
        console.log(`[TESTE] 📨 Menu dropdown "${params.texto}" enviado virtualmente para o chat de ${alvo.getUsername()}!`);
        return;
    }

    try {
        const channel = await game.getClient().channels.fetch(channelId) as TextChannel;
        if (channel) {
            await channel.send({ content: `⚠️ **Ação Exigida:** ${params.texto}`, components: componentes });
        }
    } catch (error) {
        console.error(`Erro ao enviar input para ${alvo.getUsername()}:`, error);
    }
};

const atualizarOfertaHandler: EfeitoHandlerFn<TipoAcao.AtualizarOferta> = async ({ game, alvo, efeito }) => {
    const ofertas = await OfertaDAO.getOfertasForPlayerId(game.getGuildId(), alvo.getUserId());
    const etapaAtual = await game.getEtapaAtual();

    const oferta = ofertas?.find(o => o.nomeOferta === efeito.parametros!.nomeOferta && o.etapa === etapaAtual);
    if (!oferta) return;

    await OfertaDAO.updateOferta(oferta.id, efeito.parametros!.valorOferta);
};

const enviarHabilidadeHandler: EfeitoHandlerFn<TipoAcao.EnviarHabilidade> = async ({ game, alvo, efeito }) => {
    const params = efeito.parametros!;

    const novaHab = game.getSkillManager().getHabilidadeInstance(params.nomeHabilidade);
    if (!novaHab) {
        console.warn(`[EffectHandler/ENVIAR_HABILIDADE] Habilidade "${params.nomeHabilidade}" não encontrada no sistema.`);
        return;
    }

    console.log(`[EffectHandler] Habilidade ${params.nomeHabilidade} entregue para ${alvo.getUsername()}`);
};

const enviarItemHandler: EfeitoHandlerFn<TipoAcao.EnviarItem> = async ({ game, alvo, efeito }) => {
    console.log(`[EffectHandler] Item ${efeito.parametros!.nomeItem} entregue para ${alvo.getUsername()}`);
};

const descobrirIdentidadeHandler: EfeitoHandlerFn<TipoAcao.DescobrirIdentidade> = async ({ game, alvo, emissor, efeito, variaveis }) => {
    const textoDinamico = processarTexto(efeito.parametros!.texto, variaveis);
    console.log(`[EffectHandler] Identidade de ${alvo.getUsername()} descoberta por ${emissor.getUsername()}: Cargo - ${alvo.getCargo() ? alvo.getCargo()!.getNome() : "Sem cargo"}, Classe - ${alvo.getAlinhamento()}, Distrito - ${alvo.getDistrito()}`);
};

const descobrirCargoHandler: EfeitoHandlerFn<TipoAcao.DescobrirCargo> = async ({ game, alvo, emissor, efeito, variaveis }) => {
    const textoDinamico = processarTexto(efeito.parametros!.texto, variaveis);
    console.log(`[EffectHandler] Cargo de ${alvo.getUsername()} descoberto: ${alvo.getCargo() ? alvo.getCargo()!.getNome() : "Sem cargo"}`);
};

const descobrirClasseHandler: EfeitoHandlerFn<TipoAcao.DescobrirClasse> = async ({ game, alvo, emissor, efeito, variaveis }) => {
    const textoDinamico = processarTexto(efeito.parametros!.texto, variaveis);
    console.log(`[EffectHandler] Classe de ${alvo.getUsername()} descoberta: ${alvo.getAlinhamento()}`);
};

const descobrirSetorHandler: EfeitoHandlerFn<TipoAcao.DescobrirSetor> = async ({ game, alvo, emissor, efeito, variaveis }) => {
    const textoDinamico = processarTexto(efeito.parametros!.texto, variaveis);
    console.log(`[EffectHandler] Setor de ${alvo.getUsername()} descoberto: ${alvo.getDistrito()}`);
};

const descobrirQuantidadeHandler: EfeitoHandlerFn<TipoAcao.DescobrirQuantidade> = async ({ game, variaveis, efeito, habilidade, emissor }) => {
    const condicoes = (efeito.parametros as any).condicoes as any[];
    const jogadores = await game.getPlayerManager().getAllPlayers();
    if (!jogadores) return;
    let quantidade = 0;

    for (const jogador of jogadores) {
        const condicoesOk = await habilidade.getConditionEvaluator().avaliar(game, condicoes, emissor, jogador, variaveis);
        if (!condicoesOk) continue;
        quantidade++;
    }
    console.log(`[EffectHandler] Quantidade descoberta: ${quantidade}`);
};

// CHECAR SE ISSO TA FUNCIONANDO
// PROVAVELMENTE NÃO
const alterarProtInataHandler: EfeitoHandlerFn<TipoAcao.AlterarProtInata> = async ({ game, alvo, efeito }) => {
    const quantidade = Number(efeito.parametros!.nivel ?? 0);

    const protecaoAtual = alvo.getProtecaoInata();
    const novaProtecao = Math.max(0, protecaoAtual + quantidade);

    await game.getPlayerManager().updatePlayer(alvo, { protecaoInata: novaProtecao });
};

const

const HANDLERS: Record<TipoAcao, EfeitoHandlerFn<any>> = {
    [TipoAcao.Nenhuma]:     async () => ({ foiSucedida: true }), // handler vazio, serve pra checar condiçoes

    [TipoAcao.Atacar]:                      atacarHandler,
    [TipoAcao.Proteger]:                    protegerHandler,
    [TipoAcao.Bloquear]:                    bloquearHandler,

    [TipoAcao.AlterarUso]:                  alterarUsoHandler,
    [TipoAcao.CriarOferta]:                 criarOfertaHandler,
    [TipoAcao.CriarAlerta]:                 criarAlertaHandler,
    [TipoAcao.CriarInput]:                  criarInputHandler,
    [TipoAcao.EnviarAnuncio]:               enviarAnuncioHandler,
    [TipoAcao.EnviarHabilidade]:            enviarHabilidadeHandler,
    [TipoAcao.EnviarItem]:                  enviarItemHandler,
    
    [TipoAcao.AtualizarOferta]:             atualizarOfertaHandler,
    [TipoAcao.AdicionarMarca]:              adicionarMarcaHandler,
    [TipoAcao.AdicionarStatus]:             adicionarStatusHandler,
    [TipoAcao.ImpedirHabilidade]:           impedirHabilidadeHandler,
    [TipoAcao.RemoverMarca]:                removerMarcaHandler,
    [TipoAcao.RemoverStatus]:               removerStatusHandler,
    [TipoAcao.RestaurarHabilidadeImpedida]: restaurarHabilidadeImpedidaHandler,

    [TipoAcao.DescobrirIdentidade]:         descobrirIdentidadeHandler,
    [TipoAcao.DescobrirCargo]:              descobrirCargoHandler,
    [TipoAcao.DescobrirClasse]:             descobrirClasseHandler,
    [TipoAcao.DescobrirSetor]:              descobrirSetorHandler,
    [TipoAcao.DescobrirQuantidade]:         descobrirQuantidadeHandler,
    [TipoAcao.AlterarProtInata]:            alterarProtInataHandler
};

export class EffectHandler {
    public async executar(ctx: EfeitoContext<any>): Promise<ResultadoAcaoAnterior> {
        const handler = HANDLERS[ctx.efeito.acao as TipoAcao];
        
        if (!handler) {
            console.warn(`[EffectHandler] Handler não implementado para a ação: ${ctx.efeito.acao}`);
            return { foiSucedida: false };
        }

        const resultado = await handler(ctx);
        return resultado || { foiSucedida: true };
    }
}

function processarTexto(texto: string, variaveis: Record<string, unknown>): string {
    return texto.replace(/\$\{([^}]+)\}/g, (match, chave) => {
        
        if (chave in variaveis) {
            return String(variaveis[chave]);
        }
        
        return match; 
    });
}