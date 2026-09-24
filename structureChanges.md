Para aplicar um **MVC real e escalável** em um bot de Discord (especialmente um jogo complexo como Cidade Dorme / Mafia), precisamos entender como o MVC se traduz nesse ecossistema:

* **Model (Domínio + Negócio + Persistência):**
* **Domain Entities:** Classes puras de negócio (`Player`, `Cargo`, `Partida`, `Habilidade`).
* **DAOs / Repositories:** Leitura e escrita no Prisma (`PlayerDAO`, etc.).
* **Services:** O cérebro do jogo (distribuição de cargos, resolução de noites, votação).


* **View (Interface do Usuário no Discord):**
* Montagem de Embeds, botões, modais (o seu `SkillModalBuilder` deve morar aqui!) e mensagens visuais.


* **Controller (Interações do Discord):**
* Slash Commands (`/iniciar`, `/votar`), ouvintes de botões, modais e eventos do Discord. Eles apenas recebem a ação, chamam a Service correspondente e devolvem a View.



---

### 1. Nova Estrutura de Pastas Recomendada

Mover o código para dentro de uma pasta `src/` unificada organiza o ciclo de compilação do TypeScript e separa claramente as responsabilidades:

```text
src/
├── controllers/                  # [CONTROLLER] Entrada de comandos e interações
│   ├── commands/                 # Slash Commands (/iniciar-jogo, /acao, etc.)
│   │   └── IniciarJogoCommand.ts
│   ├── interactions/             # Handlers de botões e modais do Discord
│   └── events/                   # Ready, InteractionCreate, etc.
│
├── domain/                       # [MODEL - Entidades e Regras de Negócio Puras]
│   ├── entities/                 # Antiga pasta 'Player/' (apenas classes de domínio)
│   │   ├── Player.ts
│   │   ├── Cargo.ts
│   │   ├── Partida.ts
│   │   ├── Habilidade.ts
│   │   └── ...
│   ├── skills/                   # Sistema de habilidades puras (sem Discord)
│   │   ├── ConditionEvaluator.ts
│   │   ├── EffectHandler.ts
│   │   └── HabilidadeDinamica.ts
│   ├── errors/                   # Erros específicos do jogo
│   │   ├── GameError.ts
│   │   └── PlayerNotFoundError.ts
│   └── types/                    # Tipos, enums e interfaces
│       └── Tipos.ts
│
├── services/                     # [MODEL - Orquestração e Lógica de Aplicação]
│   ├── GameService.ts            # Gerencia fases da partida, dia/noite
│   ├── PlayerService.ts          # Distribuição de cargos, atribuição de skills
│   └── SkillService.ts           # Antigo SkillManager
│
├── daos/                         # [MODEL - Acesso a Dados / Prisma]
│   ├── PlayerDAO.ts
│   ├── HabilidadeDAO.ts
│   ├── PartidaDAO.ts
│   └── ...
│
├── views/                        # [VIEW - Interface com o Usuário / Discord]
│   ├── embeds/                   # Geradores de Embeds
│   │   ├── PlayerEmbeds.ts
│   │   └── GameEmbeds.ts
│   ├── components/               # Modais e botões do Discord
│   │   └── SkillModalBuilder.ts  # (Movido de Player/Habilidades para cá!)
│   └── messages/                 # Textos padrão do jogo
│
├── infrastructure/               # [INFRAESTRUTURA - Serviços Externos]
│   ├── database/                 # Conexão do Prisma (prisma.ts)
│   └── discord/                  # Ações diretas na API do Discord
│       ├── DiscordChannelService.ts # Criação de chats privados e permissões
│       └── DiscordMessageService.ts # Envio seguro de DMs/Mensagens
│
└── index.ts                      # Ponto de entrada do Bot

```

---

### 2. O Fluxo de Execução no MVC

Veja como aquele trecho de **distribuir cargos** funciona na prática:

