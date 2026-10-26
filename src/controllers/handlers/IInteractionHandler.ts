import type { Interaction } from "discord.js";
import type { Game } from "../../services/GameService.js";

export interface IInteractionHandler {
  canHandle(interaction: Interaction): boolean;
  execute(interaction: Interaction, game: Game): Promise<void>;
}