import { Article } from "./article.model";
import { BaseEntity } from "./base-entity.model";

export class Facture extends BaseEntity
{
    public customerName: string;
    public issueDate: Date;
    public articlesIds: Array<any>;
    public articles?: Array<Article>;

    public constructor()
    {
        super();
        this.customerName = '';
        this.issueDate = new Date();
        this.articlesIds = [];
    }
}