import { StringSelectMenuInteraction,ModalBuilder, LabelBuilder, UserSelectMenuBuilder, ModalSubmitInteraction, type Interaction, InteractionResponse } from 'discord.js';
import { Game } from '../Managers/GameManager.js';
import { PlayerDAO } from '../DAOs/PlayerDAO.js';
import { HabilidadeDAO } from '../DAOs/HabilidadeDAO.js';
import type { Player } from './Player.js';
import type { Action } from './Action.js';

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

    public abstract ativar(game: Game, action: Action): Promise<boolean>;

    public async buildModal(interaction: StringSelectMenuInteraction, game: Game, quemUsouId: string): Promise<ModalBuilder | null> {

        const modal = new ModalBuilder()
            .setCustomId('skill_modal_' + this.getNome())
            .setTitle('Usando habilidade: ' + this.getNome());

        const targetLabel = new LabelBuilder()
            .setLabel('Quem é o alvo?')
            .setUserSelectMenuComponent(
                new UserSelectMenuBuilder()
                    .setCustomId(`select_target_${this.getNome()}`)
                    .setPlaceholder('Selecione o seu alvo...')
                    .setMinValues(1)
                    .setMaxValues(1)
            )

        modal.addLabelComponents(targetLabel);
        
        return modal;
    }

    // valida o target, o emissor e o alvo
    public async resolverModal(interaction: ModalSubmitInteraction, game: Game): Promise<InteractionResponse<boolean>> {
        // Tenta pegar o valor das duas formas usadas no seu código
        const selectedUsers = interaction.fields.getSelectedUsers(`select_target_${this.getNome()}`);
        
        const alvoId = selectedUsers?.firstKey()?.toString();

        if (!alvoId) {
            return interaction.reply({ content: "❌ **Erro:** Nenhum alvo selecionado." });
        }

        const jogadorAlvo = await game.getPlayerManager().loadPlayer(alvoId);
        const jogadorEmissor = await game.getPlayerManager().loadPlayer(interaction.user.id);

        if (!jogadorEmissor || !jogadorEmissor.estaVivo()) {
            return interaction.reply({ content: "❌ **Erro:** Você não está vivo ou não faz parte da partida!" });
        }

        const habilidade = jogadorEmissor.getHabilidade(this.getNome());
        if (!habilidade) {
            return interaction.reply({ content: "❌ **Erro:** Você não possui essa habilidade." });
        }

        const erroAlvo = this.validarAlvo(jogadorAlvo, jogadorEmissor.getId());
        if (erroAlvo) {
            // Se a validação retornou um texto de erro, nós paramos aqui e avisamos o usuário!
            return interaction.reply({ content: erroAlvo });
        }

        return await this.processarUsoModal(interaction, game, jogadorEmissor, jogadorAlvo!, habilidade);
    }

    protected validarAlvo(alvo: Player | null, emissorId: string): string | null {
        if (!alvo) {
            return "❌ **Erro:** O jogador alvo não está participando da partida atual!";
        }
        if (!alvo.estaVivo()) {
            return "👻 **Erro:** Você só pode mirar em jogadores vivos.";
        }
        if (alvo.getId() === emissorId && !this.permiteAutoUso()) {
            return "❌ **Erro:** Você não pode usar essa habilidade em si mesmo!";
        }

        return null; // Sucesso na validação!
    }

    protected async processarUsoModal(interaction: ModalSubmitInteraction, game: Game, emissor: Player, alvo: Player, variaveisColetadas: Record<string, any>) {
        // cria a ação genérica e responde
        if (!this.id) return interaction.reply({ content: "❌ **Erro:** Habilidade sem ID registrado." });
        await game.getSkillManager().criarAction(emissor.getId(), this.id, this.tipo, [alvo]);
        
        return interaction.reply({ content: `Habilidade **${this.getNome()}** usada com sucesso!` });
    }

    protected permiteAutoUso(): boolean {
        return false; // checa se a habilidade pode se usar em si mesma
    }

    public async usarHabilidade(game: Game, action: Action): Promise<boolean> {
        // Custo padrão é 1
        const custo = this.getCustoUso(action.getParametros());
        
        // Atualiza o uso da habilidade, habilidades reutilizaveis tem custo de 10000
        const valorUsoTotal = this.uso - custo;
        await HabilidadeDAO.updateHabilidade(this.id!, { uso: valorUsoTotal });

        return await this.ativar(game, action);
    }

    public getCustoUso(parametros: string): number {
        const parsedParams = JSON.parse(parametros || "{}");
        const custo = parsedParams.custoUso || 1;
        return custo;
    }

    public async ofertarPlayer(game: Game, emissorId: string, alvo: Player, nomeOferta: string, item?: string, parametros?: string): Promise<void> {
        console.log(`Criando oferta do jogador ${emissorId} para os alvos ${alvo.getUsername()} com a habilidade ${this.getNome()} e oferta ${nomeOferta}.`);
        
        const partida = await game.getPartida();
        if (!partida) return;

        await game.getSkillManager().criarOferta(emissorId, alvo, this, nomeOferta, item, parametros);
        await game.getSkillManager().criarAlerta(alvo, `Você recebeu a oferta: ${nomeOferta}! Digite /offer para responder.`)
    }

    public async resolverOferta(game: Game, ofertaId: string): Promise<void> {}


    protected async visitarPlayer(game: Game, alvo: Player, alertado: boolean): Promise<void> {
        if (alertado) {
            console.log(`alvo foi visitado e alertado.`);
        }
        // depois avisar player q visitou exceto exceções
        const partida = await game.getPartida();
        if (!partida) {
            console.error(`Partida não encontrada para guildId ${game.getGuildId()}`);
            return;
        }
        if (alertado) {
            await game.getSkillManager().criarAlerta(alvo, `Você foi visitado essa noite!`);
        }
    }

    protected async bloquearPlayer(game: Game, alvo: Player): Promise<void> {
        // depois avisar player q foi bloqueado exceto exceções
        const partida = await game.getPartida();
        if (!partida) {
            console.error(`Partida não encontrada para guildId ${game.getGuildId()}`);
            return;
        }
        await game.getPlayerManager().bloquearPlayer(alvo);
    }

    protected async atacarPlayer(game: Game, alvo: Player, assassino: Player, action: Action) {
        // Prot Invencibilidade(5) > Obliteracao(4) > Prot Poderosa (3) > Ataque Poderoso(2) > Prot Basica (1) > Ataque Basico (0) > Sem Prot (0)
        const parsedParams = JSON.parse(action.getParametros());
        const poderAtaque = parsedParams.poderAtaque || 0;

        if (poderAtaque >= alvo.getProtecao()) {
            console.log(`Alvo ${alvo.getUserId()} tem proteção inferior e pode ser atacado.`);
            await game.getSkillManager().criarAlerta(assassino, "Matou o mano parabens");

            await game.processarMortePlayer(alvo, assassino);
        } else {
            console.log(`Alvo ${alvo.getUsername()} tem proteção suficiente para resistir ao ataque.`);
            
            const protInata = alvo.getCargo()?.getProtecaoInata() || 0;
            await PlayerDAO.updatePlayer(alvo.getId(), { protecao: protInata });

            await game.getSkillManager().criarAlerta(alvo, "voce sente que foi protegido");
        }
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
        if (!this.etapa) {
            throw new Error("Habilidade não possui etapa definida.");
        }
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

    public setTipo(tipo: string): void {
        this.tipo = tipo;
    }

    public setModificadores(modificadores: string[]): void {
        this.modificadores = modificadores;
    }
}

