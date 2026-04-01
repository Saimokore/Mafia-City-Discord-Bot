import { type Efeito, TipoAcao, TipoInput } from "../ECA.js";
import { Game }        from "../../Managers/GameManager.js";
import { Player }      from "../Player.js";
import { Action }      from "../Action.js";
import { HabilidadeDinamica, PoderAtaqueProtecao } from "./HabilidadeDinamica.js";
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
    const poder = efeito.parametros?.poderAtaque ?? PoderAtaqueProtecao.AtaqueBasico;
    const matou = await habilidade.atacarPlayer(game, poder, alvo, emissor, action); // Ajuste os parâmetros do atacarPlayer conforme a sua classe
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

const adicionarMarcaHandler: EfeitoHandlerFn<TipoAcao.AdicionarMarca> = async ({ game, alvo, efeito }) => {
    const marcas = alvo.getMarcas();
    if (!marcas.includes(efeito.parametros!.tipo)) {
        marcas.push(efeito.parametros!.tipo);
        await game.getPlayerManager().updatePlayer(alvo, { marcas: JSON.stringify(marcas) });
    }
};

const removerMarcaHandler: EfeitoHandlerFn<TipoAcao.RemoverMarca> = async ({ game, alvo, efeito }) => {
    const marcasFiltradas = (alvo.getMarcas() || []).filter(m => m !== efeito.parametros!.tipo);
    await game.getPlayerManager().updatePlayer(alvo, { marcas: JSON.stringify(marcasFiltradas) });
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

const enviarAlertaHandler: EfeitoHandlerFn<TipoAcao.EnviarAlerta> = async ({ game, alvo, efeito }) => {
    await game.getSkillManager().criarAlerta(alvo, efeito.parametros!.texto);
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

const adicionarParametroHandler: EfeitoHandlerFn<TipoAcao.AdicionarParametro> = async ({ game, alvo, efeito }) => {
    const dadosExtra = alvo.getDadosExtra() ?? [];
    dadosExtra.push(efeito.parametros);
    await game.getPlayerManager().updatePlayer(alvo, { dadosExtra: JSON.stringify(dadosExtra) });
};

const removerParametroHandler: EfeitoHandlerFn<TipoAcao.RemoverParametro> = async ({ game, alvo, efeito }) => {
    const dadosExtra   = alvo.getDadosExtra() ?? [];
    const dadosFiltrados = dadosExtra.filter((d: any) => d.tipo !== efeito.parametros!.tipo);
    await game.getPlayerManager().updatePlayer(alvo, { dadosExtra: JSON.stringify(dadosFiltrados) });
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
    // Simulando a entrega da habilidade
    const novaHab = game.getSkillManager().getHabilidadeInstance(params.nomeHabilidade);
    if (!novaHab) {
        console.warn(`[EffectHandler/ENVIAR_HABILIDADE] Habilidade "${params.nomeHabilidade}" não encontrada no sistema.`);
        return;
    }
    // Lógica para adicionar a habilidade ao banco de dados do alvo entraria aqui
    console.log(`[EffectHandler] Habilidade ${params.nomeHabilidade} entregue para ${alvo.getUsername()}`);
};

const enviarItemHandler: EfeitoHandlerFn<TipoAcao.EnviarItem> = async ({ game, alvo, efeito }) => {
    console.log(`[EffectHandler] Item ${efeito.parametros!.nomeItem} entregue para ${alvo.getUsername()}`);
};

const HANDLERS: Record<TipoAcao, EfeitoHandlerFn<any>> = {
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
    [TipoAcao.CriarInput]:                  criarInputHandler,
    [TipoAcao.AtualizarOferta]:             atualizarOfertaHandler,
    [TipoAcao.EnviarHabilidade]:            enviarHabilidadeHandler,
    [TipoAcao.EnviarItem]:                  enviarItemHandler,
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