```
[Usuário digita /iniciar] 
       │
       ▼
Controller (IniciarJogoCommand)
       │
       ▼ Chama
Service (GameService / PlayerService) 
       │  ├─ 1. Consulta DB via DAOs
       │  ├─ 2. Aplica regras em transação (Prisma $transaction)
       │  └─ 3. Chama DiscordChannelService para criar salas privadas
       │
       ▼ Retorna resultado (sucessos, erros)
Controller
       │
       ▼ Solicita montagem visual
View (GameEmbeds / PlayerViews)
       │
       ▼
[Responde ao canal do Discord]

```

---

### 3. Código Prático: Implementando a Arquitetura

#### A. A View (Construção visual e mensagens)

`src/views/embeds/PlayerEmbeds.ts`

```typescript
import { EmbedBuilder } from "discord.js";
import { Cargo } from "../../domain/entities/Cargo";

export class PlayerEmbeds {
    public static boasVindasAoJogo(cargo: Cargo): EmbedBuilder {
        return new EmbedBuilder()
            .setTitle(`🏙️ Bem-vindo à Cidade!`)
            .setDescription(`Seu cargo na partida é: **${cargo.getNome()}**.\n\n${cargo.getDescricao()}`)
            .setColor(0x2b2d31)
            .setFooter({ text: "Mantenha seu cargo em segredo!" });
    }

    public static relatorioDistribuicao(sucessos: number, falhas: number): EmbedBuilder {
        return new EmbedBuilder()
            .setTitle("Distribuição de Cargos Concluída")
            .setDescription(`✅ Sucessos: ${sucessos}\n❌ Falhas: ${falhas}`)
            .setColor(falhas > 0 ? 0xffa500 : 0x00ff00);
    }
}

```

---

#### B. A Infraestrutura do Discord (Isolando a API do Discord)

`src/infrastructure/discord/DiscordChannelService.ts`

```typescript
import { Guild, PermissionFlagsBits, ChannelType, TextChannel } from "discord.js";

export class DiscordChannelService {
    constructor(private guild: Guild) {}

    public async criarChatPrivado(userId: string, nomeJogador: string, categoriaId?: string): Promise<TextChannel> {
        try {
            return await this.guild.channels.create({
                name: `sala-${nomeJogador.toLowerCase().replace(/\s+/g, "-")}`,
                type: ChannelType.GuildText,
                parent: categoriaId,
                permissionOverwrites: [
                    {
                        id: this.guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: userId,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                    }
                ]
            });
        } catch (error) {
            throw new Error(`Falha de permissão ao criar canal para ${nomeJogador}: ${(error as Error).message}`);
        }
    }
}

```

---

#### C. O DAO com Transação Atômica (Garantindo integridade dos dados)

`src/daos/PlayerDAO.ts`

```typescript
import { prisma } from "../infrastructure/database/prisma";
import { Habilidade } from "../domain/entities/Habilidade";

export class PlayerDAO {
    // Garante que o jogador e suas habilidades sejam salvos JUNTOS. Se um falhar, nada é alterado.
    public static async atribuirCargoComHabilidades(
        playerId: string,
        userId: string,
        guildId: string,
        cargoNome: string,
        habilidades: Habilidade[]
    ) {
        return await prisma.$transaction(async (tx) => {
            // 1. Atualiza o cargo do jogador
            await tx.player.update({
                where: { id: playerId },
                data: { cargo: cargoNome }
            });

            // 2. Limpa habilidades antigas se necessário
            await tx.habilidade.deleteMany({
                where: { userId, guildId }
            });

            // 3. Cadastra todas as habilidades novas
            if (habilidades.length > 0) {
                await tx.habilidade.createMany({
                    data: habilidades.map(hab => ({
                        nome: hab.getNome(),
                        userId: userId,
                        guildId: guildId,
                        uso: hab.getUso(),
                        tipo: hab.getTipo(),
                        etapa: hab.getEtapa()
                    }))
                });
            }
        });
    }
}

```

---

#### D. O Service (Regra de Negócio + Orquestração)

`src/services/PlayerService.ts`