// export class Reputacao extends Habilidade {
//     constructor() {
//         super("Reputação", "Passiva");
//     }

// }

// export class Prender extends Habilidade {
//     constructor() {
//         super("Prender", "Prioridade", 10000, "Noite", ["Imparavel"]);
//     }
// }

// export class Pacificacao extends Habilidade {
//     constructor() {
//         super("Pacificacao", "Prioridade", 3, "Noite", ["Dormente", "Imparavel"]);
//     }
// }






// export class ProcessoDeEliminacao extends Habilidade {
//     constructor() {
//         super("Processo de Eliminação", "Descoberta", 10000, "Noite");
//     }
// }

// export class InvestigacaoProfunda extends Habilidade {
//     constructor() {
//         super("Investigação Profunda", "Descoberta", 1, "Dia", ["Instantanea"]);
//     }
// }

// export class LevantamentoDeDados extends Habilidade {
//     constructor() {
//         super("Levantamento de Dados", "Descoberta", 10000, "Noite", ["Astral"]);
//     }
// }

// export class ConsultaDeArquivos extends Habilidade {
//     constructor() {
//         super("Consulta de Arquivos", "Descoberta", 2, "Noite", ["Astral"]);
//     }
// }

// export class Vigilar extends Habilidade {
//     constructor() {
//         super("Vigilar", "Descoberta", 10000, "Noite", ["Astral"]);
//     }
// }

