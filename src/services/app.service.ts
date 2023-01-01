import { Collection, MongoClient, ObjectId } from "mongodb";
import { Context } from "../context";
import { Article } from "../models/article.model";
import { Facture } from "../models/facture.model";

export class AppService
{
    public constructor(
        private readonly _context: Context)
    { }

    public async getAllArticles(): Promise<Array<Article>>
    {
        return await this._context.articles.find().toArray();
    }

    public async getAllFactures(): Promise<Array<Facture>>
    {
        return await this._context.factures.aggregate<Facture>([
            {
                $lookup: {
                    from: 'articles',
                    localField: 'articlesIds',
                    foreignField: '_id',
                    as: 'articles'
                }
            }
        ])
            .toArray();
    }

    public async createArticle(name: string, price: number): Promise<void>
    {
        if (price <= 0)
            throw new Error('Price can\'t be zero or negative');

        const maxRef: string = (await this._context.articles
            .find()
            .project({ ref: 1 })
            .toArray())
            .map(x => x.ref)
            .sort((a, b) => a > b ? -1 : 1)
            .find(_ => true) ?? "BC00000001";

        const ref = `BC${(+maxRef.substring(2) + 1).toString().padStart(8, "0")}`;

        await this._context.articles.insertOne({
            ref,
            name,
            price
        });
    }

    public async createFacture(customerName: string, issueDate: Date, articlesIds: Array<string>): Promise<void>
    {
        const articlesOIds = articlesIds.map(id => new ObjectId(id));

        if ((await this._context.articles.count({ _id: { $in: articlesOIds } }) != articlesIds.length))
            throw new Error('Some articles do not exist');

        await this._context.factures.insertOne({
            customerName,
            issueDate,
            articlesIds: articlesOIds
        })
    }

    public async updateArticle(id: string, name: string, price: number): Promise<void>
    {
        const oId = new ObjectId(id);

        if (!await this._context.articles.findOne({ _id: oId }))
            throw new Error('Article not found');

        if (price <= 0)
            throw new Error('Price can\'t be zero or negative');

        await this._context.articles.updateOne({ _id: oId }, {
            $set: {
                name,
                price
            }
        });
    }

    public async updateFacture(id: string, customerName: string, issueDate: Date, articlesIds: Array<string>): Promise<void>
    {
        const oId = new ObjectId(id);
        const articlesOIds = articlesIds.map(id => new ObjectId(id));

        if (!await this._context.factures.findOne({ _id: oId }))
            throw new Error('Facture not found');

        if ((await this._context.articles.count({ _id: { $in: articlesOIds } }) != articlesIds.length))
            throw new Error('Some articles do not exist');

        await this._context.factures.updateOne({ _id: oId }, {
            $set: {
                customerName,
                issueDate,
                articlesIds: articlesOIds
            }
        });
    }

    public async deleteArticle(id: string): Promise<void>
    {
        const oId = new ObjectId(id);
        if (!await this._context.articles.findOne({ _id: oId }))
            throw new Error('Article not found');

        const facturesWithArticleCount = await this._context.factures.count({
            articlesIds: {
                $in: [oId]
            }
        });

        if (facturesWithArticleCount > 0)
            throw new Error('Some factures contain the article');

        await this._context.articles.deleteOne({ _id: oId });
    }

    public async deleteFacture(id: string): Promise<void>
    {
        const oId = new ObjectId(id);
        if (!await this._context.factures.findOne({ _id: oId }))
            throw new Error('Facture not found');

        await this._context.factures.deleteOne({ _id: oId });
    }
}