```typescript
import { Player } from "../domain/entities/Player";
import { SkillService } from "./SkillService";
import { PlayerDAO } from "../daos/PlayerDAO";
import { DiscordChannelService } from "../infrastructure/discord/DiscordChannelService";
import { PlayerEmbeds } from "../views/embeds/PlayerEmbeds";
import { GameError } from "../domain/errors/GameError";

export interface DistribuicaoResult {
    sucessos: number;
    falhas: Array<{ playerId: string; erro: string }>;
}

export class PlayerService {
    constructor(
        private skillService: SkillService,
        private channelService: DiscordChannelService,
        private guildId: string
    ) {}

    public async distribuirCargos(players: Player[]): Promise<DistribuicaoResult> {
        if (!players || players.length === 0) {
            throw new GameError("A lista de jogadores está vazia.");
        }

        const result: DistribuicaoResult = { sucessos: 0, falhas: [] };

        for (const player of players) {
            try {
                // 1. Regra de Negócio: Obter cargo e habilidades
                const cargoNome = "ATIRADOR_DE_ELITE"; // Ou lógica de sorteio
                const cargoObj = await this.skillService.getCargoInstance(cargoNome);
                if (!cargoObj) {
                    throw new GameError(`Cargo ${cargoNome} não encontrado no sistema.`);
                }

                // 2. Criação do Canal do Discord
                const canalPrivado = await this.channelService.criarChatPrivado(
                    player.getUserId(),
                    player.getUsername()
                );

                // 3. Persistência atômica no Banco de Dados
                await PlayerDAO.atribuirCargoComHabilidades(
                    player.getId(),
                    player.getUserId(),
                    this.guildId,
                    cargoNome,
                    cargoObj.getHabilidades()
                );

                // 4. Notificação no chat privado criado
                await canalPrivado.send({
                    embeds: [PlayerEmbeds.boasVindasAoJogo(cargoObj)]
                });

                result.sucessos++;
            } catch (error) {
                console.error(`Erro ao processar jogador ${player.getUsername()}:`, error);
                result.falhas.push({
                    playerId: player.getId(),
                    erro: (error as Error).message
                });
            }
        }

        return result;
    }
}

```

---

#### E. O Controller (Comando do Discord)

`src/controllers/commands/IniciarJogoCommand.ts`

```typescript
import { ChatInputCommandInteraction } from "discord.js";
import { PlayerService } from "../../services/PlayerService";
import { SkillService } from "../../services/SkillService";
import { DiscordChannelService } from "../../infrastructure/discord/DiscordChannelService";
import { PlayerDAO } from "../../daos/PlayerDAO";
import { PlayerEmbeds } from "../../views/embeds/PlayerEmbeds";

export class IniciarJogoCommand {
    public static async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const guild = interaction.guild!;
            const channelService = new DiscordChannelService(guild);
            const skillService = new SkillService();
            const playerService = new PlayerService(skillService, channelService, guild.id);

            // Busca os jogadores da partida
            const players = await PlayerDAO.getAllPlayers(guild.id);

            // Chama a Service (Regra de Negócio)
            const resultado = await playerService.distribuirCargos(players);

            // Usa a View para responder ao moderador/admin
            const embedResposta = PlayerEmbeds.relatorioDistribuicao(
                resultado.sucessos,
                resultado.falhas.length
            );

            await interaction.editReply({ embeds: [embedResposta] });

        } catch (error) {
            await interaction.editReply({
                content: `❌ Falha ao iniciar distribuição: ${(error as Error).message}`
            });
        }
    }
}

```

---

### Resumo das Melhorias Adotadas

1. **Adeus ao loop quebradiço:** Se um jogador tiver problemas de permissão de canal ou dados inconsistentes, os outros jogadores continuam o processo normalmente.
2. **Atomicidade com Prisma (`$transaction`):** O jogador nunca ficará em um estado inconsistente (com cargo registrado, mas sem suas habilidades gravadas).
3. **Desacoplamento real:** Suas regras de habilidades e cargos não dependem da biblioteca `discord.js`. Isso torna muito mais simples criar testes unitários para o jogo.
4. **Organização das Views:** Modais (`SkillModalBuilder`) e Embeds ficam separados, evitando poluição visual dentro de arquivos de regras de negócio.