// export class Rastrear extends Habilidade {
//     constructor() {
//         super("Rastrear", "Descoberta", 4, "Atemporal", ["Repetível"]);
//     }
// }

// export class ArmaduraCorporal extends Habilidade {
//     constructor() {
//         super("Armadura Corporal", "Passiva");
//     }
// }

// export class Escolta extends Habilidade {
//     constructor() {
//         super("Escolta", "Prioridade", 10000, "Noite", ["Imparavel"]);
//     }
// }

// export class EquiparSe extends Habilidade {
//     constructor() {
//         super("Equipar-se", "Foco", 2, "Noite");
//     }
// }

// export class Advocacia extends Habilidade {
//     constructor() {
//         super("Advocacia", "Passiva", 0, undefined, ["Astral"]);
//     }
// }

// export class Absolver extends Habilidade {
//     constructor() {
//         super("Absolver", "?", 0, "Noite", ["Astral", "Imparavel"]);
//     }
// }

// export class NegociarPena extends Habilidade {
//     constructor() {
//         super("Negociar Pena", "?", 0, "Noite", ["Gratis", "Imparavel"]);
//     }
// }

// export class PraticasUrgentes extends Habilidade {
//     constructor() {
//         super("Práticas Urgentes", "Utilidade", 10000, "Noite");
//     }
// }

// export class CuraMilagrosa extends Habilidade {
//     constructor() {
//         super("Cura Milagrosa", "Defensiva", 1, "Noite", ["Rapida"]);
//     }
// }

// export class SextoSentido extends Habilidade {
//     constructor() {
//         super("Sexto Sentido", "Passiva");
//     }
// }

// export class Comunhao extends Habilidade {
//     constructor() {
//         super("Comunhão", "Utilidade", 10000, "Atemporal");
//     }
// }

// export class SegundaChance extends Habilidade {
//     constructor() {
//         super("Segunda Chance", "Utilidade", 1, "Noite", ["Especial"]);
//     }
// }

// export class Pescar extends Habilidade {
//     constructor() {
//         super("Pescar", "Foco", 10000, "Atemporal");
//     }
// }

// export class MKULTRA extends Habilidade {
//     constructor() {
//         super("MKULTRA", "Passiva");
//     }
// }

// export class VivaMaisUmDia extends Habilidade {
//     constructor() {
//         super("Viva Mais Um Dia", "Comunicacao", 10000, "Dia");
//     }
// }

// export class VirarANoite extends Habilidade {
//     constructor() {
//         super("Virar a Noite", "Comunicacao", 4, "Dia", ["Gratis"]);
//     }
// }







// export class PunhoDeFerro extends Habilidade {
//     constructor() {
//         super("Punho de Ferro", "Passiva", 0, undefined, ["Especial"]);
//     }

// }

// export class Matar extends Habilidade {
//     constructor() {
//         super("Matar", "Ofensiva", 10000, "Noite", ["Dormente"]);
//     }

// }

