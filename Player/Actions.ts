import type { Habilidade } from "./Habilidade.js";

export class Action {
    private userId: string;
    private habilidade?: Habilidade | Habilidade[] | null;
    private item?: Habilidade | null;

    constructor(userId: string, habilidade?: Habilidade | Habilidade[] | null, item?: Habilidade | null) {
        this.userId = userId;
        this.habilidade = habilidade || null;
        this.item = item || null;
    }
}

// named actions to not confuse with events