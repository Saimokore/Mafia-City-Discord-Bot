export interface ICommand<TContext, TArgs extends unknown[] = []> {
    readonly name: string;
    execute(context: TContext, ...args: TArgs): Promise<void>;
}