// export class Massacre extends Habilidade {
//     constructor() {
//         super("Massacre", "Ofensiva", 1, "Noite", ["Especial"]);
//     }

// }








// export class Plantar extends Habilidade {
//     constructor() {
//         super("Plantar", "Utilidade", 10000, "Noite");
//     }
// }

// export class Detonar extends Habilidade {
//     constructor() {
//         super("Detonar", "Ofensiva", 10000, "Noite", ["Astral"]);
//     }
// }

// export class OGrandeBotao extends Habilidade {
//     constructor() {
//         super("O Grande Botão", "Utilidade", 1, "Dia", ["Dormente"]);
//     }
// }

// export class AtarCordas extends Habilidade {
//     constructor() {
//         super("Atar Cordas", "Utilidade", 10000, "Noite");
//     }
// }

// export class Marcha extends Habilidade {
//     constructor() {
//         super("Marcha", "Prioridade", 10000, "Noite", ["Imparavel"]);
//     }
// }

// export class CortarAsCordas extends Habilidade {
//     constructor() {
//         super("Cortar as Cordas", "Ofensiva", 1, "Noite", ["Especial"]);
//     }
// }

// export class Hipnotizar extends Habilidade {
//     constructor() {
//         super("Hipnotizar", "Utilidade", 10000, "Atemporal", ["Gratis"]);
//     }
// }

// export class ProprioReflexo extends Habilidade {
//     constructor() {
//         super("Proprio Reflexo", "Utilidade", 2, "Atemporal");
//     }
// }

// export class PoderDaSugestao extends Habilidade {
//     constructor() {
//         super("Poder da Sugestão", "Prioridade", 1, "Atemporal", ["Astral"]);
//     }
// }

// export class Escuta extends Habilidade {
//     constructor() {
//         super("Escuta", "Utilidade", 3, "Noite", ["Repetivel"]);
//     }
// }

// export class Infiltrar extends Habilidade {
//     constructor() {
//         super("Infiltrar", "Utilidade", 2, "Noite");
//     }
// }

// export class QuebraDeSeguranca extends Habilidade {
//     constructor() {
//         super("Quebra de Segurança", "Instantanea", 1, "Atemporal", ["Instantaneo", "Gratis", "Especial"]);
//     }
// }

// export class AUltimaRisada extends Habilidade {
//     constructor() {
//         super("A Última Risada", "Vitoria");
//     }
// }

// export class Pegadinha extends Habilidade {
//     constructor() {
//         super("Pegadinha", "Utilidade", 10000, "Noite");
//     }
// }

// export class RancorEterno extends Habilidade {
//     constructor() {
//         super("Rancor Eterno", "Vitoria");
//     }
// }

// export class CampanhaDeDifamacao extends Habilidade {
//     constructor() {
//         super("Campanha de Difamação", "Passiva");
//     }
// }

// export class PrepararAForca extends Habilidade {
//     constructor() {
//         super("Preparar a Forca", "Utilidade", 1, "Atemporal");
//     }
// }

// export class TendenciasPsicoticas extends Habilidade {
//     constructor() {
//         super("Tendências Psicóticas", "Passiva");
//     }
// }

// export class Assassinar extends Habilidade {
//     constructor() {
//         super("Assassinar", "Ofensiva", 10000, "Noite", ["Dormente"]);
//     }
// }

// export class SedeDeSangue extends Habilidade {
//     constructor() {
//         super("Sede de Sangue", "Foco", 1, "Noite", ["Gratis", "Especial"]);
//     }
// }

// export class LuaCheia extends Habilidade {
//     constructor() {
//         super("Lua Cheia", "Passiva", 0, undefined, ["Especial"]);
//     }
// }

// export class SentidoLunar extends Habilidade {
//     constructor() {
//         super("Sentido Lunar", "Descoberta", 10000, "Dia");
//     }
// }

// export class Dilacerar extends Habilidade {
//     constructor() {
//         super("Dilacerar", "Ofensiva", 10000, "Noite", ["Dormente", "Especial", "Imparavel"]);
//     }
// }

