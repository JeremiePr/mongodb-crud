import { controller, fromBody, httpDelete, httpGet, httpPost, httpPut } from "../core/api-interface";
import { Article } from "../models/article.model";
import { Facture } from "../models/facture.model";
import { AppService } from "../services/app.service";

@controller('api')
export class AppApi
{
    public constructor(
        private readonly _service: AppService)
    { }

    @httpGet("Articles")
    public async getAllArticles(): Promise<Array<Article>>
    {
        return await this._service.getAllArticles();
    }

    @httpGet('Factures')
    public async getAllFactures(): Promise<Array<Facture>>
    {
        return await this._service.getAllFactures();
    }

    @httpPost('Articles')
    public async createArticle(@fromBody body: { name: string; price: number; }): Promise<void>
    {
        return await this._service.createArticle(body.name, body.price);
    }

    @httpPost('Factures')
    public async createFacture(@fromBody body: { customerName: string; issueDate: Date; articlesIds: Array<string>; }): Promise<void>
    {
        return await this._service.createFacture(body.customerName, body.issueDate, body.articlesIds);
    }

    @httpPut('Articles')
    public async updateArticle(id: string, @fromBody body: { name: string; price: number; }): Promise<void>
    {
        return await this._service.updateArticle(id, body.name, body.price);
    }

    @httpPut('Factures')
    public async updateFacture(id: string, @fromBody body: { customerName: string; issueDate: Date; articlesIds: Array<string>; }): Promise<void>
    {
        return await this._service.updateFacture(id, body.customerName, body.issueDate, body.articlesIds);
    }

    @httpDelete('Articles')
    public async deleteArticle(id: string): Promise<void>
    {
        return await this._service.deleteArticle(id);
    }

    @httpDelete('Factures')
    public async deleteFacture(id: string): Promise<void>
    {
        return await this._service.deleteFacture(id);
    }
}