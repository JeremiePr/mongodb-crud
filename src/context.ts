import { Collection, Db, MongoClient } from "mongodb";
import { Article } from "./models/article.model";
import { Facture } from "./models/facture.model";

export class Context
{
    private _db?: Db;

    public constructor(
        private readonly _uri: string,
        private readonly _dbName: string)
    {
        this.init();
    }

    private async init(): Promise<void>
    {
        const client = new MongoClient(this._uri);
        await client.connect();
        this._db = client.db(this._dbName);
    }

    private get db(): Db
    {
        if (!this._db) throw new Error('Database not initialized');
        return this._db;
    }

    public get articles(): Collection<Article>
    {
        return this.db.collection<Article>('articles');
    }

    public get factures(): Collection<Facture>
    {
        return this.db.collection<Facture>('factures');
    }
}